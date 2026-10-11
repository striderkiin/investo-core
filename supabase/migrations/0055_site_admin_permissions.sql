-- Permissions for the site_admin role added in 0054: every permission except
-- managing admins and roles.

insert into roles (name, description) values
  ('site_admin', 'Runs the site: everything except managing admins and roles')
on conflict (name) do nothing;

insert into role_permissions (role, permission_key)
select 'site_admin', key from permissions
where key not in ('admins.manage', 'roles.manage')
on conflict do nothing;
