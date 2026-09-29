-- Stage 6: invite-only admin accounts, "sign out everywhere", and an email log.
--
-- Admin invites: a super admin (admins.manage) invites an email address with
-- a role. The raw token exists only in the invite link; the table keeps its
-- SHA-256 hash, so a database leak cannot be turned into working links.
-- Invites expire after 48 hours and can be used once. The role comes from the
-- invite row, never from the browser.

create table if not exists admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role role_name not null check (role <> 'client'),
  token_hash text not null unique,
  invited_by uuid not null references profiles (id),
  expires_at timestamptz not null default now() + interval '48 hours',
  accepted_at timestamptz,
  accepted_user uuid references profiles (id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_invites_email_idx on admin_invites (lower(email));

alter table admin_invites enable row level security;

drop policy if exists admin_invites_select on admin_invites;
create policy admin_invites_select on admin_invites for select using (has_permission('admins.manage'));
-- No insert/update/delete policies: only the functions below write here.

create or replace function public.create_admin_invite(p_email text, p_role role_name)
 returns table (invite_id uuid, token text, expires_at timestamptz)
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_email text := lower(trim(p_email));
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_invite admin_invites%rowtype;
begin
  if not has_permission('admins.manage') then
    raise exception 'only a super admin can invite admins';
  end if;
  if p_role = 'client' then
    raise exception 'invites are for admin roles only';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'enter a valid email address';
  end if;
  if exists (select 1 from profiles where lower(email) = v_email) then
    raise exception 'an account with this email already exists; change its role from the Admins page instead';
  end if;

  -- A new invite replaces any earlier unused one for the same address.
  update admin_invites set revoked_at = now()
  where lower(email) = v_email and accepted_at is null and revoked_at is null;

  insert into admin_invites (email, role, token_hash, invited_by)
  values (v_email, p_role, encode(digest(v_token, 'sha256'), 'hex'), auth.uid())
  returning * into v_invite;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'admin_invited', 'admins', v_email, p_role::text, coalesce(current_setting('app.environment', true), 'development'));

  return query select v_invite.id, v_token, v_invite.expires_at;
end;
$function$;

create or replace function public.revoke_admin_invite(p_invite_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_email text;
begin
  if not has_permission('admins.manage') then
    raise exception 'only a super admin can revoke invites';
  end if;
  update admin_invites set revoked_at = now()
  where id = p_invite_id and accepted_at is null and revoked_at is null
  returning email into v_email;
  if v_email is null then
    raise exception 'invite not found or already used';
  end if;
  insert into admin_audit_logs (admin_id, action, module, target, environment)
  values (auth.uid(), 'admin_invite_revoked', 'admins', v_email, coalesce(current_setting('app.environment', true), 'development'));
end;
$function$;

-- Public: lets the invite page show who the link is for. Reveals nothing
-- without the token itself.
create or replace function public.peek_admin_invite(p_token text)
 returns table (email text, role role_name, expires_at timestamptz)
 language sql
 stable
 security definer
 set search_path to 'public', 'extensions'
as $function$
  select i.email, i.role, i.expires_at
  from admin_invites i
  where i.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now();
$function$;

-- Service role only (the accept-admin-invite edge function): after it has
-- created the auth user, give the new profile the invited role and burn the
-- invite. Checked again here so the function can't be misused.
create or replace function public.claim_admin_invite(p_token text, p_user_id uuid)
 returns role_name
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_invite admin_invites%rowtype;
  v_email text;
begin
  select * into v_invite from admin_invites
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;
  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'this invite link is invalid, used or expired';
  end if;
  select email into v_email from profiles where id = p_user_id;
  if lower(v_email) is distinct from lower(v_invite.email) then
    raise exception 'invite email does not match the account';
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set role = v_invite.role where id = p_user_id;
  update admin_invites set accepted_at = now(), accepted_user = p_user_id where id = v_invite.id;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (p_user_id, 'admin_invite_accepted', 'admins', v_invite.email, v_invite.role::text,
          coalesce(current_setting('app.environment', true), 'development'));
  return v_invite.role;
end;
$function$;

revoke all on function public.create_admin_invite(text, role_name) from public, anon;
grant execute on function public.create_admin_invite(text, role_name) to authenticated;
revoke all on function public.revoke_admin_invite(uuid) from public, anon;
grant execute on function public.revoke_admin_invite(uuid) to authenticated;
grant execute on function public.peek_admin_invite(text) to anon, authenticated;
revoke all on function public.claim_admin_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_admin_invite(text, uuid) to service_role;

-- Sign a user out of every device by deleting their sessions. Customers can
-- be signed out by anyone allowed to change account status; admins only by a
-- super admin. Existing access tokens stay valid until they expire (up to an
-- hour); refreshing them fails immediately.
create or replace function public.admin_sign_out_user(p_user_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'auth'
as $function$
declare
  v_role role_name;
  v_count integer;
begin
  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    raise exception 'user not found';
  end if;
  if v_role = 'client' then
    if not has_permission('users.manage_status') then
      raise exception 'not authorized';
    end if;
  elsif current_role_name() is distinct from 'super_admin' then
    raise exception 'only a super admin can sign out an admin';
  end if;

  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_count = row_count;
  delete from auth.refresh_tokens where user_id = p_user_id::text;
  update public.user_sessions set terminated_at = now() where user_id = p_user_id and terminated_at is null;

  insert into public.security_events (user_id, event_type, metadata)
  values (p_user_id, 'session_terminated', jsonb_build_object('reason', 'signed_out_everywhere_by_admin', 'admin_id', auth.uid()));
  insert into public.admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'user_signed_out_everywhere', 'users', p_user_id::text, v_count::text,
          coalesce(current_setting('app.environment', true), 'development'));
  return v_count;
end;
$function$;

revoke all on function public.admin_sign_out_user(uuid) from public, anon;
grant execute on function public.admin_sign_out_user(uuid) to authenticated;

-- Every email the platform sends (statements, invites, tests, auth emails).
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed', 'not_configured')),
  error text,
  provider_id text,
  sent_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table email_log enable row level security;
drop policy if exists email_log_select on email_log;
create policy email_log_select on email_log for select using (has_permission('audit.read'));
