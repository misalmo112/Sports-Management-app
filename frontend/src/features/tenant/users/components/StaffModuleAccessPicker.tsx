/**
 * Grouped module checkboxes + presets for STAFF allowed_modules (keys only on wire).
 */
import { Button } from '@/shared/components/ui/button';
import {
  getStaffModulePickerGroups,
  STAFF_MODULE_PRESETS,
} from '@/shared/constants/staffModulePickerGroups';

export interface StaffModuleAccessPickerProps {
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
  errorMessage?: string;
}

export function StaffModuleAccessPicker({
  selectedKeys,
  onChange,
  disabled = false,
  errorMessage,
}: StaffModuleAccessPickerProps) {
  const groups = getStaffModulePickerGroups();

  const mergePreset = (keys: readonly string[]) => {
    onChange(Array.from(new Set([...selectedKeys, ...keys])));
  };

  const toggleKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {STAFF_MODULE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => mergePreset(preset.keys)}
          >
            Add {preset.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Presets add all modules in that area; you can still adjust individual checkboxes.
      </p>
      <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-4">
        {groups.map((group) => (
          <div key={group.groupId} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {group.groupLabel}
            </p>
            <div className="space-y-2 pl-0">
              {group.modules.map((mod) => (
                <label
                  key={mod.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={selectedKeys.includes(mod.key)}
                    onChange={() => toggleKey(mod.key)}
                    disabled={disabled}
                  />
                  <span>{mod.label}</span>
                  <span className="text-muted-foreground text-xs">({mod.key})</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
