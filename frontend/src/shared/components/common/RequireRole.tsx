/**
 * RequireRole guard component
 * Checks if user has one of the allowed roles, redirects to dashboard if not
 */
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { getCurrentUserRole, type UserRole } from '@/shared/utils/roleAccess';

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export const RequireRole = ({ children, allowedRoles }: RequireRoleProps) => {
  const userRole = getCurrentUserRole();
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to dashboard if role doesn't match
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
