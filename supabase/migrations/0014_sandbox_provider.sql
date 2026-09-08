-- Phase 10: Sandbox payment provider. Unlike the Demo provider (which
-- self-confirms after a delay), Sandbox deposits are only completed by
-- complete_sandbox_deposit(), which verifies an HMAC-SHA256 signature
-- against the integration's stored webhook secret — the same trust
-- mechanism a real payment gateway's webhook uses. This function is
-- intentionally NOT reachable by `authenticated`/`anon`: only a
-- service-role caller (a future webhook-receiving Edge Function) can
-- invoke it, so even in Sandbox mode the frontend can never confirm its
-- own deposit.

create or replace function create_sandbox_deposit(p_amount numeric, p_currency text, p_network text)
returns deposits as $$
declare
  v_settings system_settings%rowtype;
  v_maintenance maintenance_settings%rowtype;
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

  if p_amount < v_settings.deposit_min or p_amount > v_settings.deposit_max then
    raise exception 'amount must be between % and %', v_settings.deposit_min, v_settings.deposit_max;
  end if;

  insert into deposits (user_id, amount, currency, network, provider, provider_reference, status)
  values (auth.uid(), p_amount, p_currency, p_network, 'sandbox', 'SANDBOX-' || gen_random_uuid(), 'pending')
  returning * into v_deposit;

  return v_deposit;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function create_sandbox_deposit to authenticated;

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

  if v_deposit.status != 'pending' then
    raise exception 'deposit already %', v_deposit.status;
  end if;

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

-- Explicitly deny to authenticated/anon — only a service-role connection
-- (a webhook-receiving Edge Function, later) may call this.
revoke all on function complete_sandbox_deposit from public, authenticated, anon;
