import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../types/roles';
import { isAdminRole } from '../../types/roles';
import { LoadingScreen } from '../../components/common/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requirePermission?: Permission;
}

export function ProtectedRoute({ children, requireAdmin, requirePermission }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuth();
  const { can } = usePermission();

  if (isLoading) {
    return <LoadingScreen label="Checking your session..." />;
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdminRole(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requirePermission && !can(requirePermission)) {
    return <Navigate to={isAdminRole(profile.role) ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}
