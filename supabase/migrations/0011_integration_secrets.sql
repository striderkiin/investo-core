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
