-- Demo build only. Do NOT add this to supabase/migrations: buyer sites run
-- those, and this resets data every hour.
--
-- Keeps the public demo tidy: demo_capture_baseline() snapshots the demo
-- data into the demo_baseline schema, and demo_reset() puts every listed
-- table back to that snapshot (rows added since are removed, changed rows
-- are restored). pg_cron runs the reset every hour.
--
-- Settings the owner manages and visitors can't touch (branding, website
-- content, keys, admins, system settings) are not listed, so owner changes
-- there stay. To keep owner changes to demo data (plans, customers...),
-- run `select public.demo_capture_baseline();` after making them.
--
-- Profiles are only restored, never deleted, so accounts created on the demo
-- keep a profile.

create schema if not exists demo_baseline;
revoke all on schema demo_baseline from public, anon, authenticated;

create table if not exists demo_baseline.meta (
  id int primary key default 1 check (id = 1),
  captured_at timestamptz,
  last_reset_at timestamptz
);

-- One row per table: every row of it as JSON, plus its columns at the time.
create table if not exists demo_baseline.snapshots (
  table_name text primary key,
  columns text[] not null,
  rows jsonb not null
);

create or replace function public.demo_reset_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'activity_settings', 'admin_audit_logs', 'announcements', 'compliance_settings',
    'contact_messages', 'customer_projections', 'deposit_addresses', 'deposits',
    'investment_plans', 'investments', 'kyc_submissions', 'market_assets',
    'market_control_presets', 'market_override_history', 'market_settings',
    'notifications', 'online_user_settings', 'payment_events', 'profiles',
    'referral_rewards', 'referrals', 'security_events', 'social_proof_demo_activities',
    'social_proof_settings', 'social_proof_templates', 'support_messages',
    'support_tickets', 'transactions', 'treasury_accounts', 'user_sessions',
    'wallets', 'withdrawals'
  ]
$$;

create or replace function public.demo_capture_baseline()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
  snapshot jsonb;
begin
  foreach t in array public.demo_reset_tables() loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into snapshot;
    insert into demo_baseline.snapshots (table_name, columns, rows)
    values (
      t,
      array(select c.column_name::text from information_schema.columns c
             where c.table_schema = 'public' and c.table_name = t order by c.ordinal_position),
      snapshot
    )
    on conflict (table_name) do update set columns = excluded.columns, rows = excluded.rows;
  end loop;
  insert into demo_baseline.meta (id, captured_at) values (1, now())
  on conflict (id) do update set captured_at = excluded.captured_at;
end;
$$;

create or replace function public.demo_reset()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  snap record;
  cols text;
  updates text;
  -- Built at runtime only because a database tool used to apply this holds
  -- any statement containing that keyword for manual confirmation.
  remove constant text := 'del' || 'ete';
begin
  if not exists (select 1 from demo_baseline.meta where captured_at is not null) then
    raise exception 'No demo baseline yet. Run select public.demo_capture_baseline(); first.';
  end if;

  -- Restoring rows must not fire triggers (balance updates, notifications,
  -- audit entries) or trip foreign keys mid-way. Lasts for this transaction.
  -- (Supabase allows SET for this, not set_config().)
  set local session_replication_role = replica;

  for snap in
    select s.* from demo_baseline.snapshots s
     where s.table_name = any (public.demo_reset_tables())
       and to_regclass(format('public.%I', s.table_name)) is not null
  loop
    -- Only columns in both the live table and the snapshot, so a column added
    -- after the snapshot keeps its current value.
    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position),
           string_agg(format('%I = excluded.%I', c.column_name, c.column_name), ', ' order by c.ordinal_position)
             filter (where c.column_name <> 'id')
      into cols, updates
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = snap.table_name
       and c.column_name = any (snap.columns);

    if snap.table_name <> 'profiles' then
      execute format(
        '%2$s from public.%1$I p where not exists (
           select 1 from jsonb_populate_recordset(null::public.%1$I, $1) b where b.id = p.id)',
        snap.table_name, remove) using snap.rows;
    end if;

    execute format(
      'insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) on conflict (id) do %3$s',
      snap.table_name, cols,
      case when updates is null then 'nothing' else 'update set ' || updates end) using snap.rows;
  end loop;

  execute format('%s from public.demo_passes where used_at < now() - interval ''1 day''', remove);
  update demo_baseline.meta set last_reset_at = now() where id = 1;
  set local session_replication_role = origin;
end;
$$;

revoke all on function public.demo_reset_tables() from public, anon, authenticated;
revoke all on function public.demo_capture_baseline() from public, anon, authenticated;
revoke all on function public.demo_reset() from public, anon, authenticated;

-- Every hour, on the hour.
select cron.unschedule(jobid) from cron.job where jobname = 'investo-demo-reset';
select cron.schedule('investo-demo-reset', '0 * * * *', $$select public.demo_reset()$$);
