/**
 * Plan limits form fields (max students, coaches, admins, classes, storage in GB).
 * Used on plan create and plan edit pages.
 */
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import type { PlanLimits } from '../types';

const BYTES_PER_GB = 1024 ** 3;

export interface PlanLimitsFieldsProps {
  value: PlanLimits;
  onChange: (limits: PlanLimits) => void;
  errors?: Record<string, string[]>;
}

export function PlanLimitsFields({ value, onChange, errors }: PlanLimitsFieldsProps) {
  const update = (key: keyof PlanLimits, val: number | undefined) => {
    onChange({ ...value, [key]: val });
  };

  const storageGb =
    typeof value.storage_bytes === 'number' && value.storage_bytes >= 0
      ? value.storage_bytes / BYTES_PER_GB
      : '';

  const handleStorageGbChange = (input: string) => {
    const parsed = input === '' ? undefined : parseFloat(input);
    if (parsed === undefined || (!Number.isNaN(parsed) && parsed >= 0)) {
      update(
        'storage_bytes',
        parsed !== undefined && !Number.isNaN(parsed) ? Math.round(parsed * BYTES_PER_GB) : undefined
      );
    }
  };

  const limitErrors = errors?.limits_json;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="plan-limits-max-students">Max students</Label>
          <Input
            id="plan-limits-max-students"
            type="number"
            min={0}
            step={1}
            value={value.max_students ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
              update('max_students', v !== undefined && !Number.isNaN(v) ? v : undefined);
            }}
            aria-describedby={limitErrors ? 'plan-limits-errors' : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-limits-max-coaches">Max coaches</Label>
          <Input
            id="plan-limits-max-coaches"
            type="number"
            min={0}
            step={1}
            value={value.max_coaches ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
              update('max_coaches', v !== undefined && !Number.isNaN(v) ? v : undefined);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-limits-max-admins">Max admins</Label>
          <Input
            id="plan-limits-max-admins"
            type="number"
            min={0}
            step={1}
            value={value.max_admins ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
              update('max_admins', v !== undefined && !Number.isNaN(v) ? v : undefined);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-limits-max-classes">Max classes</Label>
          <Input
            id="plan-limits-max-classes"
            type="number"
            min={0}
            step={1}
            value={value.max_classes ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
              update('max_classes', v !== undefined && !Number.isNaN(v) ? v : undefined);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-limits-storage-gb">Storage (GB)</Label>
          <Input
            id="plan-limits-storage-gb"
            type="number"
            min={0}
            step={0.1}
            value={storageGb}
            onChange={(e) => handleStorageGbChange(e.target.value)}
          />
        </div>
      </div>
      {limitErrors && limitErrors.length > 0 && (
        <p id="plan-limits-errors" className="text-sm text-destructive">
          {limitErrors[0]}
        </p>
      )}
    </div>
  );
}
