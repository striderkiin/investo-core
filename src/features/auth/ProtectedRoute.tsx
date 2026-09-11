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

  // The client dashboard lives outside this React app as a separate static
  // multi-page app under /client-app (see LoginPage), so sending a non-admin
  // away from an admin-only route needs a real page navigation, not <Navigate>.
  if (requireAdmin && !isAdminRole(profile.role)) {
    window.location.replace('/client-app/index.html');
    return null;
  }

  if (requirePermission && !can(requirePermission)) {
    if (!isAdminRole(profile.role)) {
      window.location.replace('/client-app/index.html');
      return null;
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
