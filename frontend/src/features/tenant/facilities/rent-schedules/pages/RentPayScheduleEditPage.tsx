import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { AlertCircle } from 'lucide-react';
import { clearFieldError, extractValidationErrors } from '@/shared/utils/errorUtils';
import type { RentPayScheduleFormData, UpdateRentPayScheduleRequest } from '../types';
import { RentScheduleFormFields } from '../components/RentScheduleFormFields';
import { useRentPaySchedule, useUpdateRentPaySchedule } from '../hooks/hooks';

export function RentPayScheduleEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const scheduleId = id ? Number(id) : NaN;

  const { data: schedule, isLoading, error, refetch } = useRentPaySchedule(scheduleId);
  const updateMutation = useUpdateRentPaySchedule();

  const [formData, setFormData] = useState<RentPayScheduleFormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    if (!schedule) return;
    setFormData({
      location: schedule.location,
      billing_type: schedule.billing_type,
      amount: Number(schedule.amount),
      currency: schedule.currency,
      sessions_per_invoice: schedule.sessions_per_invoice ?? null,
      billing_day: schedule.billing_day ?? null,
      due_date_offset_days: schedule.due_date_offset_days,
      cycle_start_date: schedule.cycle_start_date,
      is_active: schedule.is_active,
    });
  }, [schedule]);

  const validateClient = () => {
    const next: Record<string, string[]> = {};
    if (!formData) return next;
    if (!formData.location) next.location = ['Location is required'];
    if (formData.amount === null || formData.amount === undefined || formData.amount < 0) next.amount = ['Amount is required'];
    if (!formData.cycle_start_date) next.cycle_start_date = ['Cycle start date is required'];
    if (formData.billing_type === 'SESSION' && (!formData.sessions_per_invoice || formData.sessions_per_invoice < 1)) {
      next.sessions_per_invoice = ['Sessions per invoice must be at least 1'];
    }
    if (formData.billing_type === 'MONTHLY' && (!formData.billing_day || formData.billing_day < 1 || formData.billing_day > 28)) {
      next.billing_day = ['Billing day (1–28) is required'];
    }
    return next;
  };

  if (!Number.isFinite(scheduleId)) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <ErrorState error={new Error('Invalid schedule')} title="Not found" />
        <Button type="button" variant="outline" onClick={() => navigate('/dashboard/operations/rent-schedules')}>
          Back to Rent Schedules
        </Button>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} title="Failed to load schedule" />;
  }

  if (isLoading || !formData) {
    return <LoadingState message="Loading schedule…" />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/operations/rent-schedules')}>
        ← Back to Rent Schedules
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit rent pay schedule</CardTitle>
          <CardDescription>Update billing rules for {schedule?.location_name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setErrors(null);
              const clientErrors = validateClient();
              if (Object.keys(clientErrors).length > 0) {
                setErrors(clientErrors);
                return;
              }
              if (!formData) return;

              const payload: UpdateRentPayScheduleRequest = {
                location: formData.location,
                billing_type: formData.billing_type,
                amount: formData.amount!,
                currency: formData.currency || 'AED',
                cycle_start_date: formData.cycle_start_date,
                due_date_offset_days: formData.due_date_offset_days ?? 30,
                is_active: formData.is_active,
                sessions_per_invoice: formData.billing_type === 'SESSION' ? formData.sessions_per_invoice ?? null : null,
                billing_day: formData.billing_type === 'MONTHLY' ? formData.billing_day ?? null : null,
              };

              try {
                await updateMutation.mutateAsync({ id: scheduleId, data: payload });
                navigate('/dashboard/operations/rent-schedules');
              } catch (err) {
                const validation = extractValidationErrors(err);
                if (validation) setErrors(validation);
                else setErrors({ non_field_errors: ['Failed to update schedule'] });
              }
            }}
          >
            {errors?.non_field_errors ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.non_field_errors.join(' ')}</AlertDescription>
              </Alert>
            ) : null}

            <RentScheduleFormFields
              formData={formData}
              setFormData={(next) => {
                setFormData((prev) => {
                  if (!prev) return prev;
                  const resolved = typeof next === 'function' ? next(prev) : next;
                  return resolved;
                });
                setErrors((e) => (e ? clearFieldError(e, 'non_field_errors') : e));
              }}
              errors={errors}
              disabled={updateMutation.isPending}
              enableRentConfigAutofill={false}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/operations/rent-schedules')} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
