-- Wires the Live Provider system (0017) to genuinely real prices instead
-- of a random walk, for the assets a free, no-key data source actually
-- covers: crypto majors directly, and gold via a gold-backed token (same
-- CoinGecko-based approach as the client dashboard's Market Overview
-- widget, src/services/market/externalMarketService.ts). Admin's manual
-- override (manual_offset) design already overlays cleanly on top of
-- whatever provider_price is — effective_price = provider_price +
-- manual_offset — so nothing about how admins adjust prices changes, only
-- what "live" now means for these three assets.

alter table market_assets
  add column price_source text not null default 'simulated' check (price_source in ('simulated', 'live')),
  add column coingecko_id text;

-- Swap the seeded Tether/USD (a stablecoin pinned near $1 — nothing
-- interesting for an admin to watch move) for Gold, matching the same
-- three markets already offered to clients on the dashboard.
update market_assets
  set symbol = 'XAU/USD', display_name = 'Gold', coingecko_id = 'pax-gold', price_source = 'live'
  where symbol = 'USDT/USD';
update market_assets set coingecko_id = 'bitcoin', price_source = 'live' where symbol = 'BTC/USD';
update market_assets set coingecko_id = 'ethereum', price_source = 'live' where symbol = 'ETH/USD';

-- market_provider_tick() (0017) now skips any 'live' asset — a future
-- admin-added asset without a real data source still defaults to
-- 'simulated' and keeps random-walking exactly as before.
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
    if not v_asset.enabled or v_asset.price_source = 'live' then
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

-- Called only by the market-price-sync Edge Function (service_role) after
-- fetching a real quote from CoinGecko — sets provider_price directly,
-- exactly like a tick would, just with a real number instead of a random
-- one. manual_offset is left untouched, same overlay guarantee tick() has
-- always made.
create or replace function market_provider_sync_price(p_asset_id uuid, p_price numeric)
returns market_provider_state as $$
declare
  v_row market_provider_state%rowtype;
begin
  update market_provider_state
  set provider_price = p_price
  where asset_id = p_asset_id
  returning * into v_row;

  if not found then
    raise exception 'unknown asset_id';
  end if;

  insert into market_provider_history (asset_id, value, is_manual)
  values (p_asset_id, v_row.effective_price, false);

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function market_provider_sync_price(uuid, numeric) from public, anon, authenticated;
grant execute on function market_provider_sync_price(uuid, numeric) to service_role;

-- Heartbeat for the market-price-sync Edge Function, same pg_cron +
-- pg_net pattern Supabase's own docs use for cron-triggered functions.
-- Every 5 minutes is comfortably inside CoinGecko's free-tier rate limit
-- for a single server-side caller (unlike the client-side Market Overview
-- widget, which calls CoinGecko directly per visitor). The bearer token
-- here is the project's anon key — not a secret, it already ships in the
-- deployed client bundle; the Edge Function does its actual privileged
-- writes with its own service-role key from its runtime environment, not
-- from anything the caller supplies.
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'market-price-sync',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://vjmeictnpkgbztnawjun.supabase.co/functions/v1/market-price-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbWVpY3RucGtnYnp0bmF3anVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MjY3ODksImV4cCI6MjEwNDQwMjc4OX0.sCdO1c5Q8XqGPCJjIYHERZ_7uMDWS37xso2U8CjykLs'
    ),
    body := '{}'::jsonb
  );
  $$
);
