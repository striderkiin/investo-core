-- Platform Index: moves on the server every 5 minutes, also in manual mode.
--
-- Before this, the index only moved while someone had a page open (the
-- browser called advance_market_automatic), so days with no visitors were
-- empty and the chart jumped (for example from the 11th to the 29th). Each
-- move was also a few cents on a ~$42,000 value, so the line looked flat.
--
-- platform_index_tick() (pg_cron, every 5 minutes):
--   automatic: random walk sized by volatility and movement strength, with a
--              drift for the upward / downward behaviours.
--   manual:    the value the admin set is an anchor. The index wobbles around
--              it and the anchor drifts slowly with the admin's trend
--              (bullish up, bearish down), so the chart never goes flat.
-- Admin changes to current_market_value move the anchor (trigger below).
--
-- market_history_series() returns evenly spaced points for the chart, so a
-- week, month or year always spans the whole period.

alter table market_settings add column if not exists manual_anchor numeric(18,2);
update market_settings set manual_anchor = current_market_value where manual_anchor is null;

-- Any change to the value that is not a tick comes from an admin: it becomes the new anchor.
create or replace function public.market_settings_track_anchor()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if new.current_market_value is distinct from old.current_market_value
     and coalesce(current_setting('app.market_tick', true), '') <> 'on' then
    new.manual_anchor := new.current_market_value;
  end if;
  return new;
end;
$function$;

create or replace trigger trg_market_settings_anchor before update on market_settings
  for each row execute function public.market_settings_track_anchor();

-- Roughly normal random number (mean 0, standard deviation 1).
create or replace function public.random_normal()
 returns double precision
 language sql
 volatile
as $function$
  select (random() + random() + random() + random() + random() + random() - 3.0) * sqrt(2.0);
$function$;

create or replace function public.platform_index_tick()
 returns market_settings
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  s market_settings%rowtype;
  v_vol double precision;
  v_drift double precision := 0;
  v_dir double precision := 0;
  v_anchor numeric;
  v_new numeric;
begin
  select * into s from market_settings limit 1 for update;
  if not found then
    return null;
  end if;

  -- Share of the value one 5-minute step moves by (one standard deviation).
  v_vol := case s.current_volatility when 'low' then 0.0004 when 'high' then 0.0018 when 'extreme' then 0.0035 else 0.0009 end
           * (0.6 + 0.2 * (s.movement_strength - 1));

  if s.mode = 'automatic' then
    if s.automatic_behavior = 'stable' then v_vol := v_vol * 0.4;
    elsif s.automatic_behavior = 'volatile' then v_vol := v_vol * 2.5;
    end if;
    v_drift := case s.automatic_behavior when 'upward' then v_vol * 0.12 when 'downward' then -v_vol * 0.12 else 0 end;
    v_new := s.current_market_value * (1 + v_drift + v_vol * random_normal());
    v_anchor := v_new;
  else
    v_dir := case s.current_trend when 'bullish' then 1 when 'bearish' then -1 else 0 end;
    v_anchor := coalesce(s.manual_anchor, s.current_market_value) * (1 + v_dir * v_vol * 0.12);
    -- Pulled back towards the anchor, plus noise.
    v_new := s.current_market_value + 0.25 * (v_anchor - s.current_market_value)
             + s.current_market_value * v_vol * random_normal();
  end if;

  v_new := round(greatest(v_new, 0.01), 2);

  perform set_config('app.market_tick', 'on', true);
  update market_settings
  set current_market_value = v_new,
      manual_anchor = round(v_anchor, 2),
      current_percentage_change = round((v_new / nullif(starting_value, 0) - 1) * 100, 4),
      current_trend = case when s.mode = 'automatic'
                           then (case when v_new > s.current_market_value then 'bullish' when v_new < s.current_market_value then 'bearish' else 'stable' end)::market_trend
                           else current_trend end
  where id = s.id
  returning * into s;
  perform set_config('app.market_tick', 'off', true);

  insert into market_data (value, percentage_change, trend, is_manual)
  values (s.current_market_value, s.current_percentage_change, s.current_trend, false);

  return s;
