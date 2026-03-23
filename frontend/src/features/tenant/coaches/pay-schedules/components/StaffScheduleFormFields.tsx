import { useEffect, useMemo } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { useCoachPaySchemes, useCoaches } from '@/features/tenant/coaches/hooks/hooks';
import type {
  CoachPaySchemePeriodType,
  StaffPayScheduleBillingType,
  StaffPayScheduleFormData,
} from '../types';

type StaffScheduleFormFieldsProps = {
  formData: StaffPayScheduleFormData;
  setFormData: (next: StaffPayScheduleFormData) => void;
  errors: Record<string, string[]> | null;
  disabled?: boolean;
};

const BILLING_TYPE_LABELS: Record<StaffPayScheduleBillingType, string> = {
  SESSION: 'Per Session',
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
};

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

function getFirstError(errors: Record<string, string[]> | null, field: string) {
  return errors?.[field]?.[0];
}

function billingToPeriodType(billingType: StaffPayScheduleBillingType): CoachPaySchemePeriodType {
  if (billingType === 'MONTHLY') return 'MONTH';
  if (billingType === 'WEEKLY') return 'WEEK';
  return 'SESSION';
}

export function StaffScheduleFormFields({
  formData,
  setFormData,
  errors,
  disabled,
}: StaffScheduleFormFieldsProps) {
  const selectedCoachId = formData.coach;
  const selectedBillingType = formData.billing_type;

  const {
    data: coachesData,
    isLoading: isCoachesLoading,
    error: coachesError,
    refetch: refetchCoaches,
  } = useCoaches({ is_active: true, page_size: 500 });

  const {
    data: paySchemesData,
    isLoading: isPaySchemesLoading,
    error: paySchemesError,
    refetch: refetchPaySchemes,
  } = useCoachPaySchemes({ page_size: 500 });

  const {
    data: scopedClassesData,
    isLoading: isScopedClassesLoading,
    error: scopedClassesError,
    refetch: refetchScopedClasses,
  } = useClasses({
    is_active: true,
    coach: selectedCoachId,
    page_size: 200,
  });

  const hasLoading = isCoachesLoading || isPaySchemesLoading;
  const hasError = coachesError || paySchemesError;
  const showError = hasError ? (coachesError ?? paySchemesError) : null;
  const fieldDisabled = disabled || hasLoading;

  const coaches = coachesData?.results ?? [];
  const scopedClasses = scopedClassesData?.results ?? [];
  const periodType = billingToPeriodType(selectedBillingType);

  const schemeAmount = useMemo(() => {
    if (!selectedCoachId) return undefined;
    const allSchemes = paySchemesData?.results ?? [];
    const scheme = allSchemes.find((s) => s.coach === selectedCoachId && s.period_type === periodType);
    if (!scheme) return undefined;
    const parsed = Number(scheme.amount);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [paySchemesData, periodType, selectedCoachId]);

  useEffect(() => {
    if (schemeAmount === undefined) return;
    setFormData({ ...formData, amount: schemeAmount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeAmount]);

  const setField = <K extends keyof StaffPayScheduleFormData>(field: K, value: StaffPayScheduleFormData[K]) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      {hasLoading ? <LoadingState message="Loading staff schedule options..." /> : null}
      {showError ? (
        <ErrorState
          error={showError as Error}
          onRetry={() => (coachesError ? refetchCoaches() : refetchPaySchemes())}
          title="Failed to load schedule options"
        />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="coach">
            Coach <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.coach ? String(formData.coach) : '__none__'}
            onValueChange={(v) => setField('coach', v === '__none__' ? undefined : Number(v))}
            disabled={fieldDisabled}
          >
            <SelectTrigger id="coach">
              <SelectValue placeholder="Select coach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select coach</SelectItem>
              {coaches.map((coach) => (
                <SelectItem key={coach.id} value={String(coach.id)}>
                  {coach.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFirstError(errors, 'coach') ? <p className="text-sm text-destructive">{getFirstError(errors, 'coach')}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_type">
            Billing Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.billing_type}
            onValueChange={(v) => {
              const next = v as StaffPayScheduleBillingType;
              setFormData({
                ...formData,
                billing_type: next,
                sessions_per_cycle: next === 'SESSION' ? formData.sessions_per_cycle ?? 1 : null,
                class_scope: next === 'SESSION' ? formData.class_scope ?? null : null,
                billing_day: next === 'MONTHLY' ? formData.billing_day ?? 1 : null,
                billing_day_of_week: next === 'WEEKLY' ? formData.billing_day_of_week ?? 0 : null,
              });
            }}
            disabled={fieldDisabled}
          >
            <SelectTrigger id="billing_type">
              <SelectValue placeholder="Select billing type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BILLING_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFirstError(errors, 'billing_type') ? <p className="text-sm text-destructive">{getFirstError(errors, 'billing_type')}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="amount"
            type="number"
            min={0}
            step="0.01"
            value={formData.amount ?? ''}
            onChange={(e) => setField('amount', e.target.value === '' ? null : Number(e.target.value))}
            disabled={fieldDisabled}
          />
          <p className="text-xs text-muted-foreground">
            Auto-filled from the selected coach pay scheme when available.
          </p>
          {getFirstError(errors, 'amount') ? <p className="text-sm text-destructive">{getFirstError(errors, 'amount')}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cycle_start_date">
            Cycle Start Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cycle_start_date"
            type="date"
            value={formData.cycle_start_date ?? ''}
            onChange={(e) => setField('cycle_start_date', e.target.value || undefined)}
            disabled={fieldDisabled}
          />
          {getFirstError(errors, 'cycle_start_date') ? (
            <p className="text-sm text-destructive">{getFirstError(errors, 'cycle_start_date')}</p>
          ) : null}
        </div>
      </div>

      {selectedBillingType === 'SESSION' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sessions_per_cycle">
              Sessions Per Cycle <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sessions_per_cycle"
              type="number"
              min={1}
              value={formData.sessions_per_cycle ?? ''}
              onChange={(e) => setField('sessions_per_cycle', e.target.value === '' ? null : Number(e.target.value))}
              disabled={fieldDisabled}
            />
            {getFirstError(errors, 'sessions_per_cycle') ? (
              <p className="text-sm text-destructive">{getFirstError(errors, 'sessions_per_cycle')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_scope">Session Class Scope</Label>
            {isScopedClassesLoading ? (
              <LoadingState message="Loading coach classes..." />
            ) : scopedClassesError ? (
              <ErrorState error={scopedClassesError} onRetry={() => refetchScopedClasses()} title="Failed to load coach classes" />
            ) : (
              <Select
                value={formData.class_scope ? String(formData.class_scope) : '__all__'}
                onValueChange={(v) => setField('class_scope', v === '__all__' ? null : Number(v))}
                disabled={fieldDisabled || !selectedCoachId}
              >
                <SelectTrigger id="class_scope">
                  <SelectValue placeholder={selectedCoachId ? 'Select class scope' : 'Select coach first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All assigned classes</SelectItem>
                  {scopedClasses.map((classItem) => (
                    <SelectItem key={classItem.id} value={String(classItem.id)}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Only classes assigned to the selected coach are available.
            </p>
            {getFirstError(errors, 'class_scope') ? <p className="text-sm text-destructive">{getFirstError(errors, 'class_scope')}</p> : null}
          </div>
        </div>
      ) : null}

      {selectedBillingType === 'MONTHLY' ? (
        <div className="space-y-2">
          <Label htmlFor="billing_day">
            Billing Day (1-28) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="billing_day"
            type="number"
            min={1}
            max={28}
            value={formData.billing_day ?? ''}
            onChange={(e) => setField('billing_day', e.target.value === '' ? null : Number(e.target.value))}
            disabled={fieldDisabled}
          />
          {getFirstError(errors, 'billing_day') ? <p className="text-sm text-destructive">{getFirstError(errors, 'billing_day')}</p> : null}
        </div>
      ) : null}

      {selectedBillingType === 'WEEKLY' ? (
        <div className="space-y-2">
          <Label htmlFor="billing_day_of_week">
            Billing Day Of Week <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.billing_day_of_week !== null && formData.billing_day_of_week !== undefined ? String(formData.billing_day_of_week) : '__none__'}
            onValueChange={(v) => setField('billing_day_of_week', v === '__none__' ? null : Number(v))}
            disabled={fieldDisabled}
          >
            <SelectTrigger id="billing_day_of_week">
              <SelectValue placeholder="Select day of week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select day</SelectItem>
              {DAY_OF_WEEK_OPTIONS.map((day) => (
                <SelectItem key={day.value} value={String(day.value)}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFirstError(errors, 'billing_day_of_week') ? (
            <p className="text-sm text-destructive">{getFirstError(errors, 'billing_day_of_week')}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Switch
          id="is_active"
          checked={formData.is_active ?? true}
          onCheckedChange={(checked) => setField('is_active', checked)}
          disabled={fieldDisabled}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </div>
  );
}
