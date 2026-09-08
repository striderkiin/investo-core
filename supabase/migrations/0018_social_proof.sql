-- Post-build correction, Part Two: Social Proof & Activity Notification
-- System. Dedicated tables rather than reusing activity_settings/
-- online_user_settings (Phase 8) — those already have a live consumer
-- (useOnlineUserSimulator) and a different event vocabulary
-- (deposit/withdrawal/investment/referral_bonus/plan_upgrade); overloading
-- them here would blur two unrelated admin pages. This stays separate and
-- additive.

insert into permissions (key, description) values
  ('social_proof.manage', 'Manage social proof and activity notification settings');

insert into role_permissions (role, permission_key) values
  ('super_admin', 'social_proof.manage'),
  ('operations_admin', 'social_proof.manage');

create table social_proof_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  test_mode_enabled boolean not null default false,
  popup_position text not null default 'bottom-left' check (popup_position in ('bottom-left', 'bottom-right')),
  display_duration_seconds integer not null default 5 check (display_duration_seconds > 0),
  min_delay_seconds integer not null default 10 check (min_delay_seconds > 0),
  max_delay_seconds integer not null default 60 check (max_delay_seconds >= min_delay_seconds),
  max_queue integer not null default 10 check (max_queue > 0),
  max_per_session integer not null default 10 check (max_per_session > 0),
  max_per_minute integer not null default 3 check (max_per_minute > 0),
  enable_sound boolean not null default false,
  show_close_button boolean not null default true,
  privacy_mode text not null default 'first_initial' check (privacy_mode in ('first_name', 'first_initial', 'anonymous')),
  -- Production events: which categories are eligible to display for real confirmed activity.
  enabled_event_types text[] not null default array['new_account', 'plan_activation', 'deposit_confirmed', 'withdrawal_completed', 'referral_joined'],
  -- Admin test mode: which categories the admin may generate for the client-facing test stream (spec item 26).
  test_event_types text[] not null default array['new_account', 'plan_activation', 'deposit_confirmed', 'withdrawal_completed', 'referral_joined', 'milestone'],
  updated_at timestamptz not null default now()
);

create trigger trg_social_proof_settings_updated_at
  before update on social_proof_settings
  for each row execute function set_updated_at();

-- Reuses the generic audit_settings_change() trigger (0016_hardening.sql)
-- for ordinary field diffs; a dedicated trigger below additionally logs
-- test-mode enable/disable as its own named action (spec item 39).
create trigger trg_audit_social_proof_settings_changes
  after update on social_proof_settings
  for each row execute function audit_settings_change();

insert into social_proof_settings default values;

create table social_proof_templates (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique,
  template text not null,
  updated_at timestamptz not null default now()
);

create trigger trg_social_proof_templates_updated_at
  before update on social_proof_templates
  for each row execute function set_updated_at();

insert into social_proof_templates (event_type, template) values
  ('new_account', '{name} just joined {siteName}'),
  ('plan_activation', '{name} just activated {planName}'),
  ('deposit_confirmed', '{name} completed a deposit of {amount}'),
  ('withdrawal_completed', '{name} completed a withdrawal'),
  ('referral_joined', '{name} joined through a referral'),
  ('milestone', '{name} reached a new portfolio milestone');

