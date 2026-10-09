-- Platform Index: the manual-control switches now decide what the 5-minute
-- tick uses, and the 24h change is real.
--
-- Before this, platform_index_tick() used the trend, volatility and movement
-- settings whether or not their switch was on, and it overwrote the 24h
-- change with the change since the starting value, so the admin's 24h
-- change control had no effect.
--
-- Now, in manual mode:
--   Value switch on      the index wobbles around the value the admin set.
--   Value switch off     the index moves freely from where it is.
--   Trend switch off     no up or down drift (stable).
--   Volatility off       medium volatility.
--   Movement off         medium strength (3).
--   24h change on        the admin's number is shown and kept.
-- Otherwise the 24h change is the real change from the value 24 hours ago.

create or replace function public.platform_index_tick()
 returns market_settings
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  s market_settings%rowtype;
  v_manual boolean;
  v_trend market_trend;
  v_volatility text;
  v_strength integer;
  v_vol double precision;
  v_drift double precision := 0;
  v_dir double precision := 0;
  v_anchor numeric;
  v_new numeric;
  v_day_ago numeric;
  v_change numeric;
begin
  select * into s from market_settings limit 1 for update;
  if not found then
    return null;
  end if;

  v_manual := s.mode = 'manual' and s.manual_control_enabled;
  v_trend := case when v_manual and s.trend_control_enabled then s.current_trend else 'stable'::market_trend end;
  v_volatility := case when not v_manual or s.volatility_control_enabled then s.current_volatility::text else 'medium' end;
  v_strength := case when not v_manual or s.movement_control_enabled then s.movement_strength else 3 end;

  -- Share of the value one 5-minute step moves by (one standard deviation).
  v_vol := case v_volatility when 'low' then 0.0004 when 'high' then 0.0018 when 'extreme' then 0.0035 else 0.0009 end
           * (0.6 + 0.2 * (v_strength - 1));

  if not v_manual then
    if s.automatic_behavior = 'stable' then v_vol := v_vol * 0.4;
    elsif s.automatic_behavior = 'volatile' then v_vol := v_vol * 2.5;
    end if;
    v_drift := case s.automatic_behavior when 'upward' then v_vol * 0.12 when 'downward' then -v_vol * 0.12 else 0 end;
    v_new := s.current_market_value * (1 + v_drift + v_vol * random_normal());
    v_anchor := v_new;
  else
    v_dir := case v_trend when 'bullish' then 1 when 'bearish' then -1 else 0 end;
    if s.market_value_control_enabled then
      -- Wobble around the admin's value; the anchor drifts with the trend.
      v_anchor := coalesce(s.manual_anchor, s.current_market_value) * (1 + v_dir * v_vol * 0.12);
      v_new := s.current_market_value + 0.25 * (v_anchor - s.current_market_value)
               + s.current_market_value * v_vol * random_normal();
    else
      v_new := s.current_market_value * (1 + v_dir * v_vol * 0.12 + v_vol * random_normal());
      v_anchor := v_new;
    end if;
  end if;

  v_new := round(greatest(v_new, 0.01), 2);

  if v_manual and s.percentage_control_enabled then
    v_change := s.current_percentage_change;
  else
    select d.value into v_day_ago from market_data d
    where d.recorded_at <= now() - interval '24 hours'
    order by d.recorded_at desc limit 1;
    v_change := round((v_new / nullif(coalesce(v_day_ago, s.starting_value), 0) - 1) * 100, 4);
  end if;

  perform set_config('app.market_tick', 'on', true);
  update market_settings
  set current_market_value = v_new,
      manual_anchor = round(v_anchor, 2),
      current_percentage_change = coalesce(v_change, 0),
      current_trend = case when v_manual
                           then current_trend
                           else (case when v_new > s.current_market_value then 'bullish' when v_new < s.current_market_value then 'bearish' else 'stable' end)::market_trend end
  where id = s.id
  returning * into s;
  perform set_config('app.market_tick', 'off', true);

  insert into market_data (value, percentage_change, trend, is_manual)
  values (s.current_market_value, s.current_percentage_change, s.current_trend, v_manual);

  return s;
end;
$function$;

revoke all on function public.platform_index_tick() from public, anon, authenticated;
