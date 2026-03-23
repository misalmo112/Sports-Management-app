import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { clearFieldError, extractValidationErrors } from '@/shared/utils/errorUtils';
import type { StaffPayScheduleFormData, UpdateStaffPayScheduleRequest } from '../types';
import { StaffScheduleFormFields } from '../components/StaffScheduleFormFields';
import { useStaffPaySchedule, useUpdateStaffPaySchedule } from '../hooks/hooks';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

type Notice = { type: 'success' | 'error'; message: string };

function validateClient(formData: StaffPayScheduleFormData) {
  const next: Record<string, string[]> = {};
  if (!formData.coach) next.coach = ['Coach is required'];
  if (formData.amount === null || formData.amount === undefined || formData.amount < 0) next.amount = ['Amount is required'];
  if (!formData.cycle_start_date) next.cycle_start_date = ['Cycle start date is required'];
  if (formData.billing_type === 'SESSION' && !formData.sessions_per_cycle) next.sessions_per_cycle = ['Sessions per cycle is required'];
  if (formData.billing_type === 'MONTHLY' && (!formData.billing_day || formData.billing_day < 1 || formData.billing_day > 28)) {
    next.billing_day = ['Billing day (1-28) is required'];
  }
  if (formData.billing_type === 'WEEKLY' && (formData.billing_day_of_week === null || formData.billing_day_of_week === undefined)) {
    next.billing_day_of_week = ['Billing day of week is required'];
  }
  return next;
}

export function StaffPayScheduleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatDateTime } = useAcademyFormat();
  const { data: schedule, isLoading, error, refetch } = useStaffPaySchedule(id);
  const updateMutation = useUpdateStaffPaySchedule();

  const [formData, setFormData] = useState<StaffPayScheduleFormData>({
    billing_type: 'SESSION',
    cycle_start_date: '',
    sessions_per_cycle: 1,
    billing_day: 1,
    billing_day_of_week: 0,
    amount: null,
    class_scope: null,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!schedule) return;
    setFormData({
      coach: schedule.coach,
      billing_type: schedule.billing_type,
      amount: Number(schedule.amount),
      sessions_per_cycle: schedule.sessions_per_cycle ?? null,
      class_scope: schedule.class_scope ?? null,
      billing_day: schedule.billing_day ?? null,
      billing_day_of_week: schedule.billing_day_of_week ?? null,
      cycle_start_date: schedule.cycle_start_date,
      is_active: schedule.is_active,
    });
    setErrors(null);
  }, [schedule]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading staff pay schedule..." />
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
      <Button variant="ghost" onClick={() => navigate('/dashboard/management/staff/pay-schedules')}>
        ← Back to Staff Pay Schedules
      </Button>

      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Edit Staff Pay Schedule</CardTitle>
          <CardDescription>Update schedule settings for this coach payment automation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setErrors(null);
              const clientErrors = validateClient(formData);
              if (Object.keys(clientErrors).length > 0) {
                setErrors(clientErrors);
                return;
              }
              if (!id) return;

              const payload: UpdateStaffPayScheduleRequest = {
                coach: formData.coach!,
                billing_type: formData.billing_type,
                amount: formData.amount!,
                cycle_start_date: formData.cycle_start_date!,
                is_active: formData.is_active ?? true,
                sessions_per_cycle: formData.billing_type === 'SESSION' ? formData.sessions_per_cycle ?? null : undefined,
                class_scope: formData.billing_type === 'SESSION' ? formData.class_scope ?? null : undefined,
                billing_day: formData.billing_type === 'MONTHLY' ? formData.billing_day ?? null : undefined,
                billing_day_of_week: formData.billing_type === 'WEEKLY' ? formData.billing_day_of_week ?? null : undefined,
              };

              try {
                await updateMutation.mutateAsync({ id, data: payload });
                setNotice({ type: 'success', message: 'Schedule updated successfully.' });
                refetch();
              } catch (err) {
                const validation = extractValidationErrors(err);
                if (validation) setErrors(validation);
                else setErrors({ non_field_errors: ['Failed to update staff pay schedule'] });
              }
            }}
          >
            {errors?.non_field_errors ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.non_field_errors.join(' ')}</AlertDescription>
              </Alert>
            ) : null}

            <StaffScheduleFormFields
              formData={formData}
              setFormData={(next) => {
                setFormData(next);
                setErrors((prev) => (prev ? clearFieldError(prev, 'non_field_errors') : prev));
              }}
              errors={errors}
              disabled={updateMutation.isPending}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/management/staff/pay-schedules')} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>

          <div className="mt-6 rounded-md border p-4">
            <h3 className="font-semibold">Run Metadata</h3>
            <p className="text-sm text-muted-foreground">Read-only details about recent executions.</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
