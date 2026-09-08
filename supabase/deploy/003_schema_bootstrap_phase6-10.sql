-- ==================================================================
-- INVESTO CORE SUITE — incremental schema bootstrap for Phases 6-10
-- (migrations 0010-0015). Run this AFTER 001_schema_bootstrap.sql
-- (migrations 0001-0009) has already been applied to your project.
-- Paste this ENTIRE file into the Supabase SQL Editor and click Run.
-- Wrapped in a transaction: if anything fails, nothing is left
-- half-applied.
-- ==================================================================

begin;

-- ---- 0010_storage.sql ----
-- Phase 6: Supabase Storage bucket for branding assets (logo, light/dark
-- logo, favicon). Public read (assets must render on the public site before
-- login); writes gated to branding.manage.

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy branding_assets_public_read on storage.objects for select
  using (bucket_id = 'branding');

create policy branding_assets_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and has_permission('branding.manage'));

create policy branding_assets_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'branding' and has_permission('branding.manage'));

create policy branding_assets_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and has_permission('branding.manage'));

-- ---- 0011_integration_secrets.sql ----
-- Phase 7: real credential storage. `integration_secrets` holds the actual
-- key material and has NO policies granted to `authenticated`/`anon` at
-- all — RLS defaults to deny, so no client-side query can ever read it
-- (this is enforced independently of application code, unlike relying on
-- "the frontend just doesn't ask for it"). The only way in or out is the
-- security-definer functions below, which return masked values to callers.

-- credential_metadata previously allowed multiple rows per integration; a
-- save/rotate should replace the existing masked record, not accumulate.
alter table credential_metadata add constraint credential_metadata_integration_id_key unique (integration_id);

create table integration_secrets (
  integration_id uuid primary key references integration_configs(id) on delete cascade,
  api_key text,
  api_secret text,
  webhook_secret text,
  updated_at timestamptz not null default now()
);

alter table integration_secrets enable row level security;
-- Intentionally no policies: authenticated/anon get zero rows, always.

create trigger trg_integration_secrets_updated_at
  before update on integration_secrets
  for each row execute function set_updated_at();

create or replace function mask_secret(value text)
returns text as $$
  select case
    when value is null or length(value) = 0 then null
    when length(value) <= 4 then repeat('•', 8)
    else repeat('•', 12) || right(value, 4)
  end;
$$ language sql immutable;

create or replace function save_integration_credential(
  p_integration_id uuid,
  p_api_key text,
  p_api_secret text,
  p_webhook_secret text
)
returns credential_metadata as $$
declare
  v_result credential_metadata%rowtype;
begin
  if not has_permission('integrations.manage') then
    raise exception 'not authorized to manage integration credentials';
  end if;

  insert into integration_secrets (integration_id, api_key, api_secret, webhook_secret)
  values (p_integration_id, p_api_key, p_api_secret, p_webhook_secret)
  on conflict (integration_id) do update
    set api_key = excluded.api_key,
        api_secret = excluded.api_secret,
        webhook_secret = excluded.webhook_secret,
        updated_at = now();

  insert into credential_metadata (integration_id, masked_key, masked_secret, webhook_configured, rotated_at, rotated_by)
  values (
    p_integration_id,
    coalesce(mask_secret(p_api_key), ''),
    coalesce(mask_secret(p_api_secret), ''),
    p_webhook_secret is not null and length(p_webhook_secret) > 0,
    now(),
    auth.uid()
  )
  on conflict (integration_id) do update
    set masked_key = excluded.masked_key,
        masked_secret = excluded.masked_secret,
        webhook_configured = excluded.webhook_configured,
        rotated_at = excluded.rotated_at,
        rotated_by = excluded.rotated_by
  returning * into v_result;

  update integration_configs set status = 'connected' where id = p_integration_id;

  insert into admin_audit_logs (admin_id, action, module, target, environment)
  values (auth.uid(), 'credential_saved', 'integrations', p_integration_id::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_result;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function test_integration_connection(p_integration_id uuid)
returns integration_configs as $$
declare
  v_secret integration_secrets%rowtype;
  v_config integration_configs%rowtype;
  v_ok boolean;
begin
  if not has_permission('integrations.manage') then
    raise exception 'not authorized to test integration connections';
  end if;

  select * into v_secret from integration_secrets where integration_id = p_integration_id;
  v_ok := v_secret.integration_id is not null and coalesce(length(v_secret.api_key), 0) > 0;

  update integration_configs
  set status = case when v_ok then 'connected' else 'error' end,
      last_tested_at = now()
  where id = p_integration_id
  returning * into v_config;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'test_connection', 'integrations', p_integration_id::text, v_config.status, coalesce(current_setting('app.environment', true), 'development'));

  return v_config;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function disconnect_integration(p_integration_id uuid)
