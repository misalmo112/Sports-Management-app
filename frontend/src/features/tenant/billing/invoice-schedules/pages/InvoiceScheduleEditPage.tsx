import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { ScheduleFormFields } from '../components/ScheduleFormFields';
import { StudentOverridesPanel } from '../components/StudentOverridesPanel';
import type { InvoiceScheduleFormData, UpdateInvoiceScheduleRequest } from '../types';
import { useInvoiceSchedule, useUpdateInvoiceSchedule } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

const validateClientSchedule = (formData: InvoiceScheduleFormData) => {
  const next: Record<string, string[]> = {};

  if (!formData.class_obj) next.class_obj = ['Class is required'];
  if (!formData.billing_item) next.billing_item = ['Billing item is required'];
  if (!formData.cycle_start_date) next.cycle_start_date = ['Cycle start date is required'];
  if (!formData.billing_type) next.billing_type = ['Billing type is required'];

  if (formData.billing_type === 'SESSION_BASED' && !formData.sessions_per_cycle) {
    next.sessions_per_cycle = ['Sessions per cycle is required'];
  }
  if (formData.billing_type === 'MONTHLY' && (!formData.billing_day || formData.billing_day < 1)) {
    next.billing_day = ['Billing day (1-28) is required'];
  }

  return next;
};

type Notice = { type: 'success' | 'error'; message: string };

export function InvoiceScheduleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scheduleId = id;

  const { formatDateTime } = useAcademyFormat();
  const { data: schedule, isLoading, error, refetch } = useInvoiceSchedule(scheduleId);
  const updateMutation = useUpdateInvoiceSchedule();

  const [formData, setFormData] = useState<InvoiceScheduleFormData>({
    billing_type: 'SESSION_BASED',
    cycle_start_date: '',
    bill_absent_sessions: false,
    sessions_per_cycle: 1,
    billing_day: 1,
    invoice_creation_timing: 'ON_COMPLETION',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!schedule) return;
    setFormData({
      class_obj: schedule.class_obj,
      billing_item: schedule.billing_item,
      billing_type: schedule.billing_type,
      sessions_per_cycle: schedule.sessions_per_cycle ?? null,
      bill_absent_sessions: schedule.bill_absent_sessions,
      billing_day: schedule.billing_day ?? null,
      cycle_start_date: schedule.cycle_start_date,
      invoice_creation_timing: schedule.invoice_creation_timing,
      is_active: schedule.is_active,
    });
    setErrors(null);
  }, [schedule]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);

    const clientErrors = validateClientSchedule(formData);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    if (!scheduleId) return;

    const data: UpdateInvoiceScheduleRequest = {
      class_obj: formData.class_obj!,
      billing_item: formData.billing_item!,
      billing_type: formData.billing_type,
      cycle_start_date: formData.cycle_start_date!,
      bill_absent_sessions: formData.bill_absent_sessions ?? false,
      is_active: formData.is_active ?? true,
      sessions_per_cycle:
        formData.billing_type === 'SESSION_BASED' ? formData.sessions_per_cycle ?? null : undefined,
      billing_day: formData.billing_type === 'MONTHLY' ? formData.billing_day ?? null : undefined,
      invoice_creation_timing: formData.invoice_creation_timing,
    };

    try {
      await updateMutation.mutateAsync({ id: scheduleId, data });
      setNotice({ type: 'success', message: 'Schedule updated successfully.' });
      refetch();
    } catch (err) {
      const validationErrors = extractValidationErrors(err);
      if (validationErrors) setErrors(validationErrors);
      else setErrors({ non_field_errors: ['Failed to update invoice schedule'] });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading invoice schedule..." />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState error={error || new Error('Schedule not found')} onRetry={() => refetch()} title="Failed to load schedule" fullPage />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" onClick={() => navigate('/dashboard/operations/invoice-schedules')}>
          ← Back to Invoice Schedules
        </Button>
      </div>

      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Edit Invoice Schedule</CardTitle>
          <CardDescription>Update schedule settings and student discount overrides.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors?.non_field_errors ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            ) : null}

            <ScheduleFormFields
              formData={formData}
              setFormData={(next) => {
                setFormData(next);
                setErrors((prev) => (prev ? clearFieldError(prev, 'non_field_errors') : prev));
              }}
              errors={errors}
              disabled={updateMutation.isPending}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/operations/invoice-schedules')} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>

          <div className="mt-6 rounded-md border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Run Metadata</h3>
                <p className="text-sm text-muted-foreground">Read-only details about the latest executions.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Last run at</div>
                <div className="font-medium">{schedule.last_run_at ? formatDateTime(schedule.last_run_at) : '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Next run at</div>
                <div className="font-medium">{schedule.next_run_at ? formatDateTime(schedule.next_run_at) : '—'}</div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <StudentOverridesPanel scheduleId={schedule.id} billingType={schedule.billing_type} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

