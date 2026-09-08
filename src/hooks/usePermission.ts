import { useAuth } from './useAuth';
import { roleHasPermission, isAdminRole } from '../types/roles';
import type { Permission } from '../types/roles';

export function usePermission() {
  const { profile } = useAuth();

  function can(permission: Permission): boolean {
    if (!profile) return false;
    return roleHasPermission(profile.role, permission);
  }

  const isAdmin = profile ? isAdminRole(profile.role) : false;

  return { can, isAdmin, role: profile?.role ?? null };
}