returns integration_configs as $$
declare
  v_config integration_configs%rowtype;
begin
  if not has_permission('integrations.manage') then
    raise exception 'not authorized to disconnect integrations';
  end if;

  delete from integration_secrets where integration_id = p_integration_id;
  delete from credential_metadata where integration_id = p_integration_id;

  update integration_configs set status = 'disconnected' where id = p_integration_id
  returning * into v_config;

  insert into admin_audit_logs (admin_id, action, module, target, environment)
  values (auth.uid(), 'disconnected', 'integrations', p_integration_id::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_config;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function save_integration_credential to authenticated;
grant execute on function test_integration_connection to authenticated;
grant execute on function disconnect_integration to authenticated;

-- ---- 0012_operations.sql ----
-- Phase 8: Operations support.
-- 1. Move demo deposit creation server-side so it's validated the same way
--    request_withdrawal() already is (deposit min/max, deposit_enabled,
--    maintenance mode) instead of trusting the client to only insert a
--    reasonable row.
-- 2. Mark transactions/notifications generated by the Activity Simulation
--    Engine so the UI can clearly label them as simulated (spec section 45).
-- 3. Realtime for announcements/maintenance so a banner change reaches
--    already-open sessions immediately.

alter table transactions add column is_simulated boolean not null default false;
alter table notifications add column is_simulated boolean not null default false;

create or replace function create_demo_deposit(p_amount numeric, p_currency text, p_network text)
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
  values (auth.uid(), p_amount, p_currency, p_network, 'demo', 'DEMO-' || gen_random_uuid(), 'pending')
  returning * into v_deposit;

  return v_deposit;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function create_demo_deposit to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['announcements', 'maintenance_settings'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---- 0013_security.sql ----
-- Phase 9: session tracking and security events need write paths that
-- migration 0007 didn't add (it only covers reads). Sessions are
-- self-reported by the client on login/logout, so RLS must let a user
-- insert/update their own row; admins can terminate any session.

create policy user_sessions_insert_self on user_sessions for insert to authenticated
  with check (user_id = auth.uid());

create policy user_sessions_update_self_or_admin on user_sessions for update to authenticated
  using (user_id = auth.uid() or has_permission('security.manage'))
  with check (user_id = auth.uid() or has_permission('security.manage'));

-- Security events: a user may log an event about their own account (2FA
-- enabled/disabled, password changed); anything else stays admin/RPC-only.
create policy security_events_insert_self on security_events for insert to authenticated
  with check (user_id = auth.uid() and event_type in ('password_changed', '2fa_enabled', '2fa_disabled'));

create or replace function terminate_user_session(p_session_id uuid)
returns user_sessions as $$
declare
  v_session user_sessions%rowtype;
begin
  select * into v_session from user_sessions where id = p_session_id;
  if not found then
    raise exception 'session not found';
  end if;

  if v_session.user_id != auth.uid() and not has_permission('security.manage') then
    raise exception 'not authorized to terminate this session';
  end if;

  update user_sessions set terminated_at = now() where id = p_session_id
  returning * into v_session;

  insert into security_events (user_id, event_type, metadata)
  values (v_session.user_id, 'session_terminated', jsonb_build_object('session_id', p_session_id, 'terminated_by', auth.uid()));

  return v_session;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function terminate_user_session to authenticated;

-- ---- 0014_sandbox_provider.sql ----
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

-- ---- 0015_admin_roles.sql ----
-- Phase 9/section 69: Super Admin can assign roles to existing accounts
-- (promoting a client to an admin role, changing one admin role to another,
-- or demoting an admin back to client). Bundled with users.manage_status's
-- existing coverage of suspend/restore, this is the full "Admins & Roles"
-- admin surface without needing a separate admin-creation signup flow (which
-- would require the Auth Admin API and a service-role Edge Function).

create or replace function admin_set_user_role(p_user_id uuid, p_role role_name)
returns profiles as $$
declare
  v_profile profiles%rowtype;
begin
  if not has_permission('roles.manage') then
    raise exception 'not authorized to change roles';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set role = p_role where id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception 'user not found';
  end if;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'role_changed', 'admins', p_user_id::text, p_role::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_profile;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function admin_set_user_role to authenticated;

commit;
