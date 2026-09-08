-- Phase 4/5: security-definer functions that perform every balance-affecting
-- operation atomically and server-side. The TypeScript service layer calls
-- these via supabase.rpc(...) instead of ever writing balances directly.

create or replace function adjust_user_balance(
  p_user_id uuid,
  p_field text,
  p_amount numeric,
  p_type text,
  p_reason text,
  p_notes text default null
)
returns transactions as $$
declare
  v_profile profiles%rowtype;
  v_delta numeric;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
begin
  if not has_permission('users.adjust_balance') then
    raise exception 'not authorized to adjust balances';
  end if;

  if p_field not in ('total_balance', 'available_balance', 'bonus_balance', 'invested_balance') then
    raise exception 'invalid balance field: %', p_field;
  end if;

  if p_type not in ('credit', 'debit') then
    raise exception 'invalid adjustment type: %', p_type;
  end if;

  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select * into v_profile from profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  v_delta := case when p_type = 'credit' then p_amount else -p_amount end;

  perform set_config('app.bypass_profile_guard', 'on', true);

  if p_field = 'total_balance' then
    v_before := v_profile.total_balance;
    v_after := v_before + v_delta;
    update profiles set total_balance = v_after where id = p_user_id;
  elsif p_field = 'available_balance' then
    v_before := v_profile.available_balance;
    v_after := v_before + v_delta;
    update profiles set available_balance = v_after, total_balance = v_after + bonus_balance + invested_balance where id = p_user_id;
  elsif p_field = 'bonus_balance' then
    v_before := v_profile.bonus_balance;
    v_after := v_before + v_delta;
    update profiles set bonus_balance = v_after, total_balance = available_balance + v_after + invested_balance where id = p_user_id;
  else
    v_before := v_profile.invested_balance;
    v_after := v_before + v_delta;
    update profiles set invested_balance = v_after, total_balance = available_balance + bonus_balance + v_after where id = p_user_id;
  end if;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (p_user_id, 'adjustment', v_delta, v_before, v_after, 'completed', 'ADJ-' || gen_random_uuid(), p_reason)
  returning * into v_txn;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (
    auth.uid(),
    p_type || '_' || p_field,
    'users',
    p_user_id::text,
    v_before::text,
    v_after::text,
    coalesce(current_setting('app.environment', true), 'development')
  );

  return v_txn;
end;
$$ language plpgsql security definer set search_path = public;

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
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
  v_withdrawal withdrawals%rowtype;
begin
  select * into v_profile from profiles where id = auth.uid() for update;
  if not found then
    raise exception 'profile not found';
  end if;

  if v_profile.account_status in ('suspended', 'frozen', 'withdrawal_freeze') then
    raise exception 'withdrawals are not permitted for this account (%)' , v_profile.account_status;
  end if;

  select * into v_settings from system_settings limit 1;
  select * into v_maintenance from maintenance_settings limit 1;

  if v_maintenance.enabled and v_maintenance.disable_withdrawals then
    raise exception 'withdrawals are temporarily disabled for maintenance';
  end if;

  if not v_settings.withdrawal_enabled then
    raise exception 'withdrawals are currently disabled';
  end if;

  if p_amount < v_settings.withdrawal_min or p_amount > v_settings.withdrawal_max then
    raise exception 'amount must be between % and %', v_settings.withdrawal_min, v_settings.withdrawal_max;
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

create or replace function review_withdrawal(
  p_withdrawal_id uuid,
  p_action text,
  p_notes text default null
)
returns withdrawals as $$
declare
  v_withdrawal withdrawals%rowtype;
  v_profile profiles%rowtype;
  v_before numeric;
  v_after numeric;
  v_new_status withdrawal_status;
  v_txn_status transaction_status;
  v_notif_type notification_type;
begin
  if not has_permission('withdrawals.approve') then
    raise exception 'not authorized to review withdrawals';
  end if;

  if p_action not in ('approve', 'reject', 'hold', 'complete') then
    raise exception 'invalid action: %', p_action;
  end if;

  select * into v_withdrawal from withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal not found';
  end if;

  if v_withdrawal.status in ('completed', 'rejected') then
    raise exception 'withdrawal already finalized as %', v_withdrawal.status;
  end if;

  select * into v_profile from profiles where id = v_withdrawal.user_id for update;

  if p_action = 'hold' then
    v_new_status := 'review';
    v_txn_status := 'pending';
  elsif p_action = 'approve' then
    v_new_status := 'processing';
    v_txn_status := 'processing';
  elsif p_action = 'reject' then
    v_new_status := 'rejected';
    v_txn_status := 'rejected';
    v_before := v_profile.available_balance;
    v_after := v_before + v_withdrawal.amount;
    perform set_config('app.bypass_profile_guard', 'on', true);
    update profiles set available_balance = v_after where id = v_withdrawal.user_id;
  else
    v_new_status := 'completed';
    v_txn_status := 'completed';
    v_before := v_profile.total_balance;
    v_after := v_before - v_withdrawal.amount;
    perform set_config('app.bypass_profile_guard', 'on', true);
    update profiles set total_balance = v_after where id = v_withdrawal.user_id;
  end if;

  update transactions set status = v_txn_status where id = v_withdrawal.transaction_id;

  update withdrawals
  set status = v_new_status, reviewed_by = auth.uid(), notes = coalesce(p_notes, notes)
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'withdrawal_' || p_action, 'withdrawals', p_withdrawal_id::text, null, v_new_status::text, coalesce(current_setting('app.environment', true), 'development'));

  v_notif_type := case v_new_status
    when 'processing' then 'withdrawal_processing'
    when 'completed' then 'withdrawal_completed'
    else 'withdrawal_pending'
  end;

  insert into notifications (user_id, type, title, message)
  values (v_withdrawal.user_id, v_notif_type, 'Withdrawal update', 'Your withdrawal is now ' || v_new_status);

  return v_withdrawal;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function create_investment(p_plan_id uuid, p_amount numeric)
