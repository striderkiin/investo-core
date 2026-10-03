-- PayRam: self-hosted crypto checkout with automatic confirmation.
--
-- Flow:
--   1. The customer asks for a deposit. The payram-checkout edge function
--      opens a pending deposit (open_provider_deposit), asks the merchant's
--      PayRam server for a payment link and stores it (attach_provider_checkout).
--   2. The customer pays on PayRam's checkout page and picks the coin there.
--   3. PayRam calls the payram-webhook edge function. It re-reads the payment
--      from PayRam and settles the deposit (settle_provider_deposit).
--
-- The PayRam server address lives in integration_configs.config.base_url and
-- the project API key in integration_secrets.api_key (same as Resend). All
-- three functions below are for the service role only: a browser session can
-- never open, attach or settle a provider deposit itself.

alter table deposits
  add column if not exists checkout_url text,
  add column if not exists provider_status text;

create unique index if not exists deposits_provider_reference_key
  on deposits (provider, provider_reference)
  where provider_reference is not null;

-- Which automatic payment provider is connected, so the deposit page knows
-- whether to send customers to a checkout page. Returns 'payram' or null.
create or replace function public.active_payment_provider()
 returns text
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select 'payram'::text
  from integration_configs
  where provider_type = 'payment' and lower(provider_name) = 'payram' and status = 'connected'
  limit 1;
$function$;

revoke all on function public.active_payment_provider() from public, anon;
grant execute on function public.active_payment_provider() to authenticated;

create or replace function public.open_provider_deposit(p_user_id uuid, p_amount numeric, p_provider text)
 returns deposits
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_settings system_settings%rowtype;
  v_maintenance maintenance_settings%rowtype;
  v_profile profiles%rowtype;
  v_deposit deposits%rowtype;
begin
  select * into v_settings from system_settings limit 1;
  select * into v_maintenance from maintenance_settings limit 1;

  if v_maintenance.enabled and v_maintenance.disable_deposits then
    raise exception 'deposits are temporarily disabled for maintenance';
  end if;

  if not v_settings.deposit_enabled then
    raise exception 'deposits are currently disabled';
  end if;

  if p_amount is null or p_amount < v_settings.deposit_min or p_amount > v_settings.deposit_max then
    raise exception 'amount must be between % and %', v_settings.deposit_min, v_settings.deposit_max;
  end if;

  select * into v_profile from profiles where id = p_user_id;
  if not found then
    raise exception 'account not found';
  end if;
  if v_profile.account_status in ('suspended', 'frozen') then
    raise exception 'your account cannot make deposits right now';
  end if;

  insert into deposits (user_id, amount, currency, network, provider, status)
  values (p_user_id, round(p_amount, 2), 'USD', 'Crypto (choose at checkout)', p_provider, 'pending')
  returning * into v_deposit;

  return v_deposit;
end;
$function$;

create or replace function public.attach_provider_checkout(p_deposit_id uuid, p_reference text, p_checkout_url text)
 returns deposits
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_deposit deposits%rowtype;
begin
  update deposits
  set provider_reference = p_reference, checkout_url = p_checkout_url, provider_status = 'OPEN'
  where id = p_deposit_id and status = 'pending'
  returning * into v_deposit;
  if not found then
    raise exception 'deposit not found';
  end if;
  return v_deposit;
end;
$function$;

-- Applies a payment state reported by the provider. Safe to call more than
-- once for the same payment: a completed deposit is never credited twice.
--   FILLED / OVER_FILLED -> completed, balance credited with the deposit amount
--   PARTIALLY_FILLED     -> processing, left for an admin to confirm or reject
--   CANCELLED            -> failed
-- Any other state only updates provider_status.
create or replace function public.settle_provider_deposit(p_provider text, p_reference text, p_state text, p_filled_usd numeric default null)
 returns deposits
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_deposit deposits%rowtype;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
  v_state text := upper(coalesce(p_state, ''));
  v_label text := case when p_provider = 'payram' then 'PayRam' else initcap(p_provider) end;
