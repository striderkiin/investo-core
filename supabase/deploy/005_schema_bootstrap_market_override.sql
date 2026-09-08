-- ==================================================================
-- INVESTO CORE SUITE — incremental schema bootstrap for the Live
-- Provider + Manual Override market architecture (migration 0017).
-- Run this AFTER 001, 003, and 004 have already been applied to your
-- project. Paste this ENTIRE file into the Supabase SQL Editor and
-- click Run.
-- ==================================================================

begin;

-- Post-build correction: Live Provider + Manual Override market architecture.
--
-- This is ADDITIVE to the existing market_settings/market_data/marketEngine
-- system (spec section 93's acceptance scenarios keep passing unmodified —
-- that system remains the "automatic vs. manual chart simulation" toggle it
-- always was). What was missing, per the correction spec, is a concept of a
-- continuously-running "Live Provider" price that a manual admin adjustment
-- OVERLAYS on top of rather than replaces, for one or more assets:
--
--   effectivePrice = providerPrice + manualOffset
--
-- providerPrice always keeps advancing (market_provider_tick, called on every
-- heartbeat regardless of anything else). manualOffset is a separate,
-- independently-persisted value that fixed/percentage/direct-entry
-- adjustments change; it is never folded into providerPrice, so a live
-- provider tick can never "corrupt" or lose an active override, and an
-- admin's override never has to fight or disable ticking to be visible.

create table market_assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  display_name text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table market_provider_state (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references market_assets(id) on delete cascade,
  provider_price numeric(18,2) not null,
  manual_offset numeric(18,2) not null default 0,
  effective_price numeric(18,2) generated always as (provider_price + manual_offset) stored,
  manual_increase_enabled boolean not null default true,
  manual_decrease_enabled boolean not null default true,
  direct_value_entry_enabled boolean not null default true,
  percentage_adjustment_enabled boolean not null default true,
  automatic_behavior automatic_market_behavior not null default 'stable',
  min_movement numeric(10,4) not null default 5,
  max_movement numeric(10,4) not null default 40,
  updated_at timestamptz not null default now()
);

create trigger trg_market_provider_state_updated_at
  before update on market_provider_state
  for each row execute function set_updated_at();

create table market_provider_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references market_assets(id) on delete cascade,
  value numeric(18,2) not null,
  is_manual boolean not null default false,
  recorded_at timestamptz not null default now()
);

create index idx_market_provider_history_asset_recorded on market_provider_history(asset_id, recorded_at desc);

create table market_override_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references market_assets(id) on delete cascade,
  admin_id uuid references profiles(id) on delete set null,
  adjustment_type text not null check (adjustment_type in ('fixed', 'percentage', 'direct', 'undo', 'reset', 'reset_all')),
  direction text not null check (direction in ('increase', 'decrease', 'set')),
  input_value numeric(18,4),
  previous_offset numeric(18,2) not null,
  new_offset numeric(18,2) not null,
  previous_effective_price numeric(18,2) not null,
  new_effective_price numeric(18,2) not null,
  undone boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_market_override_history_asset_created on market_override_history(asset_id, created_at desc);

-- Seed three default assets, mirroring the spec's own worked example (BTC
-- provider $66,980) plus two more to exercise the multi-asset requirement.
insert into market_assets (symbol, display_name, sort_order) values
  ('BTC/USD', 'Bitcoin', 1),
  ('ETH/USD', 'Ethereum', 2),
  ('USDT/USD', 'Tether', 3);

insert into market_provider_state (asset_id, provider_price, min_movement, max_movement)
select id, case symbol when 'BTC/USD' then 66980.00 when 'ETH/USD' then 3450.00 else 1.00 end,
       case symbol when 'USDT/USD' then 0.0005 else 5 end,
       case symbol when 'USDT/USD' then 0.002 else 40 end
from market_assets;

-- RLS: everyone can read (the chart is public, same as market_settings);
-- every mutation goes through a security-definer RPC below, so no
-- authenticated/anon write policy exists at all for market_provider_state or
-- market_override_history — mirrors the integration_secrets lockdown pattern.
alter table market_assets enable row level security;
alter table market_provider_state enable row level security;
alter table market_provider_history enable row level security;
alter table market_override_history enable row level security;

