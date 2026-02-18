/**
 * Protected route component for role-based access
 */
import { Navigate } from 'react-router-dom';
import { checkAdminAccess } from '@/shared/utils/roleAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) => {
  if (requireAdmin && !checkAdminAccess()) {
    // Redirect to dashboard or login if not authorized
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
