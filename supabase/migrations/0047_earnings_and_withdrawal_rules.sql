-- Daily earnings, claiming, early exit, plan completion and withdrawal rules.
--
-- Earnings: an active plan earns amount x daily rate for every full day since
-- it started, up to its length. Weekly and monthly rates are spread over 7
-- and 30 days. sync_investment_earnings() runs hourly: it refreshes
-- current_earnings and completes plans that have ended.
--
-- Claiming: the customer presses "Move to balance" on a plan. The unclaimed
-- earnings move to their available balance once they reach the plan's
-- minimum withdrawal.
--
-- Early exit: the customer can end a plan before it finishes. Before the
-- halfway point they get their investment back with no earnings. From the
-- halfway point they get their investment back plus half of the earnings so
-- far. Earnings already moved to their balance count towards that share, and
-- any amount above it is taken from the investment returned.
--
-- Withdrawals: the minimum is the lowest "minimum withdrawal" among the
-- customer's active plans (the platform minimum when they have none).
-- Customers without approved identity verification can withdraw at most
-- kyc_free_withdrawal_limit ($150) in total.

alter table investment_plans add column if not exists min_withdrawal numeric(18,2) not null default 50;
update investment_plans set min_withdrawal = 75 where min_amount >= 1000 and min_amount < 5000;
update investment_plans set min_withdrawal = 100 where min_amount >= 5000;

alter table investments
  add column if not exists claimed_earnings numeric(18,2) not null default 0,
  add column if not exists closed_at timestamptz,
  add column if not exists exit_type text;

alter table system_settings add column if not exists kyc_free_withdrawal_limit numeric(18,2) not null default 150;

-- Earnings an investment has made by p_at (full days only, capped at its length).
create or replace function public.investment_accrued(p_inv investments, p_at timestamptz default now())
 returns numeric
 language sql
 stable
 set search_path to 'public'
as $function$
  select round(
    p_inv.amount
    * (p_inv.rate / 100.0) / case p_inv.rate_type when 'weekly' then 7 when 'monthly' then 30 else 1 end
    * least(greatest(floor(extract(epoch from (p_at - p_inv.started_at)) / 86400), 0), p_inv.duration_days),
  2);
$function$;

-- Hourly: refresh earnings on active plans and complete plans that have ended.
create or replace function public.sync_investment_earnings()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_inv investments%rowtype;
  v_plan_name text;
  v_total numeric;
  v_unclaimed numeric;
  v_before numeric;
  v_completed integer := 0;
begin
  update investments i set current_earnings = investment_accrued(i) where i.status = 'active';

  perform set_config('app.bypass_profile_guard', 'on', true);
  for v_inv in select * from investments where status = 'active' and ends_at <= now() for update skip locked loop
    select name into v_plan_name from investment_plans where id = v_inv.plan_id;
    v_total := investment_accrued(v_inv, v_inv.ends_at);
    v_unclaimed := greatest(v_total - v_inv.claimed_earnings, 0);

    select available_balance into v_before from profiles where id = v_inv.user_id for update;
    update profiles
    set available_balance = available_balance + v_inv.amount + v_unclaimed,
        invested_balance = greatest(invested_balance - v_inv.amount, 0),
        total_balance = total_balance + v_unclaimed
    where id = v_inv.user_id;

    if v_unclaimed > 0 then
      insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
      values (v_inv.user_id, 'yield', v_unclaimed, v_before, v_before + v_unclaimed, 'completed', 'YLD-' || gen_random_uuid(),
              'Earnings from ' || coalesce(v_plan_name, 'plan') || ' plan');
    end if;
    insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
    values (v_inv.user_id, 'investment', v_inv.amount, v_before + v_unclaimed, v_before + v_unclaimed + v_inv.amount, 'completed',
            'INV-' || v_inv.id || '-END', coalesce(v_plan_name, 'Plan') || ' plan completed: investment returned');

    update investments
    set status = 'completed', current_earnings = v_total, claimed_earnings = v_total, closed_at = now(), exit_type = 'matured'
    where id = v_inv.id;

    insert into notifications (user_id, type, title, message)
    values (v_inv.user_id, 'investment_completed', 'Plan completed',
            'Your ' || coalesce(v_plan_name, '') || ' plan finished. $' || (v_inv.amount + v_unclaimed)
            || ' was added to your balance.');
    v_completed := v_completed + 1;
  end loop;
  return v_completed;
end;
$function$;