begin
  select * into v_deposit from deposits where provider = p_provider and provider_reference = p_reference for update;
  if not found then
    raise exception 'deposit not found for reference %', p_reference;
  end if;

  update deposits set provider_status = v_state where id = v_deposit.id;

  if v_deposit.status not in ('pending', 'processing') then
    select * into v_deposit from deposits where id = v_deposit.id;
    return v_deposit;
  end if;

  if v_state in ('FILLED', 'OVER_FILLED') then
    select available_balance into v_before from profiles where id = v_deposit.user_id for update;
    v_after := v_before + v_deposit.amount;

    perform set_config('app.bypass_profile_guard', 'on', true);
    update profiles
    set available_balance = v_after, total_balance = total_balance + v_deposit.amount
    where id = v_deposit.user_id;

    insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
    values (v_deposit.user_id, 'deposit', v_deposit.amount, v_before, v_after, 'completed', 'DEP-' || gen_random_uuid(),
            'Crypto deposit confirmed by ' || v_label)
    returning * into v_txn;

    update deposits
    set status = 'completed',
        transaction_id = v_txn.id,
        reviewed_at = now(),
        admin_notes = 'Confirmed automatically by ' || v_label || '.'
          || case when v_state = 'OVER_FILLED' and p_filled_usd is not null
               then ' The customer paid $' || round(p_filled_usd, 2) || ', more than the $' || v_deposit.amount || ' requested.'
               else '' end
    where id = v_deposit.id
    returning * into v_deposit;

    insert into notifications (user_id, type, title, message)
    values (v_deposit.user_id, 'deposit_confirmed', 'Deposit confirmed',
            'Your deposit of $' || v_deposit.amount || ' has been confirmed and added to your balance.');
  elsif v_state = 'PARTIALLY_FILLED' then
    update deposits
    set status = 'processing',
        admin_notes = 'Partly paid: $' || coalesce(round(p_filled_usd, 2)::text, '?') || ' of $' || v_deposit.amount
          || ' received. Check the payment in ' || v_label || ', then confirm or reject it here.'
    where id = v_deposit.id
    returning * into v_deposit;
  elsif v_state = 'CANCELLED' then
    update deposits
    set status = 'failed', admin_notes = 'The ' || v_label || ' payment was cancelled or expired.'
    where id = v_deposit.id
    returning * into v_deposit;
  else
    select * into v_deposit from deposits where id = v_deposit.id;
  end if;

  return v_deposit;
end;
$function$;

revoke all on function public.open_provider_deposit(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.attach_provider_checkout(uuid, text, text) from public, anon, authenticated;
revoke all on function public.settle_provider_deposit(text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.open_provider_deposit(uuid, numeric, text) to service_role;
grant execute on function public.attach_provider_checkout(uuid, text, text) to service_role;
grant execute on function public.settle_provider_deposit(text, text, text, numeric) to service_role;

-- Manual deposits on a live site: the customer pays one of the admin's own
-- wallet addresses (Integrations > Wallet addresses, "Live") and an admin
-- confirms it under Deposits. Same checks as the demo and sandbox versions.
create or replace function public.create_manual_deposit(p_amount numeric, p_currency text, p_network text)
 returns deposits
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_settings system_settings%rowtype;
  v_maintenance maintenance_settings%rowtype;
  v_deposit deposits%rowtype;
  v_address text;
begin
  select * into v_settings from system_settings limit 1;
  select * into v_maintenance from maintenance_settings limit 1;

  if v_maintenance.enabled and v_maintenance.disable_deposits then
    raise exception 'deposits are temporarily disabled for maintenance';
  end if;

  if not v_settings.deposit_enabled then
    raise exception 'deposits are currently disabled';
  end if;

  if p_amount < v_settings.deposit_min or p_amount > v_settings.deposit_max then
    raise exception 'amount must be between % and %', v_settings.deposit_min, v_settings.deposit_max;
  end if;

  select address into v_address from deposit_addresses
    where currency = p_currency and network = p_network and environment = 'live' and is_active
    limit 1;
  if v_address is null then
    raise exception 'deposits in % (%) are not available yet', p_currency, p_network;
  end if;

  insert into deposits (user_id, amount, currency, network, provider, provider_reference, status, destination_address)
  values (auth.uid(), p_amount, p_currency, p_network, 'manual', 'MAN-' || gen_random_uuid(), 'pending', v_address)
  returning * into v_deposit;

  return v_deposit;
end;
$function$;

revoke all on function public.create_manual_deposit(numeric, text, text) from public, anon;
grant execute on function public.create_manual_deposit(numeric, text, text) to authenticated;
