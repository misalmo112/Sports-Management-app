import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { useBillingItems } from '@/features/tenant/billing/hooks/hooks';
import type { InvoiceCreationTiming, InvoiceScheduleBillingType, InvoiceScheduleFormData } from '../types';

// Note: This component is intentionally "dumb": it only edits fields and doesn't submit.
type ScheduleFormFieldsProps = {
  formData: InvoiceScheduleFormData;
  setFormData: (next: InvoiceScheduleFormData) => void;
  errors: Record<string, string[]> | null;
  disabled?: boolean;
};

const BILLING_TYPE_LABELS: Record<InvoiceScheduleBillingType, string> = {
  MONTHLY: 'Monthly',
  SESSION_BASED: 'Session-based',
};

const INVOICE_TIMING_LABELS: Record<Exclude<InvoiceCreationTiming, 'AUTO'>, string> = {
  START_OF_PERIOD: 'Start of month/session',
  ON_COMPLETION: 'When month/session is completed',
};

function getFirstError(errors: Record<string, string[]> | null, field: string) {
  return errors?.[field]?.[0];
}

export function ScheduleFormFields({ formData, setFormData, errors, disabled }: ScheduleFormFieldsProps) {
  const billingType = formData.billing_type;

  const {
    data: classesData,
    isLoading: isLoadingClasses,
    error: classesError,
    refetch: refetchClasses,
  } = useClasses({ is_active: true, page_size: 200 });

  const {
    data: billingItemsData,
    isLoading: isLoadingBillingItems,
    error: billingItemsError,
    refetch: refetchBillingItems,
  } = useBillingItems({ is_active: true, page_size: 200 });

  const classOptions = classesData?.results ?? [];
  const billingItemOptions = billingItemsData?.results ?? [];

  const hasLoading = isLoadingClasses || isLoadingBillingItems;
  const hasError = classesError || billingItemsError;

  const showError = hasError ? (classesError ?? billingItemsError) : null;

  const fieldDisabled = disabled || hasLoading;

  const setField = <K extends keyof InvoiceScheduleFormData>(field: K, value: InvoiceScheduleFormData[K]) => {
    setFormData({ ...formData, [field]: value });
  };

  const billingDayValue = formData.billing_day ?? '';
  const sessionsPerCycleValue = formData.sessions_per_cycle ?? '';

  const defaultInvoiceCreationTiming: Exclude<InvoiceCreationTiming, 'AUTO'> =
    billingType === 'SESSION_BASED' ? 'ON_COMPLETION' : 'START_OF_PERIOD';
  const invoiceCreationTimingValue =
    (formData.invoice_creation_timing ?? defaultInvoiceCreationTiming) as Exclude<InvoiceCreationTiming, 'AUTO'>;

  return (
    <div className="space-y-6">
      {hasLoading ? <LoadingState message="Loading schedule options..." /> : null}
      {showError ? (
        <ErrorState error={showError as Error} onRetry={() => (classesError ? refetchClasses() : refetchBillingItems())} title="Failed to load schedule options" />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="class_obj">
            Class <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.class_obj ? formData.class_obj.toString() : '__none__'}
            onValueChange={(v) => setField('class_obj', v === '__none__' ? undefined : Number(v))}
            disabled={fieldDisabled}
          >
            <SelectTrigger id="class_obj">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select class</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFirstError(errors, 'class_obj') ? (
            <p className="text-sm text-destructive">{getFirstError(errors, 'class_obj')}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_item">
            Billing Item <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.billing_item ? formData.billing_item.toString() : '__none__'}
            onValueChange={(v) => setField('billing_item', v === '__none__' ? undefined : Number(v))}
            disabled={fieldDisabled}
          >
            <SelectTrigger id="billing_item">
              <SelectValue placeholder="Select a billing item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select billing item</SelectItem>
              {billingItemOptions.map((bi) => (
                <SelectItem key={bi.id} value={bi.id.toString()}>
                  {bi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFirstError(errors, 'billing_item') ? (
            <p className="text-sm text-destructive">{getFirstError(errors, 'billing_item')}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billing_type">
            Billing Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={billingType}
            onValueChange={(v) => {
              const nextBillingType = v as InvoiceScheduleBillingType;
              // Absent sessions only applies to session-based logic.
              setFormData({
                ...formData,
                billing_type: nextBillingType,
                bill_absent_sessions: nextBillingType === 'SESSION_BASED' ? formData.bill_absent_sessions ?? false : false,
              });
            }}
            disabled={fieldDisabled}
          >
            <SelectTrigger id="billing_type">
              <SelectValue placeholder="Select billing type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BILLING_TYPE_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFirstError(errors, 'billing_type') ? (
            <p className="text-sm text-destructive">{getFirstError(errors, 'billing_type')}</p>
          ) : null}
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
            required
            disabled={fieldDisabled}
          />
          {getFirstError(errors, 'cycle_start_date') ? (
            <p className="text-sm text-destructive">{getFirstError(errors, 'cycle_start_date')}</p>
          ) : null}
        </div>
      </div>

      {billingType === 'SESSION_BASED' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sessions_per_cycle">
              Sessions Per Cycle <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sessions_per_cycle"
              type="number"
              min={1}
              value={sessionsPerCycleValue}
              onChange={(e) => setField('sessions_per_cycle', e.target.value === '' ? null : Number(e.target.value))}
              disabled={fieldDisabled}
              required
            />
            {getFirstError(errors, 'sessions_per_cycle') ? (
              <p className="text-sm text-destructive">{getFirstError(errors, 'sessions_per_cycle')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Bill Absent Sessions</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="bill_absent_sessions"
                checked={formData.bill_absent_sessions ?? false}
                onCheckedChange={(checked) => setField('bill_absent_sessions', checked)}
                disabled={fieldDisabled}
              />
              <span className="text-sm text-muted-foreground">
                If enabled, students are billed even when marked absent.
              </span>
            </div>
            {getFirstError(errors, 'bill_absent_sessions') ? (
              <p className="text-sm text-destructive">{getFirstError(errors, 'bill_absent_sessions')}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {billingType === 'MONTHLY' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billing_day">
              Billing Day (1-28) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="billing_day"
              type="number"
              min={1}
              max={28}
              value={billingDayValue}
              onChange={(e) => setField('billing_day', e.target.value === '' ? null : Number(e.target.value))}
              disabled={fieldDisabled}
              required
            />
            {getFirstError(errors, 'billing_day') ? (
              <p className="text-sm text-destructive">{getFirstError(errors, 'billing_day')}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">Invoices will be generated on this day of every month.</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="invoice_creation_timing">Invoice Creation Timing</Label>
        <Select
          value={invoiceCreationTimingValue}
          onValueChange={(v) => setField('invoice_creation_timing', v as InvoiceCreationTiming)}
          disabled={fieldDisabled}
        >
          <SelectTrigger id="invoice_creation_timing">
            <SelectValue placeholder="Select timing" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(INVOICE_TIMING_LABELS) as Array<[Exclude<InvoiceCreationTiming, 'AUTO'>, string]>).map(
              ([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-2">
          {billingType === 'SESSION_BASED'
            ? 'Start will generate a draft invoice when the student cycle opens; completion will generate after enough sessions are counted.'
            : 'Start will generate on billing_day; completion will generate on month end.'}
        </p>
      </div>

      <div className="flex items-center space-x-3">
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

