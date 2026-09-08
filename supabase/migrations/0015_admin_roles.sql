-- Phase 9/section 69: Super Admin can assign roles to existing accounts
-- (promoting a client to an admin role, changing one admin role to another,
-- or demoting an admin back to client). Bundled with users.manage_status's
-- existing coverage of suspend/restore, this is the full "Admins & Roles"
-- admin surface without needing a separate admin-creation signup flow (which
-- would require the Auth Admin API and a service-role Edge Function).

create or replace function admin_set_user_role(p_user_id uuid, p_role role_name)
returns profiles as $$
declare
  v_profile profiles%rowtype;
begin
  if not has_permission('roles.manage') then
    raise exception 'not authorized to change roles';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set role = p_role where id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception 'user not found';
  end if;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'role_changed', 'admins', p_user_id::text, p_role::text, coalesce(current_setting('app.environment', true), 'development'));

  return v_profile;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function admin_set_user_role to authenticated;
