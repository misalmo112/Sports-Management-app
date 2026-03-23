import { Navigate } from 'react-router-dom';
import { getTenantDashboardHomePath } from '@/shared/nav/navigation';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';

/** Sends `/dashboard` to the role- and module-aware default landing. */
export const DashboardHomeRedirect = () => (
  <Navigate to={getTenantDashboardHomePath(getCurrentUserRole())} replace />
);