create policy "market assets are publicly readable" on market_assets for select using (true);
create policy "market assets managed by permission" on market_assets for all
  using (has_permission('market.manage')) with check (has_permission('market.manage'));

create policy "market provider state is publicly readable" on market_provider_state for select using (true);
create policy "market provider history is publicly readable" on market_provider_history for select using (true);
create policy "market override history readable by market.read" on market_override_history for select
  using (has_permission('market.read'));

-- ---------------------------------------------------------------------
-- Live Provider heartbeat. Always advances every enabled asset's
-- provider_price — unlike advance_market_automatic() (which freezes
-- current_market_value while mode = 'manual'), this never stops, satisfying
-- "do not disconnect or pause the provider because an override is active."
-- manual_offset is untouched, so effective_price recalculates automatically.
-- ---------------------------------------------------------------------
create or replace function market_provider_tick()
returns setof market_provider_state as $$
declare
  v_row market_provider_state%rowtype;
  v_asset market_assets%rowtype;
  v_direction numeric;
  v_change numeric;
begin
  for v_row in select * from market_provider_state for update loop
    select * into v_asset from market_assets where id = v_row.asset_id;
    if not v_asset.enabled then
      continue;
    end if;

    v_direction := case v_row.automatic_behavior
      when 'upward' then 1
      when 'downward' then -1
      when 'volatile' then (case when random() < 0.5 then -1 else 1 end)
      when 'random' then (case when random() < 0.5 then -1 else 1 end)
      else (case when random() < 0.5 then -1 else 1 end) * 0.2
    end;

    v_change := v_direction * (v_row.min_movement + random() * (v_row.max_movement - v_row.min_movement));
    if v_row.automatic_behavior = 'volatile' then
      v_change := v_change * 3;
    end if;

    update market_provider_state
    set provider_price = greatest(0, round(provider_price + v_change, 4))
    where id = v_row.id
    returning * into v_row;

    insert into market_provider_history (asset_id, value, is_manual)
    values (v_row.asset_id, v_row.effective_price, false);
  end loop;

  return query select * from market_provider_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_provider_tick to authenticated;

-- ---------------------------------------------------------------------
-- Manual override RPCs. Every one requires market.manage, records an
-- override_history row (the undo stack) and an admin_audit_logs row (module
-- 'market_override' — administrative events, never mixed with financial
-- transactions per spec item 18), and inserts a market_provider_history
-- point so the chart reflects the change immediately.
-- ---------------------------------------------------------------------

create or replace function market_apply_fixed_adjustment(p_asset_id uuid, p_direction text, p_amount numeric)
returns market_provider_state as $$
declare
  v_state market_provider_state%rowtype;
  v_delta numeric;
  v_new_offset numeric;
  v_old_effective numeric;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage market controls';
  end if;
  if p_direction not in ('increase', 'decrease') then
    raise exception 'invalid direction: %', p_direction;
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select * into v_state from market_provider_state where asset_id = p_asset_id for update;
  if not found then
    raise exception 'unknown market asset';
  end if;

  if p_direction = 'increase' and not v_state.manual_increase_enabled then
    raise exception 'manual increase is disabled for this asset';
  end if;
  if p_direction = 'decrease' and not v_state.manual_decrease_enabled then
    raise exception 'manual decrease is disabled for this asset';
  end if;

  v_old_effective := v_state.effective_price;
  v_delta := case when p_direction = 'increase' then p_amount else -p_amount end;
  v_new_offset := v_state.manual_offset + v_delta;

  insert into market_override_history (asset_id, admin_id, adjustment_type, direction, input_value, previous_offset, new_offset, previous_effective_price, new_effective_price)
  values (p_asset_id, auth.uid(), 'fixed', p_direction, p_amount, v_state.manual_offset, v_new_offset, v_old_effective, v_state.provider_price + v_new_offset);

  update market_provider_state set manual_offset = v_new_offset where asset_id = p_asset_id returning * into v_state;
  insert into market_provider_history (asset_id, value, is_manual) values (p_asset_id, v_state.effective_price, true);

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'fixed_' || p_direction, 'market_override', (select symbol from market_assets where id = p_asset_id),
    v_old_effective::text, v_state.effective_price::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_apply_fixed_adjustment to authenticated;

