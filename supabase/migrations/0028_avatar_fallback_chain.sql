-- Avatar fallback chain: uploaded photo -> picked illustrated avatar ->
-- initials-on-brand-color. profiles already has avatar_url (the uploaded
-- photo); this adds the middle tier (a library key the user picked on the
-- Account page) and mirrors both onto social_proof_events so the "Recent
-- Activity" popup can render the same chain for a real person's event
-- without joining back to profiles on every read.

alter table profiles
  add column avatar_key text
    check (avatar_key is null or avatar_key in (
      'compass', 'peak', 'wave', 'orbit', 'bolt', 'leaf', 'prism', 'star'
    ));

alter table social_proof_events
  add column avatar_url text,
  add column avatar_key text;

-- Every production trigger below now also resolves the acting user's
-- avatar alongside their display name, and applies the exact same privacy
-- gate: a fully anonymous display mode gets no avatar reference either
-- (the popup falls to the brand-mark tier), never a real person's photo or
-- chosen avatar leaking past an anonymized name.

create or replace function emit_social_proof_new_account()
returns trigger as $$
declare
  v_settings social_proof_settings%rowtype;
  v_name text;
  v_mode text;
  v_avatar_url text;
  v_avatar_key text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('new_account' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;
  if not NEW.social_proof_opt_in then
    return NEW;
  end if;

  v_mode := coalesce(NEW.social_proof_display_mode, v_settings.privacy_mode);
  v_name := social_proof_privacy_name(NEW.full_name, v_mode, NEW.social_proof_nickname);
  if v_mode != 'anonymous' then
    v_avatar_url := NEW.avatar_url;
    v_avatar_key := NEW.avatar_key;
  end if;

  insert into social_proof_events (event_type, source, display_name, message, reference_table, reference_id, environment, avatar_url, avatar_key)
  values ('new_account', 'production', v_name,
    social_proof_render_template('new_account', jsonb_build_object('name', v_name, 'siteName', coalesce((select site_name from branding limit 1), 'the platform'))),
    'profiles', NEW.id, coalesce(current_setting('app.environment', true), 'development'), v_avatar_url, v_avatar_key);

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
  v_mode text;
  v_avatar_url text;
  v_avatar_key text;
  v_profile_avatar_url text;
  v_profile_avatar_key text;
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('deposit_confirmed' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode, avatar_url, avatar_key
    into v_full_name, v_opt_in, v_nickname, v_user_mode, v_profile_avatar_url, v_profile_avatar_key
    from profiles where id = NEW.user_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  v_mode := coalesce(v_user_mode, v_settings.privacy_mode);
  v_name := social_proof_privacy_name(v_full_name, v_mode, v_nickname);
  if v_mode != 'anonymous' then
    v_avatar_url := v_profile_avatar_url;
    v_avatar_key := v_profile_avatar_key;
  end if;

  insert into social_proof_events (event_type, source, display_name, message, amount, reference_table, reference_id, environment, avatar_url, avatar_key)
  values ('deposit_confirmed', 'production', v_name,
    social_proof_render_template('deposit_confirmed', jsonb_build_object('name', v_name, 'amount', '$' || NEW.amount::text)),
    NEW.amount, 'deposits', NEW.id, coalesce(current_setting('app.environment', true), 'development'), v_avatar_url, v_avatar_key);

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
  v_mode text;
  v_avatar_url text;
  v_avatar_key text;
  v_profile_avatar_url text;
  v_profile_avatar_key text;
begin
  if NEW.status != 'completed' or OLD.status = 'completed' then
    return NEW;
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('withdrawal_completed' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode, avatar_url, avatar_key
    into v_full_name, v_opt_in, v_nickname, v_user_mode, v_profile_avatar_url, v_profile_avatar_key
    from profiles where id = NEW.user_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  v_mode := coalesce(v_user_mode, v_settings.privacy_mode);
  v_name := social_proof_privacy_name(v_full_name, v_mode, v_nickname);
  if v_mode != 'anonymous' then
    v_avatar_url := v_profile_avatar_url;
    v_avatar_key := v_profile_avatar_key;
  end if;

  insert into social_proof_events (event_type, source, display_name, message, amount, reference_table, reference_id, environment, avatar_url, avatar_key)
  values ('withdrawal_completed', 'production', v_name,
    social_proof_render_template('withdrawal_completed', jsonb_build_object('name', v_name)),
    NEW.amount, 'withdrawals', NEW.id, coalesce(current_setting('app.environment', true), 'development'), v_avatar_url, v_avatar_key);

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
  v_mode text;
  v_avatar_url text;
  v_avatar_key text;
  v_profile_avatar_url text;
  v_profile_avatar_key text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('plan_activation' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode, avatar_url, avatar_key
    into v_full_name, v_opt_in, v_nickname, v_user_mode, v_profile_avatar_url, v_profile_avatar_key
    from profiles where id = NEW.user_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  select name into v_plan_name from investment_plans where id = NEW.plan_id;
  v_mode := coalesce(v_user_mode, v_settings.privacy_mode);
  v_name := social_proof_privacy_name(v_full_name, v_mode, v_nickname);
  if v_mode != 'anonymous' then
    v_avatar_url := v_profile_avatar_url;
    v_avatar_key := v_profile_avatar_key;
  end if;

  insert into social_proof_events (event_type, source, display_name, message, amount, plan_name, reference_table, reference_id, environment, avatar_url, avatar_key)
  values ('plan_activation', 'production', v_name,
    social_proof_render_template('plan_activation', jsonb_build_object('name', v_name, 'planName', coalesce(v_plan_name, 'a plan'))),
    NEW.amount, v_plan_name, 'investments', NEW.id, coalesce(current_setting('app.environment', true), 'development'), v_avatar_url, v_avatar_key);

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
  v_mode text;
  v_avatar_url text;
  v_avatar_key text;
  v_profile_avatar_url text;
  v_profile_avatar_key text;
begin
  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.enabled or not ('referral_joined' = any(v_settings.enabled_event_types)) then
    return NEW;
  end if;

  select full_name, social_proof_opt_in, social_proof_nickname, social_proof_display_mode, avatar_url, avatar_key
    into v_full_name, v_opt_in, v_nickname, v_user_mode, v_profile_avatar_url, v_profile_avatar_key
    from profiles where id = NEW.referred_id;
  if not coalesce(v_opt_in, true) then
    return NEW;
  end if;

  v_mode := coalesce(v_user_mode, v_settings.privacy_mode);
  v_name := social_proof_privacy_name(v_full_name, v_mode, v_nickname);
  if v_mode != 'anonymous' then
    v_avatar_url := v_profile_avatar_url;
    v_avatar_key := v_profile_avatar_key;
  end if;

  insert into social_proof_events (event_type, source, display_name, message, reference_table, reference_id, environment, avatar_url, avatar_key)
  values ('referral_joined', 'production', v_name,
    social_proof_render_template('referral_joined', jsonb_build_object('name', v_name)),
    'referrals', NEW.id, coalesce(current_setting('app.environment', true), 'development'), v_avatar_url, v_avatar_key);

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;
