/**
 * Tenant dashboard module keys — keep in sync with backend/shared/permissions/module_keys.py
 * (TENANT_MODULE_KEYS). Role STAFF is not the same as module key "staff".
 */
export const TENANT_MODULE_KEYS = [
  'admin-overview',
  'students',
  'classes',
  'attendance',
  'finance-items',
  'invoices',
  'receipts',
  'users',
  'media',
  'reports',
  'finance-overview',
  'facilities',
  'staff',
  'feedback',
  'settings-home',
  'organization-settings',
  'tax-settings',
  'locations',
  'academy-settings',
  'usage-settings',
  'sports',
  'terms',
  'currencies',
  'timezones',
  'bulk-actions',
  'setup',
] as const;

export type TenantModuleKey = (typeof TENANT_MODULE_KEYS)[number];

/** Modules that must not be assignable to STAFF (mirror backend FORBIDDEN_STAFF_MODULES) */
export const FORBIDDEN_STAFF_MODULES: readonly string[] = ['users', 'academy-settings', 'bulk-actions'];

/** Module keys an OWNER/ADMIN may grant to STAFF (all tenant keys minus forbidden). */
export const STAFF_ASSIGNABLE_MODULE_KEYS: readonly string[] = TENANT_MODULE_KEYS.filter(
  (k) => !FORBIDDEN_STAFF_MODULES.includes(k),
);

export function formatTenantModuleLabel(key: string): string {
  return key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