create or replace function market_apply_percentage_adjustment(p_asset_id uuid, p_direction text, p_percent numeric)
returns market_provider_state as $$
declare
  v_state market_provider_state%rowtype;
  v_delta numeric;
  v_new_offset numeric;
  v_old_effective numeric;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage market controls';
  end if;
  if p_direction not in ('increase', 'decrease') then
    raise exception 'invalid direction: %', p_direction;
  end if;
  if p_percent is null or p_percent <= 0 then
    raise exception 'percent must be positive';
  end if;

  select * into v_state from market_provider_state where asset_id = p_asset_id for update;
  if not found then
    raise exception 'unknown market asset';
  end if;
  if not v_state.percentage_adjustment_enabled then
    raise exception 'percentage adjustment is disabled for this asset';
  end if;

  v_old_effective := v_state.effective_price;
  v_delta := (case when p_direction = 'increase' then 1 else -1 end) * v_state.effective_price * p_percent / 100;
  v_new_offset := v_state.manual_offset + v_delta;

  insert into market_override_history (asset_id, admin_id, adjustment_type, direction, input_value, previous_offset, new_offset, previous_effective_price, new_effective_price)
  values (p_asset_id, auth.uid(), 'percentage', p_direction, p_percent, v_state.manual_offset, v_new_offset, v_old_effective, v_state.provider_price + v_new_offset);

  update market_provider_state set manual_offset = v_new_offset where asset_id = p_asset_id returning * into v_state;
  insert into market_provider_history (asset_id, value, is_manual) values (p_asset_id, v_state.effective_price, true);

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'percentage_' || p_direction, 'market_override', (select symbol from market_assets where id = p_asset_id),
    v_old_effective::text, v_state.effective_price::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_apply_percentage_adjustment to authenticated;

create or replace function market_set_direct_price(p_asset_id uuid, p_target_price numeric)
returns market_provider_state as $$
declare
  v_state market_provider_state%rowtype;
  v_new_offset numeric;
  v_old_effective numeric;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage market controls';
  end if;
  if p_target_price is null or p_target_price < 0 then
    raise exception 'invalid target price';
  end if;

  select * into v_state from market_provider_state where asset_id = p_asset_id for update;
  if not found then
    raise exception 'unknown market asset';
  end if;
  if not v_state.direct_value_entry_enabled then
    raise exception 'direct value entry is disabled for this asset';
  end if;

  v_old_effective := v_state.effective_price;
  v_new_offset := p_target_price - v_state.provider_price;

  insert into market_override_history (asset_id, admin_id, adjustment_type, direction, input_value, previous_offset, new_offset, previous_effective_price, new_effective_price)
  values (p_asset_id, auth.uid(), 'direct', 'set', p_target_price, v_state.manual_offset, v_new_offset, v_old_effective, p_target_price);

  update market_provider_state set manual_offset = v_new_offset where asset_id = p_asset_id returning * into v_state;
  insert into market_provider_history (asset_id, value, is_manual) values (p_asset_id, v_state.effective_price, true);

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'set_direct_price', 'market_override', (select symbol from market_assets where id = p_asset_id),
    v_old_effective::text, p_target_price::text,
    coalesce(current_setting('app.environment', true), 'development'));

  return v_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_set_direct_price to authenticated;

create or replace function market_undo_last_override(p_asset_id uuid)
returns market_provider_state as $$
declare
  v_state market_provider_state%rowtype;
  v_last market_override_history%rowtype;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage market controls';
  end if;

  select * into v_state from market_provider_state where asset_id = p_asset_id for update;
  if not found then
    raise exception 'unknown market asset';
  end if;

  select * into v_last from market_override_history
  where asset_id = p_asset_id and undone = false and adjustment_type in ('fixed', 'percentage', 'direct')
  order by created_at desc limit 1 for update;
  if not found then
    raise exception 'no override to undo for this asset';
  end if;

  update market_override_history set undone = true where id = v_last.id;

  insert into market_override_history (asset_id, admin_id, adjustment_type, direction, input_value, previous_offset, new_offset, previous_effective_price, new_effective_price)
  values (p_asset_id, auth.uid(), 'undo', 'set', null, v_state.manual_offset, v_last.previous_offset, v_state.effective_price, v_state.provider_price + v_last.previous_offset);

  update market_provider_state set manual_offset = v_last.previous_offset where asset_id = p_asset_id returning * into v_state;
  insert into market_provider_history (asset_id, value, is_manual) values (p_asset_id, v_state.effective_price, true);

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'undo_last_override', 'market_override', (select symbol from market_assets where id = p_asset_id),
    v_last.new_effective_price::text, v_state.effective_price::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_undo_last_override to authenticated;

