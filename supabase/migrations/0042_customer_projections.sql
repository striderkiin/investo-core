-- Per-customer chart projections. An admin can switch on a projection for
-- one customer's chart (Market Overview, Portfolio Composition or the market
-- widget) when that customer asks to see a scenario. The customer sees it
-- labeled "Projection"; balances, statements and withdrawals never read it.

create table if not exists public.customer_projections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chart text not null check (chart in ('market_overview', 'portfolio_composition', 'market_widget')),
  enabled boolean not null default false,
  -- replace: the projection is drawn instead of the chart's data.
  -- overlay: it continues the real line as a dashed second series.
  mode text not null default 'replace' check (mode in ('replace', 'overlay')),
  -- { amount, planId, asset, periodDays, targetReturnPct, curve, seed, note }
  params jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chart),
  -- The donut has no line to continue.
  check (not (chart = 'portfolio_composition' and mode = 'overlay'))
);

alter table public.customer_projections enable row level security;

drop policy if exists "customers read their live projections" on public.customer_projections;
create policy "customers read their live projections" on public.customer_projections
  for select to authenticated
  using ((user_id = auth.uid() and enabled) or has_permission('users.read'));

-- No direct writes: every change goes through admin_set_projection so it is
-- validated and audit-logged.

create or replace function public.admin_set_projection(
  p_user_id uuid,
  p_chart text,
  p_enabled boolean,
  p_mode text default 'replace',
  p_params jsonb default null
)
 returns customer_projections
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_before customer_projections%rowtype;
  v_row customer_projections%rowtype;
  v_params jsonb;
  v_days numeric;
  v_return numeric;
  v_amount numeric;
begin
  if not has_permission('users.write') then
    raise exception 'not authorized to manage projections';
  end if;

  if not exists (select 1 from profiles where id = p_user_id and role = 'client') then
    raise exception 'projections are only for customer accounts';
  end if;

  select * into v_before from customer_projections where user_id = p_user_id and chart = p_chart;
  v_params := coalesce(p_params, v_before.params, '{}'::jsonb);

  if p_enabled then
    v_days := (v_params->>'periodDays')::numeric;
    v_return := (v_params->>'targetReturnPct')::numeric;
    v_amount := (v_params->>'amount')::numeric;
    if v_days is null or v_days < 1 or v_days > 1825 then
      raise exception 'period must be between 1 and 1825 days';
    end if;
    if v_return is null or v_return < -95 or v_return > 1000 then
      raise exception 'target return must be between -95%% and 1000%%';
    end if;
    if coalesce(v_params->>'curve', 'steady') not in ('steady', 'volatile') then
      raise exception 'curve must be steady or volatile';
    end if;
    if p_chart = 'portfolio_composition' and (v_amount is null or v_amount <= 0) then
      raise exception 'enter the amount to project';
    end if;
  end if;

  insert into customer_projections (user_id, chart, enabled, mode, params, updated_by, updated_at)
  values (p_user_id, p_chart, p_enabled, coalesce(p_mode, 'replace'), v_params, auth.uid(), now())
  on conflict (user_id, chart) do update
    set enabled = excluded.enabled,
        mode = excluded.mode,
        params = excluded.params,
        updated_by = excluded.updated_by,
        updated_at = now()
  returning * into v_row;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(),
          'projection_' || case when p_enabled then 'on' else 'off' end,
          'projections',
          p_user_id::text || ':' || p_chart,
          case when v_before.id is null then null
               else jsonb_build_object('enabled', v_before.enabled, 'mode', v_before.mode, 'params', v_before.params)::text end,
          jsonb_build_object('enabled', v_row.enabled, 'mode', v_row.mode, 'params', v_row.params)::text,
          coalesce(current_setting('app.environment', true), 'development'));

  return v_row;
end;
$function$;

revoke all on function public.admin_set_projection(uuid, text, boolean, text, jsonb) from public, anon;
grant execute on function public.admin_set_projection(uuid, text, boolean, text, jsonb) to authenticated;
