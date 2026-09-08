-- Phase 9: session tracking and security events need write paths that
-- migration 0007 didn't add (it only covers reads). Sessions are
-- self-reported by the client on login/logout, so RLS must let a user
-- insert/update their own row; admins can terminate any session.

create policy user_sessions_insert_self on user_sessions for insert to authenticated
  with check (user_id = auth.uid());

create policy user_sessions_update_self_or_admin on user_sessions for update to authenticated
  using (user_id = auth.uid() or has_permission('security.manage'))
  with check (user_id = auth.uid() or has_permission('security.manage'));

-- Security events: a user may log an event about their own account (2FA
-- enabled/disabled, password changed); anything else stays admin/RPC-only.
create policy security_events_insert_self on security_events for insert to authenticated
  with check (user_id = auth.uid() and event_type in ('password_changed', '2fa_enabled', '2fa_disabled'));

create or replace function terminate_user_session(p_session_id uuid)
returns user_sessions as $$
declare
  v_session user_sessions%rowtype;
begin
  select * into v_session from user_sessions where id = p_session_id;
  if not found then
    raise exception 'session not found';
  end if;

  if v_session.user_id != auth.uid() and not has_permission('security.manage') then
    raise exception 'not authorized to terminate this session';
  end if;

  update user_sessions set terminated_at = now() where id = p_session_id
  returning * into v_session;

  insert into security_events (user_id, event_type, metadata)
  values (v_session.user_id, 'session_terminated', jsonb_build_object('session_id', p_session_id, 'terminated_by', auth.uid()));

  return v_session;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function terminate_user_session to authenticated;