end;
$function$;

revoke all on function public.platform_index_tick() from public, anon, authenticated;

-- The browser no longer drives the index; keep the old entry point harmless.
create or replace function public.advance_market_automatic()
 returns market_settings
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select * from market_settings limit 1;
$function$;

-- Evenly spaced chart points: the last recorded value at or before each step.
create or replace function public.market_history_series(p_days integer, p_points integer default 120)
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
  select st.t, (select d.value from market_data d where d.recorded_at <= st.t order by d.recorded_at desc limit 1)
  from steps st
  order by st.t;
$function$;

grant execute on function public.market_history_series(integer, integer) to anon, authenticated;

create index if not exists idx_market_data_recorded_at on market_data (recorded_at desc);

select cron.schedule('platform-index-tick', '*/5 * * * *', $$select public.platform_index_tick();$$);

-- One-time: fill the empty stretches of the last year with movement that
-- joins the recorded points, so the history has no flat gaps. Every 30
-- minutes for the last 30 days, every 6 hours before that.
do $$
declare
  v_start timestamptz := now() - interval '365 days';
  v_first market_data%rowtype;
  v_current numeric;
  v_base numeric;
  r record;
  v_step interval;
  v_n integer;
  v_sigma double precision;
  v_walk double precision[];
  v_i integer;
  v_t timestamptz;
  v_val double precision;
begin
  select * into v_first from market_data order by recorded_at asc limit 1;
  if not found then
    return;
  end if;
  select current_market_value, starting_value into v_current, v_base from market_settings limit 1;

  -- Gaps between recorded points, plus the stretch before the first point
  -- (ends at the first value) and after the last one (ends at today's value).
  for r in
    with pts as (
      select recorded_at as t, value::double precision as v from market_data
      union all select v_start, null
      union all select now(), v_current::double precision
    ), ordered as (
      select t, v, lead(t) over (order by t) as t1, lead(v) over (order by t) as v1 from pts
    )
    select * from ordered where t1 is not null and t1 - t > interval '45 minutes'
  loop
    -- Fine steps only for gaps that start inside the last 30 days.
    v_step := case when r.t > now() - interval '30 days' then interval '30 minutes' else interval '6 hours' end;
    v_n := floor(extract(epoch from (r.t1 - r.t)) / extract(epoch from v_step))::integer - 1;
    if v_n < 1 then
      continue;
    end if;
    v_sigma := case when v_step = interval '30 minutes' then 0.0016 else 0.0055 end;

    -- Random walk, then pinned to zero at both ends (bridge).
    v_walk := array[0::double precision];
    for v_i in 1..v_n + 1 loop
      v_walk := v_walk || (v_walk[v_i] + random_normal() * v_sigma);
    end loop;

    for v_i in 1..v_n loop
      v_t := r.t + v_step * v_i;
      if r.v is null then
        -- Before the first recorded point: walk backwards from it.
        -- About 8% lower a year back, rising to the first recorded value.
        v_val := r.v1 * (1 - 0.08 * (1 - v_i::double precision / (v_n + 1)))
                 * (1 + 0.5 * (v_walk[v_i + 1] - v_walk[v_n + 2] * v_i / (v_n + 1)));
      else
        v_val := (r.v + (r.v1 - r.v) * v_i / (v_n + 1))
                 * (1 + v_walk[v_i + 1] - v_walk[v_n + 2] * v_i / (v_n + 1));
      end if;
      insert into market_data (value, percentage_change, trend, is_manual, recorded_at)
      values (round(v_val::numeric, 2), round((v_val::numeric / nullif(v_base, 0) - 1) * 100, 4), 'stable', false, v_t);
    end loop;
  end loop;
end $$;
