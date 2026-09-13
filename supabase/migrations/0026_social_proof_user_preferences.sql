-- Per-user social proof preferences. Until now, whether and how a client's
-- real activity (deposits, investments, signups, referrals) appeared in
-- the "Recent Activity" popup other visitors see was entirely an admin
-- decision (social_proof_settings.privacy_mode, applied uniformly to
-- everyone). This adds a personal opt-out and a personal display
-- preference — the admin's setting remains the site-wide default for any
-- user who hasn't chosen one.

alter table profiles
  add column social_proof_opt_in boolean not null default true,
  add column social_proof_nickname text,
  add column social_proof_display_mode text check (social_proof_display_mode in ('first_name', 'first_initial', 'nickname'));

alter table profiles add constraint social_proof_nickname_length check (social_proof_nickname is null or length(social_proof_nickname) <= 40);

-- A user can already update their own profiles row (full_name, avatar_url)
-- via the existing self-update RLS policy — these are just more columns on
-- that same row, so no new policy is needed.

create or replace function social_proof_is_valid_privacy_mode(p_mode text) returns boolean as $$
  select p_mode is not null and p_mode in ('first_name', 'first_initial', 'anonymous', 'nickname');
$$ language sql immutable;

-- 'nickname' is new: a per-user choice, backed by profiles.social_proof_nickname.
-- If a user picks it without ever setting a nickname, this degrades to
-- first_initial rather than leaking nothing or erroring.
create or replace function social_proof_privacy_name(p_full_name text, p_mode text, p_nickname text default null)
returns text as $$
declare
  v_first text;
  v_mode text;
begin
  v_first := split_part(trim(coalesce(p_full_name, '')), ' ', 1);
  v_mode := case when social_proof_is_valid_privacy_mode(p_mode) then p_mode else 'first_initial' end;

  if v_mode = 'nickname' then
    if length(trim(coalesce(p_nickname, ''))) > 0 then
      return trim(p_nickname);
    end if;
    v_mode := 'first_initial';
  end if;

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

-- Every production trigger below now: (1) reads the acting user's own
-- opt_in/nickname/display_mode alongside full_name, (2) skips generating
-- an event at all when that user has opted out, and (3) resolves the
-- display name from the user's personal mode, falling back to the admin's
-- site-wide privacy_mode only when the user hasn't set one.

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
  if not NEW.social_proof_opt_in then
    return NEW;
  end if;

  v_name := social_proof_privacy_name(NEW.full_name, coalesce(NEW.social_proof_display_mode, v_settings.privacy_mode), NEW.social_proof_nickname);
  insert into social_proof_events (event_type, source, display_name, message, reference_table, reference_id, environment)
  values ('new_account', 'production', v_name,
    social_proof_render_template('new_account', jsonb_build_object('name', v_name, 'siteName', coalesce((select site_name from branding limit 1), 'the platform'))),
    'profiles', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function emit_social_proof_deposit_confirmed()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
  v_opt_in boolean;
  v_nickname text;
  v_user_mode text;
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('deposit_confirmed' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode
    into v_full_name, v_opt_in, v_nickname, v_user_mode
    from profiles where id = NEW.user_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  v_name := social_proof_privacy_name(v_full_name, coalesce(v_user_mode, v_settings.privacy_mode), v_nickname);

  insert into social_proof_events (event_type, source, display_name, message, amount, reference_table, reference_id, environment)
  values ('deposit_confirmed', 'production', v_name,
    social_proof_render_template('deposit_confirmed', jsonb_build_object('name', v_name, 'amount', '$' || NEW.amount::text)),
    NEW.amount, 'deposits', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function emit_social_proof_withdrawal_completed()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
  v_opt_in boolean;
  v_nickname text;
  v_user_mode text;
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('withdrawal_completed' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode
    into v_full_name, v_opt_in, v_nickname, v_user_mode
    from profiles where id = NEW.user_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  v_name := social_proof_privacy_name(v_full_name, coalesce(v_user_mode, v_settings.privacy_mode), v_nickname);

  insert into social_proof_events (event_type, source, display_name, message, amount, reference_table, reference_id, environment)
  values ('withdrawal_completed', 'production', v_name,
    social_proof_render_template('withdrawal_completed', jsonb_build_object('name', v_name)),
    NEW.amount, 'withdrawals', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function emit_social_proof_plan_activation()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
  v_plan_name text;
  v_opt_in boolean;
  v_nickname text;
  v_user_mode text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('plan_activation' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode
    into v_full_name, v_opt_in, v_nickname, v_user_mode
    from profiles where id = NEW.user_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  select name into v_plan_name from investment_plans where id = NEW.plan_id;
  v_name := social_proof_privacy_name(v_full_name, coalesce(v_user_mode, v_settings.privacy_mode), v_nickname);

  insert into social_proof_events (event_type, source, display_name, message, amount, plan_name, reference_table, reference_id, environment)
  values ('plan_activation', 'production', v_name,
    social_proof_render_template('plan_activation', jsonb_build_object('name', v_name, 'planName', coalesce(v_plan_name, 'a plan'))),
    NEW.amount, v_plan_name, 'investments', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function emit_social_proof_referral_joined()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_full_name text;
  v_opt_in boolean;
  v_nickname text;
  v_user_mode text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('referral_joined' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode
    into v_full_name, v_opt_in, v_nickname, v_user_mode
    from profiles where id = NEW.referred_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  v_name := social_proof_privacy_name(v_full_name, coalesce(v_user_mode, v_settings.privacy_mode), v_nickname);

  insert into social_proof_events (event_type, source, display_name, message, reference_table, reference_id, environment)
  values ('referral_joined', 'production', v_name,
    social_proof_render_template('referral_joined', jsonb_build_object('name', v_name)),
    'referrals', NEW.id, coalesce(current_setting('app.environment', true), 'development'));

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;
