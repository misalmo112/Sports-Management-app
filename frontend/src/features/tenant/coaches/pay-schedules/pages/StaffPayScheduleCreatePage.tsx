import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { clearFieldError, extractValidationErrors } from '@/shared/utils/errorUtils';
import type { CreateStaffPayScheduleRequest, StaffPayScheduleFormData } from '../types';
import { StaffScheduleFormFields } from '../components/StaffScheduleFormFields';
import { useCreateStaffPaySchedule } from '../hooks/hooks';

const todayDate = () => new Date().toISOString().slice(0, 10);

export function StaffPayScheduleCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateStaffPaySchedule();
  const [formData, setFormData] = useState<StaffPayScheduleFormData>({
    billing_type: 'SESSION',
    cycle_start_date: todayDate(),
    sessions_per_cycle: 1,
    billing_day: 1,
    billing_day_of_week: 0,
    amount: null,
    class_scope: null,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  const validateClient = () => {
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
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/management/staff/pay-schedules')}>
        ← Back to Staff Pay Schedules
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Staff Pay Schedule</CardTitle>
          <CardDescription>Configure an automated schedule for coach payments.</CardDescription>
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

              const payload: CreateStaffPayScheduleRequest = {
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
                const created = await createMutation.mutateAsync(payload);
                navigate(`/dashboard/management/staff/pay-schedules/${created.id}/edit`);
              } catch (err) {
                const validation = extractValidationErrors(err);
                if (validation) setErrors(validation);
                else setErrors({ non_field_errors: ['Failed to create staff pay schedule'] });
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
              disabled={createMutation.isPending}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/management/staff/pay-schedules')} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
