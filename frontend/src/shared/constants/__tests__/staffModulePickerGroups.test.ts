/**
 * Staff module picker groups / presets — nav-aligned, assignable-only.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', async (importOriginal) => importOriginal<typeof import('lucide-react')>());
import {
  getStaffModulePickerGroups,
  getStaffModulePresets,
  STAFF_MODULE_PRESETS,
  getStaffModuleDisplayGroups,
} from '../staffModulePickerGroups';
import {
  STAFF_ASSIGNABLE_MODULE_KEYS,
  FORBIDDEN_STAFF_MODULES,
} from '../moduleKeys';

describe('getStaffModulePickerGroups', () => {
  it('union of group keys equals STAFF_ASSIGNABLE_MODULE_KEYS exactly once each', () => {
    const groups = getStaffModulePickerGroups();
    const fromGroups = groups.flatMap((g) => g.modules.map((m) => m.key));
    const unique = new Set(fromGroups);
    expect(fromGroups.length).toBe(unique.size);
    expect(unique).toEqual(new Set(STAFF_ASSIGNABLE_MODULE_KEYS));
  });

  it('does not expose my-account or forbidden staff modules', () => {
    const keys = getStaffModulePickerGroups().flatMap((g) => g.modules.map((m) => m.key));
    expect(keys).not.toContain('my-account');
    for (const forbidden of FORBIDDEN_STAFF_MODULES) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('returns stable group count for regression', () => {
    expect(getStaffModulePickerGroups()).toHaveLength(6);
  });
});

describe('STAFF_MODULE_PRESETS', () => {
  it('every preset key is assignable; none forbidden', () => {
    const assignable = new Set(STAFF_ASSIGNABLE_MODULE_KEYS);
    for (const preset of STAFF_MODULE_PRESETS) {
      for (const key of preset.keys) {
        expect(assignable.has(key)).toBe(true);
        expect(FORBIDDEN_STAFF_MODULES).not.toContain(key);
        expect(key).not.toBe('my-account');
      }
    }
  });

  it('getStaffModulePresets matches STAFF_MODULE_PRESETS', () => {
    expect(getStaffModulePresets()).toBe(STAFF_MODULE_PRESETS);
    expect(STAFF_MODULE_PRESETS.length).toBeGreaterThan(0);
  });
});

describe('getStaffModuleDisplayGroups', () => {
  it('returns only groups that contain selected keys', () => {
    const grouped = getStaffModuleDisplayGroups(['students', 'invoices']);
    expect(grouped.map((g) => g.groupId).sort()).toEqual(['finance', 'operations']);
  });

  it('orders modules within group by nav order', () => {
    const [ops] = getStaffModuleDisplayGroups(['attendance', 'students']);
    expect(ops.modules.map((m) => m.key)).toEqual(['students', 'attendance']);
  });
});
