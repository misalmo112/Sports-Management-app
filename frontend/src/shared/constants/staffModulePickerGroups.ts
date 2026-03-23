/**
 * Staff module picker: groups aligned with navigationConfig.ADMIN (module key = nav item id).
 */
import { navigationConfig } from '@/shared/nav/navigation';
import { STAFF_ASSIGNABLE_MODULE_KEYS } from '@/shared/constants/moduleKeys';

export interface StaffModulePickerModule {
  key: string;
  label: string;
}

export interface StaffModulePickerGroup {
  groupId: string;
  groupLabel: string;
  modules: StaffModulePickerModule[];
}

export interface StaffModulePreset {
  id: string;
  label: string;
  keys: readonly string[];
}

const assignableSet = new Set(STAFF_ASSIGNABLE_MODULE_KEYS);

export function getStaffModulePickerGroups(): StaffModulePickerGroup[] {
  return navigationConfig.ADMIN.map((group) => ({
    groupId: group.id,
    groupLabel: group.label,
    modules: group.items
      .filter((item) => item.id !== 'my-account' && assignableSet.has(item.id))
      .map((item) => ({ key: item.id, label: item.label })),
  })).filter((g) => g.modules.length > 0);
}

function buildStaffModulePresets(): StaffModulePreset[] {
  const groups = getStaffModulePickerGroups();
  const keysForNavGroup = (navGroupId: string): readonly string[] =>
    groups.find((g) => g.groupId === navGroupId)?.modules.map((m) => m.key) ?? [];

  return [
    { id: 'overview', label: 'Overview', keys: keysForNavGroup('overview') },
    { id: 'operations', label: 'Operations', keys: keysForNavGroup('operations') },
    { id: 'finance', label: 'Finance', keys: keysForNavGroup('finance') },
    { id: 'management', label: 'Management', keys: keysForNavGroup('management') },
    { id: 'settings', label: 'Settings', keys: keysForNavGroup('settings') },
  ].filter((p) => p.keys.length > 0);
}

/** Presets merge into selection; each key set is assignable-only and nav-aligned. */
export const STAFF_MODULE_PRESETS: StaffModulePreset[] = buildStaffModulePresets();

export function getStaffModulePresets(): readonly StaffModulePreset[] {
  return STAFF_MODULE_PRESETS;
}

/** Read-only grouping: only sections with at least one assigned key. */
export function getStaffModuleDisplayGroups(
  selectedKeys: string[],
): StaffModulePickerGroup[] {
  const selected = new Set(selectedKeys);
  return getStaffModulePickerGroups()
    .map((g) => ({
      ...g,
      modules: g.modules.filter((m) => selected.has(m.key)),
    }))
    .filter((g) => g.modules.length > 0);
}
