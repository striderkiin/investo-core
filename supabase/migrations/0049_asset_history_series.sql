-- Evenly spaced chart points for a simulated market, like
-- market_history_series does for the Platform Index. The chart used to load
-- only the latest 300 ticks (about 5 hours at one tick a minute), so the
-- month and year tabs showed a few hours.

create or replace function public.asset_history_series(p_asset_id uuid, p_days integer, p_points integer default 120)
 returns table (recorded_at timestamptz, value numeric)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with bounds as (
    select now() - make_interval(days => least(greatest(p_days, 1), 730)) as s, now() as e
  ), steps as (
    select b.s + (b.e - b.s) * (g.i::double precision / (least(greatest(p_points, 2), 500) - 1)) as t
    from bounds b, generate_series(0, least(greatest(p_points, 2), 500) - 1) as g(i)
  )
  select st.t, (select h.value from market_provider_history h
                where h.asset_id = p_asset_id and h.recorded_at <= st.t
                order by h.recorded_at desc limit 1)
  from steps st
  where exists (select 1 from market_assets a where a.id = p_asset_id and a.enabled)
  order by st.t;
$function$;

grant execute on function public.asset_history_series(uuid, integer, integer) to anon, authenticated;

create index if not exists idx_market_provider_history_asset_time on market_provider_history (asset_id, recorded_at desc);