create table social_proof_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null check (source in ('production', 'admin_test')),
  display_name text not null,
  message text not null,
  amount numeric(18,2),
  plan_name text,
  reference_table text,
  reference_id uuid,
  generated_by_admin_id uuid references profiles(id) on delete set null,
  environment text not null default 'development',
  broadcast_scope text not null default 'production' check (broadcast_scope in ('production', 'client_test')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index idx_social_proof_events_created_at on social_proof_events(created_at desc);

create table social_proof_metrics (
  metric_date date not null default current_date,
  event_type text not null,
  source text not null check (source in ('production', 'admin_test')),
  shown_count integer not null default 0,
  clicked_count integer not null default 0,
  dismissed_count integer not null default 0,
  primary key (metric_date, event_type, source)
);

alter table social_proof_settings enable row level security;
alter table social_proof_templates enable row level security;
alter table social_proof_events enable row level security;
alter table social_proof_metrics enable row level security;

create policy "social proof settings are publicly readable" on social_proof_settings for select using (true);
create policy "social proof settings managed by permission" on social_proof_settings for update
  using (has_permission('social_proof.manage')) with check (has_permission('social_proof.manage'));

create policy "social proof templates are publicly readable" on social_proof_templates for select using (true);
create policy "social proof templates managed by permission" on social_proof_templates for all
  using (has_permission('social_proof.manage')) with check (has_permission('social_proof.manage'));

-- Events carry no financial secrets, only what's already privacy-filtered
-- for display — readable by any signed-in client so the popup can render.
create policy "social proof events readable by authenticated" on social_proof_events for select
  to authenticated using (true);

create policy "social proof metrics readable by permission" on social_proof_metrics for select
  using (has_permission('social_proof.manage'));

-- ---------------------------------------------------------------------
-- Privacy filter: turns a real profile into the configured anonymized
-- display name. Only first_name / first_initial / anonymous are
-- implemented — this platform does not collect city/country at signup, so
-- "City only" / "Country only" are deliberately not offered rather than
-- fabricating geography that was never actually captured (spec item 24's
-- own privacy-first intent cuts against inventing data, not just exposing it).
-- ---------------------------------------------------------------------
create or replace function social_proof_is_valid_privacy_mode(p_mode text) returns boolean as $$
  select p_mode is not null and p_mode in ('first_name', 'first_initial', 'anonymous');
$$ language sql immutable;

create or replace function social_proof_privacy_name(p_full_name text, p_mode text)
returns text as $$
declare
  v_first text;
  v_mode text;
begin
  v_first := split_part(trim(coalesce(p_full_name, '')), ' ', 1);
  v_mode := case when social_proof_is_valid_privacy_mode(p_mode) then p_mode else 'first_initial' end;

  if v_mode = 'anonymous' then
    return 'A member';
  elsif v_mode = 'first_name' then
    return coalesce(nullif(v_first, ''), 'A member');
  else
    if length(trim(coalesce(p_full_name, ''))) = 0 then
      return 'A member';
    end if;
    return coalesce(nullif(v_first, ''), 'A') || ' ' || upper(left(split_part(trim(p_full_name), ' ', 2), 1)) || '.';
  end if;
end;
$$ language plpgsql immutable;

create or replace function social_proof_render_template(p_event_type text, p_vars jsonb)
returns text as $$
declare
  v_template text;
  v_result text;
  v_key text;
begin
  select template into v_template from social_proof_templates where event_type = p_event_type;
  if v_template is null then
    v_template := '{name} — ' || p_event_type;
  end if;

  v_result := v_template;
  for v_key in select jsonb_object_keys(p_vars) loop
    v_result := replace(v_result, '{' || v_key || '}', coalesce(p_vars ->> v_key, ''));
  end loop;

  return v_result;
end;
$$ language plpgsql stable;

-- ---------------------------------------------------------------------
-- Production event triggers. Each fires only when social proof is
-- enabled AND the specific event type is in enabled_event_types — never
-- unconditionally. Every event this path creates carries source =
-- 'production' and a reference back to the real row it describes; nothing
-- here is fabricated.
-- ---------------------------------------------------------------------

create or replace function emit_social_proof_new_account()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('new_account' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  v_name := social_proof_privacy_name(NEW.full_name, v_settings.privacy_mode);
  insert into social_proof_events (event_type, source, display_name, message, reference_table, reference_id, environment)
  values ('new_account', 'production', v_name,
    social_proof_render_template('new_account', jsonb_build_object('name', v_name, 'siteName', coalesce((select site_name from branding limit 1), 'the platform'))),
    'profiles', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_emit_social_proof_new_account
  after insert on profiles
  for each row execute function emit_social_proof_new_account();

create or replace function emit_social_proof_deposit_confirmed()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('deposit_confirmed' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name into v_full_name from profiles where id = NEW.user_id;
  v_name := social_proof_privacy_name(v_full_name, v_settings.privacy_mode);

  insert into social_proof_events (event_type, source, display_name, message, amount, reference_table, reference_id, environment)
  values ('deposit_confirmed', 'production', v_name,
    social_proof_render_template('deposit_confirmed', jsonb_build_object('name', v_name, 'amount', '$' || NEW.amount::text)),
    NEW.amount, 'deposits', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_emit_social_proof_deposit_confirmed
  after update on deposits
  for each row execute function emit_social_proof_deposit_confirmed();

create or replace function emit_social_proof_withdrawal_completed()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('withdrawal_completed' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name into v_full_name from profiles where id = NEW.user_id;
  v_name := social_proof_privacy_name(v_full_name, v_settings.privacy_mode);

  insert into social_proof_events (event_type, source, display_name, message, amount, reference_table, reference_id, environment)
  values ('withdrawal_completed', 'production', v_name,
    social_proof_render_template('withdrawal_completed', jsonb_build_object('name', v_name)),
    NEW.amount, 'withdrawals', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_emit_social_proof_withdrawal_completed
  after update on withdrawals
  for each row execute function emit_social_proof_withdrawal_completed();

create or replace function emit_social_proof_plan_activation()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
  v_plan_name text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('plan_activation' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name into v_full_name from profiles where id = NEW.user_id;
  select name into v_plan_name from investment_plans where id = NEW.plan_id;
  v_name := social_proof_privacy_name(v_full_name, v_settings.privacy_mode);

  insert into social_proof_events (event_type, source, display_name, message, amount, plan_name, reference_table, reference_id, environment)
  values ('plan_activation', 'production', v_name,
    social_proof_render_template('plan_activation', jsonb_build_object('name', v_name, 'planName', coalesce(v_plan_name, 'a plan'))),
    NEW.amount, v_plan_name, 'investments', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_emit_social_proof_plan_activation
  after insert on investments
  for each row execute function emit_social_proof_plan_activation();

create or replace function emit_social_proof_referral_joined()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('referral_joined' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name into v_full_name from profiles where id = NEW.referred_id;
  v_name := social_proof_privacy_name(v_full_name, v_settings.privacy_mode);

  insert into social_proof_events (event_type, source, display_name, message, reference_table, reference_id, environment)
  values ('referral_joined', 'production', v_name,
    social_proof_render_template('referral_joined', jsonb_build_object('name', v_name)),
    'referrals', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_emit_social_proof_referral_joined
  after insert on referrals
  for each row execute function emit_social_proof_referral_joined();

-- ---------------------------------------------------------------------
-- Admin test-stream broadcast. Preview stays entirely client-side (never
-- calls this) — only an authorized admin sending to the CLIENT TEST STREAM
-- reaches here, and only while test_mode_enabled is on. The event is
-- indistinguishable in shape from a production one except source/
-- broadcast_scope/generated_by_admin_id, which the client never renders.
-- ---------------------------------------------------------------------
create or replace function admin_send_test_social_proof_event(p_event_type text, p_vars jsonb, p_amount numeric default null, p_plan_name text default null)
returns social_proof_events as $$
declare
  v_settings social_proof_settings%rowtype;
  v_event social_proof_events%rowtype;
  v_name text;
begin
  if not has_permission('social_proof.manage') then
    raise exception 'not authorized to manage social proof';
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.test_mode_enabled then
    raise exception 'live-looking test notifications are disabled — enable them in Social Proof settings first';
  end if;
  if not (p_event_type = any(v_settings.test_event_types)) then
    raise exception 'event type % is not enabled for test broadcasts', p_event_type;
  end if;

  v_name := coalesce(p_vars ->> 'name', social_proof_privacy_name(coalesce(p_vars ->> 'fullName', 'A member'), v_settings.privacy_mode));

  insert into social_proof_events (event_type, source, display_name, message, amount, plan_name, generated_by_admin_id, environment, broadcast_scope)
  values (p_event_type, 'admin_test', v_name,
    social_proof_render_template(p_event_type, p_vars || jsonb_build_object(
      'name', v_name,
      'amount', case when p_amount is not null then '$' || p_amount::text else coalesce(p_vars ->> 'amount', '') end,
      'planName', coalesce(p_plan_name, p_vars ->> 'planName', 'a plan')
    )),
    p_amount, p_plan_name, auth.uid(), coalesce(current_setting('app.environment', true), 'development'), 'client_test')
  returning * into v_event;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'client_test_notification_sent', 'social_proof', p_event_type, v_event.message, v_event.environment);

  return v_event;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function admin_send_test_social_proof_event to authenticated;

create or replace function record_social_proof_interaction(p_event_id uuid, p_interaction text)
returns void as $$
declare
  v_event social_proof_events%rowtype;
begin
  if p_interaction not in ('shown', 'clicked', 'dismissed') then
    raise exception 'invalid interaction: %', p_interaction;
  end if;

  select * into v_event from social_proof_events where id = p_event_id;
  if not found then
    return; -- event already expired/cleaned up; a late interaction is a harmless no-op
  end if;

  insert into social_proof_metrics (metric_date, event_type, source, shown_count, clicked_count, dismissed_count)
  values (current_date, v_event.event_type, v_event.source,
    case when p_interaction = 'shown' then 1 else 0 end,
    case when p_interaction = 'clicked' then 1 else 0 end,
    case when p_interaction = 'dismissed' then 1 else 0 end)
  on conflict (metric_date, event_type, source) do update
  set shown_count = social_proof_metrics.shown_count + excluded.shown_count,
      clicked_count = social_proof_metrics.clicked_count + excluded.clicked_count,
      dismissed_count = social_proof_metrics.dismissed_count + excluded.dismissed_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function record_social_proof_interaction to authenticated;

-- Test-mode enable/disable gets its own explicit audit action, distinct
-- from the generic settings-diff trigger (spec item 39 lists these as
-- named events: "LIVE-LOOKING TEST NOTIFICATIONS ENABLED/DISABLED").
create or replace function audit_social_proof_test_mode_change()
returns trigger as $$
begin
  if NEW.test_mode_enabled is distinct from OLD.test_mode_enabled then
    insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
    values (auth.uid(), case when NEW.test_mode_enabled then 'test_notifications_enabled' else 'test_notifications_disabled' end,
      'social_proof', NEW.id::text, NEW.test_mode_enabled::text, coalesce(current_setting('app.environment', true), 'development'));
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_social_proof_test_mode_change
  after update on social_proof_settings
  for each row execute function audit_social_proof_test_mode_change();

do $$
declare
  t text;
begin
  foreach t in array array['social_proof_events', 'social_proof_settings'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