returns investments as $$
declare
  v_plan investment_plans%rowtype;
  v_profile profiles%rowtype;
  v_investment investments%rowtype;
  v_before numeric;
  v_after numeric;
begin
  select * into v_plan from investment_plans where id = p_plan_id;
  if not found or v_plan.status != 'active' then
    raise exception 'plan not available';
  end if;

  if p_amount < v_plan.min_amount or p_amount > v_plan.max_amount then
    raise exception 'amount must be between % and %', v_plan.min_amount, v_plan.max_amount;
  end if;

  select * into v_profile from profiles where id = auth.uid() for update;

  if v_profile.account_status in ('suspended', 'frozen') then
    raise exception 'investing is not permitted for this account';
  end if;

  if v_profile.available_balance < p_amount then
    raise exception 'insufficient available balance';
  end if;

  v_before := v_profile.available_balance;
  v_after := v_before - p_amount;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles
  set available_balance = v_after, invested_balance = invested_balance + p_amount
  where id = auth.uid();

  insert into investments (user_id, plan_id, amount, rate, rate_type, duration_days, status, started_at, ends_at)
  values (auth.uid(), p_plan_id, p_amount, v_plan.rate, v_plan.rate_type, v_plan.duration_days, 'active', now(), now() + make_interval(days => v_plan.duration_days))
  returning * into v_investment;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (auth.uid(), 'investment', -p_amount, v_before, v_after, 'completed', 'INV-' || gen_random_uuid(), 'Investment in ' || v_plan.name);

  insert into notifications (user_id, type, title, message)
  values (auth.uid(), 'investment_started', 'Investment started', 'Your investment of ' || p_amount || ' in ' || v_plan.name || ' has started.');

  return v_investment;
end;
$$ language plpgsql security definer set search_path = public;

-- Demo payment provider: simulates a webhook confirming a deposit. Only ever
-- wired up behind the DemoProvider (never Sandbox/Production, see PaymentProvider
-- abstraction) — real providers verify signatures server-side and never let the
-- depositing user trigger their own confirmation.
create or replace function demo_complete_deposit(p_deposit_id uuid)
returns deposits as $$
declare
  v_deposit deposits%rowtype;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
begin
  select * into v_deposit from deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'deposit not found';
  end if;

  if v_deposit.provider != 'demo' then
    raise exception 'this function only simulates the demo payment provider';
  end if;

  if v_deposit.user_id != auth.uid() and not has_permission('deposits.manage') then
    raise exception 'not authorized';
  end if;

  if v_deposit.status != 'pending' then
    raise exception 'deposit already %', v_deposit.status;
  end if;

  select available_balance into v_before from profiles where id = v_deposit.user_id;
  v_after := v_before + v_deposit.amount;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles
  set available_balance = v_after, total_balance = total_balance + v_deposit.amount
  where id = v_deposit.user_id;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (v_deposit.user_id, 'deposit', v_deposit.amount, v_before, v_after, 'completed', 'DEP-' || gen_random_uuid(), 'Demo deposit confirmed')
  returning * into v_txn;

  update deposits set status = 'completed', transaction_id = v_txn.id where id = p_deposit_id
  returning * into v_deposit;

  insert into notifications (user_id, type, title, message)
  values (v_deposit.user_id, 'deposit_confirmed', 'Deposit confirmed', 'Your deposit of ' || v_deposit.amount || ' ' || v_deposit.currency || ' has been confirmed.');

  return v_deposit;
end;
$$ language plpgsql security definer set search_path = public;

-- Automatic market tick: safe to expose broadly since it only ever advances a
-- random walk when the market is in `automatic` mode — it accepts no
-- caller-supplied value and is a no-op while manual control is engaged.
create or replace function advance_market_automatic()
returns market_settings as $$
declare
  v_settings market_settings%rowtype;
  v_change numeric;
  v_direction numeric;
  v_pct numeric;
begin
  select * into v_settings from market_settings limit 1 for update;

  if v_settings.mode != 'automatic' then
    return v_settings;
  end if;

  v_direction := case v_settings.automatic_behavior
    when 'upward' then 1
    when 'downward' then -1
    when 'volatile' then (case when random() < 0.5 then -1 else 1 end)
    when 'random' then (case when random() < 0.5 then -1 else 1 end)
    else (case when random() < 0.5 then -1 else 1 end) * 0.2
  end;

  v_change := v_direction * (v_settings.min_movement + random() * (v_settings.max_movement - v_settings.min_movement));

  if v_settings.automatic_behavior = 'stable' then
    v_change := v_change * 0.2;
  elsif v_settings.automatic_behavior = 'volatile' then
    v_change := v_change * 3;
  end if;

  v_pct := round(((v_settings.current_market_value + v_change) / nullif(v_settings.starting_value, 0) - 1) * 100, 4);

  update market_settings
  set current_market_value = round(current_market_value + v_change, 2),
      current_percentage_change = v_pct,
      current_trend = (case when v_change > 0 then 'bullish' when v_change < 0 then 'bearish' else 'stable' end)::market_trend
  where id = v_settings.id
  returning * into v_settings;

  insert into market_data (value, percentage_change, trend, is_manual)
  values (v_settings.current_market_value, v_settings.current_percentage_change, v_settings.current_trend, false);

  return v_settings;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function adjust_user_balance to authenticated;
grant execute on function request_withdrawal to authenticated;
grant execute on function review_withdrawal to authenticated;
grant execute on function create_investment to authenticated;
grant execute on function demo_complete_deposit to authenticated;
grant execute on function advance_market_automatic to authenticated;
