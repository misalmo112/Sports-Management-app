import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { useRentConfigs } from '@/features/tenant/facilities/hooks/hooks';
import { useLocations } from '@/features/tenant/settings/hooks/hooks';
import type { RentPayScheduleBillingType, RentPayScheduleFormData } from '../types';

type RentScheduleFormFieldsProps = {
  formData: RentPayScheduleFormData;
  setFormData: Dispatch<SetStateAction<RentPayScheduleFormData>>;
  errors: Record<string, string[]> | null;
  disabled?: boolean;
  /** When false, do not overwrite amount/currency from FacilityRentConfig (e.g. edit screen). */
  enableRentConfigAutofill?: boolean;
};

const BILLING_LABELS: Record<RentPayScheduleBillingType, string> = {
  MONTHLY: 'Monthly',
  DAILY: 'Daily',
  SESSION: 'Per Session',
};

function billingToRentConfigPeriodType(bt: RentPayScheduleBillingType): 'DAY' | 'MONTH' | 'SESSION' {
  if (bt === 'DAILY') return 'DAY';
  if (bt === 'MONTHLY') return 'MONTH';
  return 'SESSION';
}

function firstError(errors: Record<string, string[]> | null, field: string) {
  return errors?.[field]?.[0];
}

export function RentScheduleFormFields({
  formData,
  setFormData,
  errors,
  disabled,
  enableRentConfigAutofill = true,
}: RentScheduleFormFieldsProps) {
  const locId = formData.location;
  const billing = formData.billing_type;
  const periodType = billingToRentConfigPeriodType(billing);

  const {
    data: locationsData,
    isLoading: locLoading,
    error: locError,
    refetch: refetchLoc,
  } = useLocations({ page_size: 200 });

  const {
    data: configsData,
    isLoading: cfgLoading,
    error: cfgError,
    refetch: refetchCfg,
  } = useRentConfigs({
    location: locId,
    period_type: periodType,
    is_active: true,
    page_size: 20,
  });

  const locations = locationsData?.results ?? [];
  const matchingConfig = useMemo(() => {
    const list = configsData?.results ?? [];
    return list.find((c) => c.location === locId && c.period_type === periodType);
  }, [configsData, locId, periodType]);

  useEffect(() => {
    if (!enableRentConfigAutofill) return;
    if (!locId || !matchingConfig) return;
    const amt = Number(matchingConfig.amount);
    if (!Number.isFinite(amt)) return;
    const cur = matchingConfig.currency || 'AED';
    setFormData((prev) => {
      if (prev.amount === amt && (prev.currency || 'AED') === cur) return prev;
      return { ...prev, amount: amt, currency: cur };
    });
  }, [enableRentConfigAutofill, locId, matchingConfig?.id, matchingConfig?.amount, matchingConfig?.currency, periodType, setFormData]);

  const loading = locLoading || (locId ? cfgLoading : false);
  const err = locError || (locId ? cfgError : null);
  const fieldDisabled = disabled || loading;

  if (err) {
    return <ErrorState error={err} onRetry={() => (locId ? refetchCfg() : refetchLoc())} title="Failed to load form data" />;
  }

  return (
    <div className="space-y-6">
      {loading ? <LoadingState message="Loading locations and rent defaults…" /> : null}

      <div className="space-y-2">
        <Label>Location</Label>
        <Select
          value={locId ? String(locId) : ''}
          onValueChange={(v) => setFormData({ ...formData, location: v ? Number(v) : undefined })}
          disabled={fieldDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {firstError(errors, 'location') ? <p className="text-sm text-destructive">{firstError(errors, 'location')}</p> : null}
        <p className="text-xs text-muted-foreground">Auto-filled amount and currency come from Facility Rent Config for the selected billing type.</p>
      </div>

      <div className="space-y-2">
        <Label>Billing type</Label>
        <Select
          value={billing}
          onValueChange={(v) =>
            setFormData({
              ...formData,
              billing_type: v as RentPayScheduleBillingType,
              sessions_per_invoice: v === 'SESSION' ? formData.sessions_per_invoice ?? 1 : null,
              billing_day: v === 'MONTHLY' ? formData.billing_day ?? 1 : null,
            })
          }
          disabled={fieldDisabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(BILLING_LABELS) as RentPayScheduleBillingType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {BILLING_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {firstError(errors, 'billing_type') ? <p className="text-sm text-destructive">{firstError(errors, 'billing_type')}</p> : null}
      </div>

      <div className="space-y-2">
        <Label>Amount ({formData.currency ?? 'AED'})</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={formData.amount ?? ''}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? null : Number(e.target.value) })}
          disabled={fieldDisabled}
        />
        {firstError(errors, 'amount') ? <p className="text-sm text-destructive">{firstError(errors, 'amount')}</p> : null}
      </div>

      {billing === 'SESSION' ? (
        <div className="space-y-2">
          <Label>Sessions per invoice</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={formData.sessions_per_invoice ?? ''}
            onChange={(e) =>
              setFormData({ ...formData, sessions_per_invoice: e.target.value ? Number(e.target.value) : null })
            }
            disabled={fieldDisabled}
          />
          <p className="text-xs text-muted-foreground">Invoice is created after this many distinct class sessions at the location.</p>
          {firstError(errors, 'sessions_per_invoice') ? (
            <p className="text-sm text-destructive">{firstError(errors, 'sessions_per_invoice')}</p>
          ) : null}
        </div>
      ) : null}

      {billing === 'MONTHLY' ? (
        <div className="space-y-2">
          <Label>Billing day (1–28)</Label>
          <Input
            type="number"
            min={1}
            max={28}
            step={1}
            value={formData.billing_day ?? ''}
            onChange={(e) => setFormData({ ...formData, billing_day: e.target.value ? Number(e.target.value) : null })}
            disabled={fieldDisabled}
          />
          <p className="text-xs text-muted-foreground">Draft invoice is generated on this calendar day each month.</p>
          {firstError(errors, 'billing_day') ? <p className="text-sm text-destructive">{firstError(errors, 'billing_day')}</p> : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Due date (NET days)</Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={formData.due_date_offset_days ?? 30}
          onChange={(e) => setFormData({ ...formData, due_date_offset_days: Number(e.target.value) || 30 })}
          disabled={fieldDisabled}
        />
        <p className="text-xs text-muted-foreground">Due date = issue date + this many days (e.g. 30 = NET 30).</p>
        {firstError(errors, 'due_date_offset_days') ? (
          <p className="text-sm text-destructive">{firstError(errors, 'due_date_offset_days')}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Cycle start date</Label>
        <Input
          type="date"
          value={formData.cycle_start_date ?? ''}
          onChange={(e) => setFormData({ ...formData, cycle_start_date: e.target.value })}
          disabled={fieldDisabled}
        />
        <p className="text-xs text-muted-foreground">Sessions and dates before this are ignored.</p>
        {firstError(errors, 'cycle_start_date') ? <p className="text-sm text-destructive">{firstError(errors, 'cycle_start_date')}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_active ?? true}
          onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
          disabled={fieldDisabled}
        />
        <Label>Active</Label>
      </div>
    </div>
  );
}
