/**
 * Ensures STAFF users only access routes for modules they were granted.
 * OWNER and full ADMIN bypass; other roles rely on RequireRole only.
 */
import { Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { getCurrentUserRole, userHasTenantModule } from '@/shared/utils/roleAccess';

interface RequireModuleProps {
  moduleKey: string;
  children: ReactNode;
}

export const RequireModule = ({ moduleKey, children }: RequireModuleProps) => {
  const role = getCurrentUserRole();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!userHasTenantModule(role, moduleKey)) {
    return (
      <Navigate
        to="/dashboard/access-denied"
        replace
        state={{ moduleKey }}
      />
    );
  }

  return <>{children}</>;
};
