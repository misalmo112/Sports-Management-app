import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { PageShell } from '@/shared/components/common/PageShell';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useMasterCurrencies, useMasterTimezones } from '@/shared/hooks/useMasters';
import { clearFieldError, extractValidationErrors, formatErrorMessage } from '@/shared/utils/errorUtils';
import { useAcademySettings, useUpdateAcademySettings } from '../hooks/hooks';
import type { UpdateAcademySettingsRequest } from '../types';

const emptyForm: UpdateAcademySettingsRequest = {
  name: '',
  email: '',
  phone: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  timezone: '',
  currency: '',
};

export const AcademySettingsPage = () => {
  const { data, isLoading, error, refetch } = useAcademySettings();
  const updateAcademy = useUpdateAcademySettings();
  const { data: timezonesData, isLoading: isLoadingTimezones } = useMasterTimezones();
  const { data: currenciesData, isLoading: isLoadingCurrencies } = useMasterCurrencies();

  const [formData, setFormData] = useState<UpdateAcademySettingsRequest>(emptyForm);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormData({
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      website: data.website || '',
      address_line1: data.address_line1 || '',
      address_line2: data.address_line2 || '',
      city: data.city || '',
      state: data.state || '',
      postal_code: data.postal_code || '',
      country: data.country || '',
      timezone: data.timezone || '',
      currency: data.currency || '',
    });
  }, [data]);

  const handleInputChange = (
    field: keyof UpdateAcademySettingsRequest,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => clearFieldError(prev, field));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSuccessMessage(null);

    try {
      await updateAcademy.mutateAsync(formData);
      setSuccessMessage('Organization settings updated successfully.');
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
        <LoadingState message="Loading organization settings..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Failed to load organization settings')}
          onRetry={() => refetch()}
          title="Failed to load organization settings"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <PageShell
        title="Organization"
        subtitle="Manage the academy profile, contact details, and operational defaults used across the platform."
      >
        {successMessage ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Academy Profile</CardTitle>
            <CardDescription>
              These details describe the academy as an organization and are distinct from the signed-in user&apos;s account settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formErrors.non_field_errors ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {formErrors.non_field_errors.map((errorMessage) => (
                      <div key={errorMessage}>{errorMessage}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  id="academy-name"
                  label="Academy Name"
                  error={formErrors.name?.[0]}
                >
                  <Input
                    id="academy-name"
                    value={formData.name || ''}
                    onChange={(event) => handleInputChange('name', event.target.value)}
                    disabled={updateAcademy.isPending}
                  />
                </FormField>

                <FormField
                  id="academy-email"
                  label="Organization Contact Email"
                  error={formErrors.email?.[0]}
                >
                  <Input
                    id="academy-email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(event) => handleInputChange('email', event.target.value)}
                    disabled={updateAcademy.isPending}
                  />
                </FormField>

                <FormField
                  id="academy-phone"
                  label="Phone"
                  error={formErrors.phone?.[0]}
                >
                  <Input
                    id="academy-phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(event) => handleInputChange('phone', event.target.value)}
                    disabled={updateAcademy.isPending}
                  />
                </FormField>

                <FormField
                  id="academy-website"
                  label="Website"
                  error={formErrors.website?.[0]}
                >
                  <Input
                    id="academy-website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website || ''}
                    onChange={(event) => handleInputChange('website', event.target.value)}
                    disabled={updateAcademy.isPending}
                  />
                </FormField>

                <div className="grid gap-2">
                  <Label htmlFor="academy-timezone">Timezone</Label>
                  <Select
                    value={formData.timezone || ''}
                    onValueChange={(value) => handleInputChange('timezone', value)}
                    disabled={updateAcademy.isPending}
                  >
                    <SelectTrigger id="academy-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingTimezones ? (
                        <SelectItem value="loading" disabled>
                          Loading timezones...
                        </SelectItem>
                      ) : (
                        (timezonesData?.timezones || []).map((timezone) => (
                          <SelectItem key={timezone} value={timezone}>
                            {timezone}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.timezone ? (
                    <p className="text-sm text-destructive">{formErrors.timezone[0]}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="academy-currency">Currency</Label>
                  <Select
                    value={formData.currency || ''}
                    onValueChange={(value) => handleInputChange('currency', value)}
                    disabled={updateAcademy.isPending}
                  >
                    <SelectTrigger id="academy-currency">
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
                  {formErrors.currency ? (
                    <p className="text-sm text-destructive">{formErrors.currency[0]}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Address</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the academy’s operating address for invoicing, correspondence, and records.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="academy-address-line1"
                    label="Address Line 1"
                    error={formErrors.address_line1?.[0]}
                    className="md:col-span-2"
                  >
                    <Input
                      id="academy-address-line1"
                      value={formData.address_line1 || ''}
                      onChange={(event) => handleInputChange('address_line1', event.target.value)}
                      disabled={updateAcademy.isPending}
                    />
                  </FormField>

                  <FormField
                    id="academy-address-line2"
                    label="Address Line 2"
                    error={formErrors.address_line2?.[0]}
                    className="md:col-span-2"
                  >
                    <Input
                      id="academy-address-line2"
                      value={formData.address_line2 || ''}
                      onChange={(event) => handleInputChange('address_line2', event.target.value)}
                      disabled={updateAcademy.isPending}
                    />
                  </FormField>

                  <FormField
                    id="academy-city"
                    label="City"
                    error={formErrors.city?.[0]}
                  >
                    <Input
                      id="academy-city"
                      value={formData.city || ''}
                      onChange={(event) => handleInputChange('city', event.target.value)}
                      disabled={updateAcademy.isPending}
                    />
                  </FormField>

                  <FormField
                    id="academy-state"
                    label="State / Province"
                    error={formErrors.state?.[0]}
                  >
                    <Input
                      id="academy-state"
                      value={formData.state || ''}
                      onChange={(event) => handleInputChange('state', event.target.value)}
                      disabled={updateAcademy.isPending}
                    />
                  </FormField>

                  <FormField
                    id="academy-postal-code"
                    label="Postal Code"
                    error={formErrors.postal_code?.[0]}
                  >
                    <Input
                      id="academy-postal-code"
                      value={formData.postal_code || ''}
                      onChange={(event) => handleInputChange('postal_code', event.target.value)}
                      disabled={updateAcademy.isPending}
                    />
                  </FormField>

                  <FormField
                    id="academy-country"
                    label="Country"
                    error={formErrors.country?.[0]}
                  >
                    <Input
                      id="academy-country"
                      value={formData.country || ''}
                      onChange={(event) => handleInputChange('country', event.target.value)}
                      disabled={updateAcademy.isPending}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateAcademy.isPending}>
                  {updateAcademy.isPending ? 'Saving...' : 'Save Organization Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  );
};

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

function FormField({ id, label, error, className, children }: FormFieldProps) {
  return (
    <div className={`grid gap-2 ${className || ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
