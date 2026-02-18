/**
 * Role-based access control utilities
 * 
 * Note: This is a basic implementation. It should be integrated with
 * the actual authentication system when available.
 */

export type UserRole = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'COACH' | 'PARENT';

/**
 * Check if user has admin access (OWNER or ADMIN)
 */
export const hasAdminAccess = (role?: UserRole | null): boolean => {
  if (!role) return false;
  return role === 'OWNER' || role === 'ADMIN' || role === 'SUPERADMIN';
};

/**
 * Get user role from localStorage (temporary solution)
 * TODO: Replace with proper auth context/store
 */
const ROLE_VALUES: UserRole[] = ['SUPERADMIN', 'OWNER', 'ADMIN', 'COACH', 'PARENT'];

const getRoleFromToken = (token: string | null): UserRole | null => {
  if (!token) return null;

  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '='));
    const payload = JSON.parse(payloadJson);
    const role = payload?.role;
    if (ROLE_VALUES.includes(role)) {
      return role as UserRole;
    }
  } catch {
    return null;
  }

  return null;
};

export const getCurrentUserRole = (): UserRole | null => {
  const storedRole = localStorage.getItem('user_role');
  if (storedRole && ROLE_VALUES.includes(storedRole as UserRole)) {
    const academyId = localStorage.getItem('user_academy_id');
    if (!academyId && storedRole === 'ADMIN') {
      return 'SUPERADMIN';
    }
    return storedRole as UserRole;
  }

  const tokenRole = getRoleFromToken(localStorage.getItem('auth_token'));
  if (tokenRole) {
    localStorage.setItem('user_role', tokenRole);
    return tokenRole;
  }

  return null;
};

/**
 * Check if current user has admin access
 */
export const checkAdminAccess = (): boolean => {
  const role = getCurrentUserRole();
  return hasAdminAccess(role);
};
