/**
 * Role-based access control utilities
 * 
 * Note: This is a basic implementation. It should be integrated with
 * the actual authentication system when available.
 */

export type UserRole = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'STAFF' | 'COACH' | 'PARENT';

const ROLE_VALUES: UserRole[] = ['SUPERADMIN', 'OWNER', 'ADMIN', 'STAFF', 'COACH', 'PARENT'];

const ALLOWED_MODULES_KEY = 'user_allowed_modules';

/**
 * Parsed module list for STAFF; null means "all modules" (OWNER / ADMIN / SUPERADMIN).
 */
export const getAllowedModulesFromStorage = (): string[] | null => {
  const raw = localStorage.getItem(ALLOWED_MODULES_KEY);
  if (raw == null || raw === '' || raw === 'null') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return null;
  }
};

export const setAllowedModulesInStorage = (modules: string[] | null | undefined): void => {
  if (modules == null) {
    localStorage.removeItem(ALLOWED_MODULES_KEY);
    return;
  }
  localStorage.setItem(ALLOWED_MODULES_KEY, JSON.stringify(modules));
};

/**
 * Align localStorage with GET/PATCH current account (STAFF module grants; clear for other roles).
 */
export const syncAllowedModulesFromAccount = (account: {
  role: string;
  allowed_modules?: string[] | null;
}): void => {
  if (
    account.role === 'STAFF' &&
    Array.isArray(account.allowed_modules) &&
    account.allowed_modules.length > 0
  ) {
    setAllowedModulesInStorage(account.allowed_modules);
  } else {
    setAllowedModulesInStorage(null);
  }
};

/**
 * STAFF: must have module key. OWNER / ADMIN / SUPERADMIN: always true for tenant dashboard modules.
 */
export const userHasTenantModule = (role: UserRole | null | undefined, moduleKey: string): boolean => {
  if (!role) return false;
  if (role === 'OWNER' || role === 'ADMIN' || role === 'SUPERADMIN') {
    return true;
  }
  if (role === 'STAFF') {
    const mods = getAllowedModulesFromStorage();
    if (!mods || mods.length === 0) return false;
    return mods.includes(moduleKey);
  }
  return true;
};

/**
 * Check if user has admin dashboard access (OWNER, ADMIN, or delegated STAFF)
 */
export const hasAdminAccess = (role?: UserRole | null): boolean => {
  if (!role) return false;
  return role === 'OWNER' || role === 'ADMIN' || role === 'STAFF' || role === 'SUPERADMIN';
};

/** Only OWNER/ADMIN may use the full onboarding wizard; other tenant roles use the normal dashboard. */
export const canRunAcademyOnboardingWizard = (role: UserRole | string | null | undefined): boolean =>
  role === 'OWNER' || role === 'ADMIN';

/**
 * Get user role from localStorage (temporary solution)
 * TODO: Replace with proper auth context/store
 */
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
