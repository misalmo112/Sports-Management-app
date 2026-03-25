/**
 * STAFF module nav filtering and default landing paths.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('lucide-react', async (importOriginal) => importOriginal<typeof import('lucide-react')>());

import {
  filterAdminNavByModules,
  getNavigationForRole,
  getStaffLandingPathFromModules,
  getTenantDashboardHomePath,
  navigationConfig,
} from '../navigation';

const ALLOWED_KEY = 'user_allowed_modules';
const ROLE_KEY = 'user_role';

describe('getStaffLandingPathFromModules', () => {
  it('returns students path when only students is granted', () => {
    expect(getStaffLandingPathFromModules(['students'])).toBe('/dashboard/students');
  });

  it('prefers admin-overview when both setup and admin-overview are granted (ADMIN nav order)', () => {
    expect(getStaffLandingPathFromModules(['setup', 'admin-overview'])).toBe('/dashboard/admin/overview');
  });

  it('falls back to account when only setup is granted (no setup nav item)', () => {
    expect(getStaffLandingPathFromModules(['setup'])).toBe('/dashboard/settings/account');
  });

  it('falls back to account when no granted module matches nav items', () => {
    expect(getStaffLandingPathFromModules([])).toBe('/dashboard/settings/account');
    expect(getStaffLandingPathFromModules(['unknown-module-key'])).toBe('/dashboard/settings/account');
  });
});

describe('filterAdminNavByModules', () => {
  it('keeps my-account without listing it in allowed_modules', () => {
    const filtered = filterAdminNavByModules(navigationConfig.ADMIN, ['students']);
    const ids = filtered.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('my-account');
    expect(ids).toContain('students');
    expect(ids).not.toContain('users');
  });

  it('shows staff-pay-schedules when staff module is granted (bundled under Staff)', () => {
    const filtered = filterAdminNavByModules(navigationConfig.ADMIN, ['staff']);
    const ids = filtered.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('staff');
    expect(ids).toContain('staff-pay-schedules');
  });

  it('hides staff-pay-schedules when neither staff nor staff-pay-schedules is granted', () => {
    const filtered = filterAdminNavByModules(navigationConfig.ADMIN, ['students']);
    const ids = filtered.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('staff-pay-schedules');
  });

  it('shows rent-schedules when facilities module is granted', () => {
    const filtered = filterAdminNavByModules(navigationConfig.ADMIN, ['facilities']);
    const ids = filtered.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('rent-schedules');
  });

  it('hides rent-schedules when facilities is not granted', () => {
    const filtered = filterAdminNavByModules(navigationConfig.ADMIN, ['students']);
    const ids = filtered.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('rent-schedules');
  });
});

describe('getNavigationForRole (STAFF)', () => {
  beforeEach(() => {
    localStorage.setItem(ROLE_KEY, 'STAFF');
  });

  afterEach(() => {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(ALLOWED_KEY);
  });

  it('shows only granted items plus my-account', () => {
    localStorage.setItem(ALLOWED_KEY, JSON.stringify(['students', 'classes']));
    const groups = getNavigationForRole('STAFF');
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toEqual(expect.arrayContaining(['students', 'classes', 'my-account']));
    expect(ids).not.toContain('users');
    expect(ids).not.toContain('admin-overview');
  });
});

describe('getTenantDashboardHomePath', () => {
  afterEach(() => {
    localStorage.removeItem(ALLOWED_KEY);
  });

  it('maps roles to fixed defaults except STAFF', () => {
    expect(getTenantDashboardHomePath('SUPERADMIN')).toBe('/dashboard/platform/academies');
    expect(getTenantDashboardHomePath('OWNER')).toBe('/dashboard/owner/overview');
    expect(getTenantDashboardHomePath('ADMIN')).toBe('/dashboard/admin/overview');
    expect(getTenantDashboardHomePath('COACH')).toBe('/dashboard/coach/overview');
    expect(getTenantDashboardHomePath('PARENT')).toBe('/dashboard/parent/overview');
  });

  it('uses staff landing from localStorage for STAFF', () => {
    localStorage.setItem(ALLOWED_KEY, JSON.stringify(['reports']));
    expect(getTenantDashboardHomePath('STAFF')).toBe('/dashboard/reports');
  });

  it('falls back to account when role is null', () => {
    expect(getTenantDashboardHomePath(null)).toBe('/dashboard/settings/account');
  });
});
