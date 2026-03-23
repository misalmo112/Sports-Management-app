import { useEffect, useState, type FormEvent } from 'react';
import { useAcademyTaxSettings, useUpdateAcademyTaxSettings } from '../hooks/hooks';
import type { UpdateAcademyTaxSettingsRequest } from '../types';

import { PageShell } from '@/shared/components/common/PageShell';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { extractValidationErrors, formatErrorMessage } from '@/shared/utils/errorUtils';

export const TaxSettingsPage = () => {
  const { data, isLoading, error, refetch } = useAcademyTaxSettings();
  const updateTaxSettings = useUpdateAcademyTaxSettings();

  const [formData, setFormData] = useState<UpdateAcademyTaxSettingsRequest>({
    global_tax_enabled: false,
    global_tax_rate_percent: undefined,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;

    setFormData({
      global_tax_enabled: !!data.global_tax_enabled,
      global_tax_rate_percent: data.global_tax_rate_percent !== undefined ? Number(data.global_tax_rate_percent) : undefined,
    });
  }, [data]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSuccessMessage(null);

    try {
      const payload: UpdateAcademyTaxSettingsRequest = {
        global_tax_enabled: !!formData.global_tax_enabled,
      };

      if (formData.global_tax_enabled) {
        payload.global_tax_rate_percent = formData.global_tax_rate_percent;
      }

      await updateTaxSettings.mutateAsync(payload);
      setSuccessMessage('Tax settings saved successfully.');
    } catch (err) {
      const validationErrors = extractValidationErrors(err);
      if (validationErrors) {
        setFormErrors(validationErrors);
      } else {
        setFormErrors({
          non_field_errors: [formatErrorMessage(err)],
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading tax settings..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Failed to load tax settings')}
          onRetry={() => refetch()}
          title="Failed to load tax settings"
        />
      </div>
    );
  }

  const rateValue =
    formData.global_tax_enabled && formData.global_tax_rate_percent !== undefined
      ? formData.global_tax_rate_percent
      : '';

  return (
    <div className="container mx-auto py-8">
      <PageShell
        title="Tax Settings"
        subtitle="Configure the academy-wide student invoice tax percentage. This tax is applied automatically to new invoices."
      >
        {successMessage ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {formErrors.non_field_errors?.length ? (
          <Alert variant="destructive">
            <AlertDescription>
              {formErrors.non_field_errors.map((msg) => (
                <div key={msg}>{msg}</div>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Global Student Invoice Tax</CardTitle>
            <CardDescription>
              Applied to the net amount (subtotal minus discount). When disabled, student invoices keep `tax_amount` at `0.00`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label>Enable global tax</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically compute tax for all new student invoices.
                  </p>
                </div>
                <Switch
                  checked={!!formData.global_tax_enabled}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      global_tax_enabled: checked,
                      global_tax_rate_percent: checked
                        ? prev.global_tax_rate_percent ?? 0
                        : undefined,
                    }));
                    if (formErrors.global_tax_rate_percent) {
                      setFormErrors((prev) => ({ ...prev, global_tax_rate_percent: [] }));
                    }
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="global_tax_rate_percent">
                  Tax rate (%)
                </Label>
                <Input
                  id="global_tax_rate_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={rateValue}
                  onChange={(e) => {
                    const next = e.target.value === '' ? undefined : Number(e.target.value);
                    setFormData((prev) => ({ ...prev, global_tax_rate_percent: next }));
                    if (formErrors.global_tax_rate_percent) {
                      setFormErrors((prev) => ({ ...prev, global_tax_rate_percent: [] }));
                    }
                  }}
                  disabled={!formData.global_tax_enabled || updateTaxSettings.isPending}
                />
                {formErrors.global_tax_rate_percent?.[0] ? (
                  <p className="text-sm text-destructive">{formErrors.global_tax_rate_percent[0]}</p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateTaxSettings.isPending}>
                  {updateTaxSettings.isPending ? 'Saving...' : 'Save Tax Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  );
};