create or replace function market_reset_to_provider(p_asset_id uuid)
returns market_provider_state as $$
declare
  v_state market_provider_state%rowtype;
  v_old_effective numeric;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage market controls';
  end if;

  select * into v_state from market_provider_state where asset_id = p_asset_id for update;
  if not found then
    raise exception 'unknown market asset';
  end if;

  v_old_effective := v_state.effective_price;

  insert into market_override_history (asset_id, admin_id, adjustment_type, direction, input_value, previous_offset, new_offset, previous_effective_price, new_effective_price)
  values (p_asset_id, auth.uid(), 'reset', 'set', 0, v_state.manual_offset, 0, v_old_effective, v_state.provider_price);

  update market_provider_state set manual_offset = 0 where asset_id = p_asset_id returning * into v_state;
  insert into market_provider_history (asset_id, value, is_manual) values (p_asset_id, v_state.effective_price, true);

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'reset_to_live_price', 'market_override', (select symbol from market_assets where id = p_asset_id),
    v_old_effective::text, v_state.effective_price::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_reset_to_provider to authenticated;

create or replace function market_reset_all_overrides()
returns setof market_provider_state as $$
declare
  v_row market_provider_state%rowtype;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage market controls';
  end if;

  for v_row in select * from market_provider_state where manual_offset != 0 for update loop
    insert into market_override_history (asset_id, admin_id, adjustment_type, direction, input_value, previous_offset, new_offset, previous_effective_price, new_effective_price)
    values (v_row.asset_id, auth.uid(), 'reset_all', 'set', 0, v_row.manual_offset, 0, v_row.effective_price, v_row.provider_price);

    update market_provider_state set manual_offset = 0 where id = v_row.id;
    insert into market_provider_history (asset_id, value, is_manual) values (v_row.asset_id, v_row.provider_price, true);
  end loop;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'reset_all_overrides', 'market_override', 'all_assets', 'all overrides cleared', coalesce(current_setting('app.environment', true), 'development'));

  return query select * from market_provider_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_reset_all_overrides to authenticated;

create or replace function market_set_capability_toggle(p_asset_id uuid, p_key text, p_enabled boolean)
returns market_provider_state as $$
declare
  v_state market_provider_state%rowtype;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage market controls';
  end if;
  if p_key not in ('manual_increase_enabled', 'manual_decrease_enabled', 'direct_value_entry_enabled', 'percentage_adjustment_enabled') then
    raise exception 'invalid capability toggle: %', p_key;
  end if;

  if p_key = 'manual_increase_enabled' then
    update market_provider_state set manual_increase_enabled = p_enabled where asset_id = p_asset_id returning * into v_state;
  elsif p_key = 'manual_decrease_enabled' then
    update market_provider_state set manual_decrease_enabled = p_enabled where asset_id = p_asset_id returning * into v_state;
  elsif p_key = 'direct_value_entry_enabled' then
    update market_provider_state set direct_value_entry_enabled = p_enabled where asset_id = p_asset_id returning * into v_state;
  else
    update market_provider_state set percentage_adjustment_enabled = p_enabled where asset_id = p_asset_id returning * into v_state;
  end if;

  if not found then
    raise exception 'unknown market asset';
  end if;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'toggle_' || p_key, 'market_override', (select symbol from market_assets where id = p_asset_id), p_enabled::text,
    coalesce(current_setting('app.environment', true), 'development'));

  return v_state;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function market_set_capability_toggle to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['market_assets', 'market_provider_state', 'market_provider_history'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
