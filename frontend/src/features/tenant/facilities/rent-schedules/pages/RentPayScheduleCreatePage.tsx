import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { clearFieldError, extractValidationErrors } from '@/shared/utils/errorUtils';
import type { CreateRentPayScheduleRequest, RentPayScheduleFormData } from '../types';
import { RentScheduleFormFields } from '../components/RentScheduleFormFields';
import { useCreateRentPaySchedule } from '../hooks/hooks';

const todayDate = () => new Date().toISOString().slice(0, 10);

export function RentPayScheduleCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateRentPaySchedule();
  const [formData, setFormData] = useState<RentPayScheduleFormData>({
    billing_type: 'MONTHLY',
    cycle_start_date: todayDate(),
    amount: null,
    billing_day: 1,
    sessions_per_invoice: 1,
    due_date_offset_days: 30,
    currency: 'AED',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  const validateClient = () => {
    const next: Record<string, string[]> = {};
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/operations/rent-schedules')}>
        ← Back to Rent Schedules
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New rent pay schedule</CardTitle>
          <CardDescription>Configure automated rent invoicing for a location.</CardDescription>
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

              const payload: CreateRentPayScheduleRequest = {
                location: formData.location!,
                billing_type: formData.billing_type,
                amount: formData.amount!,
                currency: formData.currency || 'AED',
                cycle_start_date: formData.cycle_start_date!,
                due_date_offset_days: formData.due_date_offset_days ?? 30,
                is_active: formData.is_active ?? true,
                sessions_per_invoice: formData.billing_type === 'SESSION' ? formData.sessions_per_invoice ?? null : null,
                billing_day: formData.billing_type === 'MONTHLY' ? formData.billing_day ?? null : null,
              };

              try {
                const created = await createMutation.mutateAsync(payload);
                navigate(`/dashboard/operations/rent-schedules/${created.id}/edit`);
              } catch (err) {
                const validation = extractValidationErrors(err);
                if (validation) setErrors(validation);
                else setErrors({ non_field_errors: ['Failed to create schedule'] });
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
                setFormData(next);
                setErrors((prev) => (prev ? clearFieldError(prev, 'non_field_errors') : prev));
              }}
              errors={errors}
              disabled={createMutation.isPending}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/operations/rent-schedules')} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
