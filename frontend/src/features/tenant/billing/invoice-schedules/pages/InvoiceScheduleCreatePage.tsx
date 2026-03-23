import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { ScheduleFormFields } from '../components/ScheduleFormFields';
import type { CreateInvoiceScheduleRequest, InvoiceScheduleFormData } from '../types';
import { useCreateInvoiceSchedule } from '../hooks/hooks';

const todayDate = () => new Date().toISOString().slice(0, 10);

export function InvoiceScheduleCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateInvoiceSchedule();

  const [formData, setFormData] = useState<InvoiceScheduleFormData>({
    billing_type: 'SESSION_BASED',
    cycle_start_date: todayDate(),
    bill_absent_sessions: false,
    sessions_per_cycle: 1,
    billing_day: 1,
    invoice_creation_timing: 'ON_COMPLETION',
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  const validateClient = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const payload: CreateInvoiceScheduleRequest = {
      class_obj: formData.class_obj!,
      billing_item: formData.billing_item!,
      billing_type: formData.billing_type,
      cycle_start_date: formData.cycle_start_date!,
      is_active: formData.is_active ?? true,
      bill_absent_sessions: formData.bill_absent_sessions ?? false,
      sessions_per_cycle:
        formData.billing_type === 'SESSION_BASED' ? formData.sessions_per_cycle ?? null : undefined,
      billing_day: formData.billing_type === 'MONTHLY' ? formData.billing_day ?? null : undefined,
      invoice_creation_timing: formData.invoice_creation_timing,
    };

    try {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/dashboard/operations/invoice-schedules/${created.id}/edit`);
    } catch (error: unknown) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) setErrors(validationErrors);
      else setErrors({ non_field_errors: ['Failed to create invoice schedule'] });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" onClick={() => navigate('/dashboard/operations/invoice-schedules')}>
          ← Back to Invoice Schedules
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Invoice Schedule</CardTitle>
          <CardDescription>Configure an invoice schedule to auto-generate draft invoices.</CardDescription>
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
              disabled={createMutation.isPending}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/operations/invoice-schedules')}
                disabled={createMutation.isPending}
              >
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

