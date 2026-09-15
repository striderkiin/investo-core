-- Lets admins configure the real crypto address their payment provider
-- receives client deposits at, per currency/network/environment — the
-- same (currency, network) pairs already used by deposit.ts/withdraw.ts
-- (BTC/Bitcoin, ETH/ERC20, USDT/ERC20, USDT/TRC20). Until now, every
-- deposit showed a fake per-transaction address generated client-side
-- (DemoPaymentProvider/SandboxPaymentProvider) with no admin involvement
-- at all. Reuses the existing 'integrations.manage' permission rather
-- than inventing a new one, since this is the same "how we receive
-- client payments" concern as the Integrations Center's payment
-- provider type.

create table deposit_addresses (
  id uuid primary key default gen_random_uuid(),
  currency text not null,
  network text not null,
  environment text not null,
  address text not null,
  is_active boolean not null default true,
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (currency, network, environment)
);

alter table deposit_addresses enable row level security;
-- Intentionally no policies for direct table access — reachable only
-- through the security-definer functions below, same as integration_secrets.

create trigger trg_deposit_addresses_updated_at
  before update on deposit_addresses
  for each row execute function set_updated_at();

-- The exact destination address shown for a given deposit, captured at
-- creation time for an audit trail — mirrors withdrawals.destination,
-- which already records the client's own address the same way.
alter table deposits add column destination_address text;

-- Any authenticated user creating a deposit needs this — it's the
-- address they're being asked to pay, not admin-sensitive information.
create or replace function get_deposit_address(p_currency text, p_network text, p_environment text)
returns text as $$
  select address from deposit_addresses
  where currency = p_currency and network = p_network and environment = p_environment and is_active
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function get_deposit_address to authenticated;

create or replace function admin_list_deposit_addresses(p_environment text)
returns setof deposit_addresses as $$
begin
  if not has_permission('integrations.manage') then
    raise exception 'not authorized to view deposit addresses';
  end if;

  return query select * from deposit_addresses where environment = p_environment order by currency, network;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function admin_set_deposit_address(
  p_currency text,
  p_network text,
  p_environment text,
  p_address text,
  p_is_active boolean default true
)
returns deposit_addresses as $$
declare
  v_result deposit_addresses%rowtype;
begin
  if not has_permission('integrations.manage') then
    raise exception 'not authorized to manage deposit addresses';
  end if;

  if p_address is null or length(trim(p_address)) = 0 then
    raise exception 'address is required';
  end if;

  insert into deposit_addresses (currency, network, environment, address, is_active, updated_by)
  values (p_currency, p_network, p_environment, trim(p_address), p_is_active, auth.uid())
  on conflict (currency, network, environment) do update
    set address = excluded.address,
        is_active = excluded.is_active,
        updated_by = excluded.updated_by,
        updated_at = now()
  returning * into v_result;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'deposit_address_updated', 'integrations', p_currency || '/' || p_network, p_address, p_environment);

  return v_result;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function admin_list_deposit_addresses to authenticated;
grant execute on function admin_set_deposit_address to authenticated;

-- Both deposit-creation RPCs now resolve the admin-configured address for
-- their own provider identity and stamp it onto the deposit row. p_environment
-- defaults to each provider's own fixed identity (matching deposits.provider)
-- rather than the 4-value AppEnvironment, since Demo/Sandbox providers each
-- represent one payment identity regardless of which AppEnvironment invoked
-- them. Falls back to null (frontend keeps its old fake-address fallback)
-- when the admin hasn't configured that pair yet, so nothing breaks.
create or replace function create_demo_deposit(p_amount numeric, p_currency text, p_network text, p_environment text default 'demo')
returns deposits as $$
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
    where currency = p_currency and network = p_network and environment = p_environment and is_active
    limit 1;

  insert into deposits (user_id, amount, currency, network, provider, provider_reference, status, destination_address)
  values (auth.uid(), p_amount, p_currency, p_network, 'demo', 'DEMO-' || gen_random_uuid(), 'pending', v_address)
  returning * into v_deposit;

  return v_deposit;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function create_sandbox_deposit(p_amount numeric, p_currency text, p_network text, p_environment text default 'sandbox')
returns deposits as $$
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
    where currency = p_currency and network = p_network and environment = p_environment and is_active
    limit 1;

  insert into deposits (user_id, amount, currency, network, provider, provider_reference, status, destination_address)
  values (auth.uid(), p_amount, p_currency, p_network, 'sandbox', 'SANDBOX-' || gen_random_uuid(), 'pending', v_address)
  returning * into v_deposit;

  return v_deposit;
end;
$$ language plpgsql security definer set search_path = public;
