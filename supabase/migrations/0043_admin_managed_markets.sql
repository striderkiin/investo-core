-- Lets admins choose which markets customers see: add any CoinGecko coin
-- (live price) or a simulated pair with a starting price, switch markets
-- on and off, reorder and remove them. Prices get more decimal places so
-- low-priced coins (e.g. 0.00001) aren't rounded to zero.

-- effective_price is generated from the two columns being widened, so it
-- is dropped and re-added around the type change.
alter table market_provider_state drop column effective_price;
alter table market_provider_state
  alter column provider_price type numeric(30,10),
  alter column manual_offset type numeric(30,10),
  alter column min_movement type numeric(30,10),
  alter column max_movement type numeric(30,10);
alter table market_provider_state
  add column effective_price numeric(30,10) generated always as (provider_price + manual_offset) stored;

alter table market_provider_history alter column value type numeric(30,10);
alter table market_override_history
  alter column input_value type numeric(30,10),
  alter column previous_offset type numeric(30,10),
  alter column new_offset type numeric(30,10),
  alter column previous_effective_price type numeric(30,10),
  alter column new_effective_price type numeric(30,10);

create or replace function public.admin_add_market_asset(
  p_symbol text,
  p_display_name text,
  p_price_source text,
  p_coingecko_id text,
  p_start_price numeric
)
 returns market_assets
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_asset market_assets%rowtype;
  v_symbol text := upper(trim(p_symbol));
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage markets';
  end if;
  if v_symbol = '' or length(v_symbol) > 20 then
    raise exception 'enter a symbol, e.g. SOL/USD';
  end if;
  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'enter a name';
  end if;
  if p_price_source not in ('live', 'simulated') then
    raise exception 'price source must be live or simulated';
  end if;
  if p_price_source = 'live' and coalesce(trim(p_coingecko_id), '') = '' then
    raise exception 'choose the coin to follow';
  end if;
  if p_start_price is null or p_start_price <= 0 then
    raise exception 'starting price must be above zero';
  end if;
  if exists (select 1 from market_assets where symbol = v_symbol) then
    raise exception 'a market with symbol % already exists', v_symbol;
  end if;

  insert into market_assets (symbol, display_name, enabled, sort_order, price_source, coingecko_id)
  values (v_symbol, trim(p_display_name), true,
          coalesce((select max(sort_order) from market_assets), 0) + 1,
          p_price_source, nullif(trim(p_coingecko_id), ''))
  returning * into v_asset;

  -- Simulated markets random-walk by 0.05%-0.2% of their price per tick.
  insert into market_provider_state (asset_id, provider_price, min_movement, max_movement)
  values (v_asset.id, p_start_price, p_start_price * 0.0005, p_start_price * 0.002);

  insert into market_provider_history (asset_id, value, is_manual) values (v_asset.id, p_start_price, false);

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'market_asset_added', 'market', v_asset.symbol,
          jsonb_build_object('source', p_price_source, 'coingecko_id', p_coingecko_id, 'start_price', p_start_price)::text,
          coalesce(current_setting('app.environment', true), 'development'));
  return v_asset;
end;
$function$;

create or replace function public.admin_update_market_asset(p_asset_id uuid, p_enabled boolean, p_display_name text, p_sort_order integer)
 returns market_assets
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_before market_assets%rowtype;
  v_asset market_assets%rowtype;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage markets';
  end if;
  select * into v_before from market_assets where id = p_asset_id;
  if not found then
    raise exception 'market not found';
  end if;

  update market_assets
  set enabled = coalesce(p_enabled, enabled),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      sort_order = coalesce(p_sort_order, sort_order)
  where id = p_asset_id
  returning * into v_asset;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'market_asset_updated', 'market', v_asset.symbol,
          jsonb_build_object('enabled', v_before.enabled, 'name', v_before.display_name, 'order', v_before.sort_order)::text,
          jsonb_build_object('enabled', v_asset.enabled, 'name', v_asset.display_name, 'order', v_asset.sort_order)::text,
          coalesce(current_setting('app.environment', true), 'development'));
  return v_asset;
end;
$function$;

create or replace function public.admin_remove_market_asset(p_asset_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_asset market_assets%rowtype;
begin
  if not has_permission('market.manage') then
    raise exception 'not authorized to manage markets';
  end if;
  delete from market_assets where id = p_asset_id returning * into v_asset;
  if not found then
    raise exception 'market not found';
  end if;
  insert into admin_audit_logs (admin_id, action, module, target, previous_value, environment)
  values (auth.uid(), 'market_asset_removed', 'market', v_asset.symbol,
          jsonb_build_object('source', v_asset.price_source, 'coingecko_id', v_asset.coingecko_id)::text,
          coalesce(current_setting('app.environment', true), 'development'));
end;
$function$;

revoke all on function public.admin_add_market_asset(text, text, text, text, numeric) from public, anon;
revoke all on function public.admin_update_market_asset(uuid, boolean, text, integer) from public, anon;
revoke all on function public.admin_remove_market_asset(uuid) from public, anon;
grant execute on function public.admin_add_market_asset(text, text, text, text, numeric) to authenticated;
grant execute on function public.admin_update_market_asset(uuid, boolean, text, integer) to authenticated;
grant execute on function public.admin_remove_market_asset(uuid) to authenticated;
