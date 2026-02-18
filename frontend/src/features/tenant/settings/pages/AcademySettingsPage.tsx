/**
 * Academy Settings Page
 * Manage academy timezone and currency
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAcademySettings, useUpdateAcademySettings } from '../hooks/hooks';
import { useMasterCurrencies, useMasterTimezones } from '@/shared/hooks/useMasters';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';

export const AcademySettingsPage = () => {
  const { data, isLoading, error, refetch } = useAcademySettings();
  const updateAcademy = useUpdateAcademySettings();
  const { data: timezonesData, isLoading: isLoadingTimezones } = useMasterTimezones();
  const { data: currenciesData, isLoading: isLoadingCurrencies } = useMasterCurrencies();

  const [formData, setFormData] = useState({
    timezone: '',
    currency: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (data) {
      setFormData({
        timezone: data.timezone || '',
        currency: data.currency || '',
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      await updateAcademy.mutateAsync({
        timezone: formData.timezone,
        currency: formData.currency,
      });
      setSuccessMessage('Academy settings updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      } else {
        setFormErrors({
          non_field_errors: [err?.message || 'Failed to update settings'],
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading academy settings..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Failed to load academy settings')}
          onRetry={() => refetch()}
          title="Failed to load academy settings"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Academy Settings</h1>
        <p className="text-muted-foreground mt-2">Manage timezone and currency</p>
      </div>

      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Academy Profile</CardTitle>
          <CardDescription>Update timezone and currency for your academy</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {formErrors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {formErrors.non_field_errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))}
                  disabled={updateAcademy.isPending}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTimezones ? (
                      <SelectItem value="loading" disabled>
                        Loading timezones...
                      </SelectItem>
                    ) : (
                      (timezonesData?.timezones || []).map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formErrors.timezone && (
                  <p className="text-sm text-destructive">{formErrors.timezone[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                  disabled={updateAcademy.isPending}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCurrencies ? (
                      <SelectItem value="loading" disabled>
                        Loading currencies...
                      </SelectItem>
                    ) : (
                      (currenciesData?.currencies || []).map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formErrors.currency && (
                  <p className="text-sm text-destructive">{formErrors.currency[0]}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateAcademy.isPending}>
                {updateAcademy.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
