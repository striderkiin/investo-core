-- ==================================================================
-- INVESTO CORE SUITE — incremental schema bootstrap for Phase 11
-- (migration 0016). Run this AFTER 001_schema_bootstrap.sql AND
-- 003_schema_bootstrap_phase6-10.sql have already been applied to
-- your project. Paste this ENTIRE file into the Supabase SQL Editor
-- and click Run.
-- ==================================================================

begin;

-- Phase 11: Production Hardening (spec section 91). A review-and-fix pass,
-- not new features. Each change below closes a specific gap found by
-- re-reading the existing functions/tables with production traffic in mind.

-- ---------------------------------------------------------------------
-- 1. Idempotent webhook completion. A real payment provider retries a
--    webhook until it gets a 2xx response; previously, a duplicate delivery
--    for an already-completed deposit raised an exception (which an Edge
--    Function would turn into a non-2xx response), causing the provider to
--    retry forever for no reason. Re-delivery of an already-completed
--    deposit is now a no-op success; anything else abnormal (rejected/
--    failed) still raises, since that IS a real error worth surfacing.
-- ---------------------------------------------------------------------

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

  if v_deposit.status = 'completed' then
    return v_deposit; -- idempotent: already done, treat re-delivery as success
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

create or replace function complete_sandbox_deposit(p_deposit_id uuid, p_raw_payload text, p_signature text)
returns deposits as $$
declare
  v_deposit deposits%rowtype;
  v_secret text;
  v_expected_signature text;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
begin
  select * into v_deposit from deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'deposit not found';
  end if;

  if v_deposit.provider != 'sandbox' then
    raise exception 'this function only completes sandbox provider deposits';
  end if;

  -- Signature is still checked before treating a "completed" replay as
  -- benign — an attacker retrying with a bad signature must keep failing,
  -- not learn anything from an early idempotent-success short-circuit.
  select s.webhook_secret into v_secret
  from integration_secrets s
  join integration_configs c on c.id = s.integration_id
  where c.provider_type = 'payment' and c.environment = 'sandbox'
  limit 1;

  if v_secret is null then
    raise exception 'no sandbox payment webhook secret configured';
  end if;

  v_expected_signature := encode(hmac(p_raw_payload, v_secret, 'sha256'), 'hex');
  if v_expected_signature != lower(p_signature) then
    raise exception 'invalid webhook signature';
  end if;

  if v_deposit.status = 'completed' then
    return v_deposit; -- idempotent: already done, treat re-delivery as success
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
  values (v_deposit.user_id, 'deposit', v_deposit.amount, v_before, v_after, 'completed', 'DEP-' || gen_random_uuid(), 'Sandbox deposit confirmed via webhook')
  returning * into v_txn;

  update deposits set status = 'completed', transaction_id = v_txn.id where id = p_deposit_id
  returning * into v_deposit;

  insert into notifications (user_id, type, title, message)
  values (v_deposit.user_id, 'deposit_confirmed', 'Deposit confirmed', 'Your deposit of ' || v_deposit.amount || ' ' || v_deposit.currency || ' has been confirmed.');

  insert into payment_events (provider, event_type, reference, payload, processed)
  values ('sandbox', 'deposit.completed', v_deposit.provider_reference, jsonb_build_object('deposit_id', p_deposit_id), true);

  return v_deposit;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function complete_sandbox_deposit from public, authenticated, anon;

-- ---------------------------------------------------------------------
-- 2. Negative-balance guard on debit adjustments. adjust_user_balance()
--    previously let a debit push available_balance/bonus_balance/
--    invested_balance below zero with no check — an admin fat-fingering an
--    amount had no safety net. total_balance is left uncapped since an
--    admin may legitimately need to zero/correct it as an override.
-- ---------------------------------------------------------------------

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

  if p_type = 'debit' and p_field != 'total_balance' then
    if (case p_field
          when 'available_balance' then v_profile.available_balance
          when 'bonus_balance' then v_profile.bonus_balance
          else v_profile.invested_balance
        end) + v_delta < 0 then
      raise exception 'debit would take % below zero', p_field;
    end if;
  end if;

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

-- ---------------------------------------------------------------------
-- 3. Automatic audit logging for settings tables (spec section 70 lists
--    "Changed Site Name", "Changed Brand Color", "Enabled Maintenance" as
--    required audit examples — none of those were actually being logged;
--    every settings page called plain UPDATE with no audit trail at all).
--    A trigger guarantees this can't be forgotten by a future settings page
--    the way a per-service-call log line could be.
-- ---------------------------------------------------------------------

create or replace function audit_settings_change()
returns trigger as $$
declare
  v_changed jsonb := '{}'::jsonb;
  v_previous jsonb := '{}'::jsonb;
  v_key text;
  v_old_val jsonb;
  v_new_val jsonb;
begin
  for v_key in select jsonb_object_keys(to_jsonb(NEW)) loop
    if v_key in ('id', 'updated_at', 'created_at') then
      continue;
    end if;
    v_old_val := to_jsonb(OLD) -> v_key;
    v_new_val := to_jsonb(NEW) -> v_key;
    if v_old_val is distinct from v_new_val then
      v_changed := v_changed || jsonb_build_object(v_key, v_new_val);
      v_previous := v_previous || jsonb_build_object(v_key, v_old_val);
    end if;
  end loop;

  if v_changed = '{}'::jsonb then
    return NEW;
  end if;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (
    auth.uid(),
    'settings_updated',
    TG_TABLE_NAME,
    NEW.id::text,
    v_previous::text,
    v_changed::text,
    coalesce(current_setting('app.environment', true), 'development')
  );

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_branding_changes
  after update on branding
  for each row execute function audit_settings_change();

create trigger trg_audit_white_label_changes
  after update on white_label_settings
  for each row execute function audit_settings_change();

create trigger trg_audit_system_settings_changes
  after update on system_settings
  for each row execute function audit_settings_change();

create trigger trg_audit_maintenance_changes
  after update on maintenance_settings
  for each row execute function audit_settings_change();

create trigger trg_audit_compliance_changes
  after update on compliance_settings
  for each row execute function audit_settings_change();

-- ---------------------------------------------------------------------
-- 4. Basic abuse/double-submit protection on the withdrawal RPC — the one
--    financial action with no client-side auto-confirm to fall back on. A
--    duplicate network retry or an impatient double-click previously could
--    create two withdrawal rows for the same intent.
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- 5. A few missing indexes for query patterns the app actually runs.
-- ---------------------------------------------------------------------

create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_deposits_provider_status on deposits(provider, status);
create index if not exists idx_withdrawals_created_at on withdrawals(created_at desc);
create index if not exists idx_announcements_active on announcements(is_active) where is_active = true;

commit;