-- What the customer would get by ending a plan now. Used by the confirm box
-- and by exit_investment_early so both always agree.
create or replace function public.preview_early_exit(p_investment_id uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_inv investments%rowtype;
  v_accrued numeric;
  v_days integer;
  v_halfway boolean;
  v_entitled numeric;
begin
  select * into v_inv from investments where id = p_investment_id;
  if not found or (v_inv.user_id <> auth.uid() and auth.role() <> 'service_role') then
    raise exception 'investment not found';
  end if;
  v_accrued := investment_accrued(v_inv);
  v_days := least(greatest(floor(extract(epoch from (now() - v_inv.started_at)) / 86400), 0), v_inv.duration_days)::integer;
  v_halfway := v_days * 2 >= v_inv.duration_days;
  v_entitled := case when v_halfway then round(v_accrued / 2, 2) else 0 end;
  return jsonb_build_object(
    'principal', v_inv.amount,
    'earned', v_accrued,
    'claimed', v_inv.claimed_earnings,
    'days', v_days,
    'duration', v_inv.duration_days,
    'halfway_at', v_inv.started_at + make_interval(days => ceil(v_inv.duration_days / 2.0)::integer),
    'past_halfway', v_halfway,
    'earnings_kept', v_entitled,
    'payout', greatest(v_inv.amount + v_entitled - v_inv.claimed_earnings, 0)
  );
end;
$function$;

create or replace function public.exit_investment_early(p_investment_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_inv investments%rowtype;
  v_preview jsonb;
  v_payout numeric;
  v_before numeric;
  v_plan_name text;
begin
  select * into v_inv from investments where id = p_investment_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'investment not found';
  end if;
  if v_inv.status <> 'active' then
    raise exception 'this plan is no longer active';
  end if;

  v_preview := preview_early_exit(p_investment_id);
  v_payout := (v_preview->>'payout')::numeric;
  select name into v_plan_name from investment_plans where id = v_inv.plan_id;

  perform set_config('app.bypass_profile_guard', 'on', true);
  select available_balance into v_before from profiles where id = v_inv.user_id for update;
  -- Total changes by what is paid out beyond the investment itself (earnings
  -- kept minus earnings already claimed, which can be negative).
  update profiles
  set available_balance = available_balance + v_payout,
      invested_balance = greatest(invested_balance - v_inv.amount, 0),
      total_balance = total_balance + (v_payout - v_inv.amount)
  where id = v_inv.user_id;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (v_inv.user_id, 'investment', v_payout, v_before, v_before + v_payout, 'completed', 'INV-' || v_inv.id || '-EXIT',
          coalesce(v_plan_name, 'Plan') || ' plan ended early: $' || v_inv.amount || ' invested, $'
          || (v_preview->>'earnings_kept') || ' earnings kept'
          || case when v_inv.claimed_earnings > 0 then ', $' || v_inv.claimed_earnings || ' already moved to balance' else '' end);

  update investments
  set status = 'cancelled', current_earnings = (v_preview->>'earned')::numeric,
      claimed_earnings = (v_preview->>'earnings_kept')::numeric, closed_at = now(), exit_type = 'early'
  where id = v_inv.id;

  insert into notifications (user_id, type, title, message)
  values (v_inv.user_id, 'investment_completed', 'Plan ended early',
          'You ended your ' || coalesce(v_plan_name, '') || ' plan early. $' || v_payout || ' was added to your balance.');

  return v_preview;
end;
$function$;

-- "Move to balance": unclaimed earnings go to the available balance once they
-- reach the plan's minimum withdrawal.
create or replace function public.claim_investment_earnings(p_investment_id uuid)
 returns numeric
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_inv investments%rowtype;
  v_min numeric;
  v_plan_name text;
  v_accrued numeric;
  v_amount numeric;
  v_before numeric;
begin
  select * into v_inv from investments where id = p_investment_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'investment not found';
  end if;
  if v_inv.status <> 'active' then
    raise exception 'this plan is no longer active';
  end if;

  select min_withdrawal, name into v_min, v_plan_name from investment_plans where id = v_inv.plan_id;
  v_accrued := investment_accrued(v_inv);
  v_amount := v_accrued - v_inv.claimed_earnings;
  if v_amount < coalesce(v_min, 0) or v_amount <= 0 then
    raise exception 'You can move earnings to your balance once they reach $%. You have $% so far.', coalesce(v_min, 0), greatest(v_amount, 0);
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);
  select available_balance into v_before from profiles where id = v_inv.user_id for update;
  update profiles
  set available_balance = available_balance + v_amount, total_balance = total_balance + v_amount
  where id = v_inv.user_id;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (v_inv.user_id, 'yield', v_amount, v_before, v_before + v_amount, 'completed', 'YLD-' || gen_random_uuid(),
          'Earnings from ' || coalesce(v_plan_name, 'plan') || ' plan moved to balance');

  update investments set current_earnings = v_accrued, claimed_earnings = v_accrued where id = v_inv.id;
  return v_amount;
end;
$function$;

-- Limits shown on the withdraw page; request_withdrawal enforces the same.
create or replace function public.my_withdrawal_rules()
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_settings system_settings%rowtype;
  v_min numeric;
  v_verified boolean;
  v_used numeric;
begin
  select * into v_settings from system_settings limit 1;
  select min(p.min_withdrawal) into v_min
  from investments i join investment_plans p on p.id = i.plan_id
  where i.user_id = auth.uid() and i.status = 'active';
  v_verified := exists (select 1 from kyc_submissions where user_id = auth.uid() and status = 'approved');
  select coalesce(sum(amount), 0) into v_used from withdrawals where user_id = auth.uid() and status not in ('rejected', 'failed');
  return jsonb_build_object(
    'minimum', coalesce(v_min, v_settings.withdrawal_min),
    'maximum', v_settings.withdrawal_max,
    'kyc_verified', v_verified,
    'kyc_limit', v_settings.kyc_free_withdrawal_limit,
    'kyc_remaining', case when v_verified then null else greatest(v_settings.kyc_free_withdrawal_limit - v_used, 0) end
  );
end;
$function$;

create or replace function request_withdrawal(
  p_amount numeric,
  p_currency text,
  p_network text,
  p_destination text
)
returns withdrawals as $$
declare
  v_profile profiles%rowtype;
  v_settings system_settings%rowtype;
  v_maintenance maintenance_settings%rowtype;
  v_fee numeric;
  v_total_today numeric;
  v_recent_count int;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
  v_withdrawal withdrawals%rowtype;
  v_min numeric;
  v_used numeric;
begin
  select * into v_profile from profiles where id = auth.uid() for update;
  if not found then
    raise exception 'profile not found';
  end if;

  if v_profile.account_status in ('suspended', 'frozen', 'withdrawal_freeze') then
    raise exception 'withdrawals are not permitted for this account (%)' , v_profile.account_status;
  end if;

  select count(*) into v_recent_count from withdrawals where user_id = auth.uid() and created_at > now() - interval '10 seconds';
  if v_recent_count > 0 then
    raise exception 'please wait a moment before submitting another withdrawal request';
  end if;

  select * into v_settings from system_settings limit 1;
  select * into v_maintenance from maintenance_settings limit 1;

  if v_maintenance.enabled and v_maintenance.disable_withdrawals then
    raise exception 'withdrawals are temporarily disabled for maintenance';
  end if;

  if not v_settings.withdrawal_enabled then
    raise exception 'withdrawals are currently disabled';
  end if;

  select min(p.min_withdrawal) into v_min
  from investments i join investment_plans p on p.id = i.plan_id
  where i.user_id = auth.uid() and i.status = 'active';
  v_min := coalesce(v_min, v_settings.withdrawal_min);

  if p_amount < v_min then
    raise exception 'The minimum withdrawal is $%.', v_min;
  end if;
  if p_amount > v_settings.withdrawal_max then
    raise exception 'The maximum withdrawal is $%.', v_settings.withdrawal_max;
  end if;

  if not exists (select 1 from kyc_submissions where user_id = auth.uid() and status = 'approved') then
    select coalesce(sum(amount), 0) into v_used from withdrawals where user_id = auth.uid() and status not in ('rejected', 'failed');
    if v_used + p_amount > v_settings.kyc_free_withdrawal_limit then
      raise exception 'Without identity verification you can withdraw up to $% in total. You have $% left. Verify your identity to withdraw more.',
        v_settings.kyc_free_withdrawal_limit, greatest(v_settings.kyc_free_withdrawal_limit - v_used, 0);
    end if;
  end if;

  select coalesce(sum(amount), 0) into v_total_today
  from withdrawals
  where user_id = auth.uid()
    and status not in ('rejected', 'failed')
    and created_at >= date_trunc('day', now());

  if v_total_today + p_amount > v_settings.withdrawal_daily_limit then
    raise exception 'daily withdrawal limit of % exceeded', v_settings.withdrawal_daily_limit;
  end if;

  v_fee := round(p_amount * v_settings.withdrawal_fee_percent / 100, 2);

  if v_profile.available_balance < p_amount then
    raise exception 'insufficient available balance';
  end if;

  if length(trim(p_destination)) < 4 then
    raise exception 'destination address is invalid';
  end if;

  v_before := v_profile.available_balance;
  v_after := v_before - p_amount;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set available_balance = v_after where id = auth.uid();

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (auth.uid(), 'withdrawal', -p_amount, v_before, v_after, 'pending', 'WD-' || gen_random_uuid(), 'Withdrawal request')
  returning * into v_txn;

  insert into withdrawals (user_id, amount, fee, currency, network, destination, status, transaction_id)
  values (auth.uid(), p_amount, v_fee, p_currency, p_network, p_destination, 'pending', v_txn.id)
  returning * into v_withdrawal;

  insert into notifications (user_id, type, title, message)
  values (auth.uid(), 'withdrawal_pending', 'Withdrawal requested', 'Your withdrawal request for ' || p_amount || ' ' || p_currency || ' is pending review.');

  return v_withdrawal;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.sync_investment_earnings() from public, anon, authenticated;
revoke all on function public.preview_early_exit(uuid) from public, anon;
revoke all on function public.exit_investment_early(uuid) from public, anon;
revoke all on function public.claim_investment_earnings(uuid) from public, anon;
revoke all on function public.my_withdrawal_rules() from public, anon;
grant execute on function public.preview_early_exit(uuid) to authenticated;
grant execute on function public.exit_investment_early(uuid) to authenticated;
grant execute on function public.claim_investment_earnings(uuid) to authenticated;
grant execute on function public.my_withdrawal_rules() to authenticated;

select cron.schedule('investment-earnings-sync', '7 * * * *', $$select public.sync_investment_earnings();$$);
