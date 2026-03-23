/**
 * Academy Create Page (Platform - SUPERADMIN)
 * Create a new academy
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { usePlatformCountries } from '@/features/platform/masters/hooks/usePlatformCountries';
import { usePlatformCurrencies } from '@/features/platform/masters/hooks/usePlatformCurrencies';
import { usePlatformTimezones } from '@/features/platform/masters/hooks/usePlatformTimezones';
import { useMasterCountries } from '@/shared/hooks/useMasters';
import { usePlans } from '@/features/platform/subscriptions/hooks/usePlans';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useCreateAcademy } from '../hooks/hooks';
import { extractValidationErrors } from '@/shared/utils/errorUtils';
import type { CreateAcademyRequest } from '../types';

export const AcademyCreatePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateAcademyRequest>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    timezone: 'UTC',
    currency: 'USD',
    owner_email: '',
    plan_id: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const createAcademy = useCreateAcademy();
  const { data: timezonesData, isLoading: isLoadingTimezones } = usePlatformTimezones({
    is_active: true,
    page_size: 2000,
  });
  const { data: currenciesData, isLoading: isLoadingCurrencies } = usePlatformCurrencies({
    is_active: true,
  });
  const {
    data: countriesData,
    isLoading: isLoadingCountries,
    isError: isCountriesError,
  } = usePlatformCountries({
    is_active: true,
    page_size: 300,
  });
  const { data: tenantCountriesData } = useMasterCountries();
  const { data: plansData, isLoading: isLoadingPlans } = usePlans({ is_active: true });
  const timezones = timezonesData?.results ?? [];
  const currencies = currenciesData?.results ?? [];
  // Prefer platform countries; fallback to tenant masters when platform fails or is empty
  const platformCountries = countriesData?.results ?? [];
  const countries =
    platformCountries.length > 0
      ? platformCountries
      : (tenantCountriesData?.countries ?? []).map((c) => ({
          id: 0,
          code: c.code,
          name: c.name,
          phone_code: '',
          region: '',
          is_active: true,
          sort_order: 0,
          created_at: '',
          updated_at: '',
        }));
  const plans = plansData?.results ?? [];

  const timezoneOptions = useMemo(
    () => timezones.map((tz) => ({ value: tz.code, label: tz.name || tz.code })),
    [timezones]
  );
  const currencyOptions = useMemo(
    () =>
      currencies.map((curr) => ({
        value: curr.code,
        label: curr.name ? `${curr.code} — ${curr.name}` : curr.code,
      })),
    [currencies]
  );
  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })),
    [countries]
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (!formData.slug || formData.slug.trim().length === 0) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length > 255) {
      newErrors.slug = 'Slug must be 255 characters or less';
    }

    if (!formData.email || formData.email.trim().length === 0) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.website && formData.website.trim().length > 0) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = 'Please enter a valid URL';
      }
    }

    if (!formData.address_line1 || formData.address_line1.trim().length === 0) {
      newErrors.address_line1 = 'Address line 1 is required';
    } else if (formData.address_line1.length > 255) {
      newErrors.address_line1 = 'Address line 1 must be 255 characters or less';
    }

    const phoneTrimmed = formData.phone?.trim() ?? '';
    if (phoneTrimmed.length === 0) {
      newErrors.phone = 'Phone is required';
    } else if (phoneTrimmed.length > 20) {
      newErrors.phone = 'Phone must be 20 characters or less';
    } else if (!/^[\d+\s\-()]+$/.test(phoneTrimmed)) {
      newErrors.phone = 'Phone may only contain digits, spaces, and + - ( ). Example: +1 555 123 4567';
    } else if ((phoneTrimmed.match(/\d/g) || []).length < 8) {
      newErrors.phone = 'Phone must contain at least 8 digits (include country code if needed)';
    }

    if (!formData.owner_email || formData.owner_email.trim().length === 0) {
      newErrors.owner_email = 'Owner email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.owner_email)) {
        newErrors.owner_email = 'Please enter a valid email address';
      }
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof CreateAcademyRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (clientErrors[field]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      // Prepare data - remove empty strings for optional fields
      const submitData: CreateAcademyRequest = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        owner_email: formData.owner_email.trim().toLowerCase(),
        address_line1: formData.address_line1.trim(),
        phone: formData.phone.trim(),
      };

      if (formData.website?.trim()) {
        submitData.website = formData.website.trim();
      }
      if (formData.address_line2?.trim()) {
        submitData.address_line2 = formData.address_line2.trim();
      }
      if (formData.city?.trim()) {
        submitData.city = formData.city.trim();
      }
      if (formData.state?.trim()) {
        submitData.state = formData.state.trim();
      }
      if (formData.postal_code?.trim()) {
        submitData.postal_code = formData.postal_code.trim();
      }
      if (formData.country?.trim()) {
        submitData.country = formData.country.trim();
      }
      if (formData.timezone?.trim()) {
        submitData.timezone = formData.timezone.trim();
      }
      if (formData.currency?.trim()) {
        submitData.currency = formData.currency.trim();
      }
      if (formData.plan_id != null && formData.plan_id !== undefined) {
        submitData.plan_id = formData.plan_id;
      }

      const academy = await createAcademy.mutateAsync(submitData);
      navigate(`/dashboard/platform/academies/${academy.id}`);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create academy'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/platform/academies')}>
          ← Back to Academies
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Academy</CardTitle>
          <CardDescription>Register a new academy in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Academy Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                  {(errors.name || clientErrors.name) && (
                    <p className="text-sm text-destructive">
                      {errors.name?.[0] || clientErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">
                    Slug <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value.toLowerCase())}
                    placeholder="academy-slug"
                    required
                  />
                  {(errors.slug || clientErrors.slug) && (
                    <p className="text-sm text-destructive">
                      {errors.slug?.[0] || clientErrors.slug}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Academy Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                  {(errors.email || clientErrors.email) && (
                    <p className="text-sm text-destructive">
                      {errors.email?.[0] || clientErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 555 123 4567"
                    required
                    maxLength={20}
                    aria-describedby="phone-hint"
                  />
                  <p id="phone-hint" className="text-xs text-muted-foreground">
                    Include country code (e.g. +1 for US, +44 for UK). Only digits, spaces, and + - ( ) allowed.
                  </p>
                  {(errors.phone || clientErrors.phone) && (
                    <p className="text-sm text-destructive">
                      {errors.phone?.[0] || clientErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
                {(errors.website || clientErrors.website) && (
                  <p className="text-sm text-destructive">
                    {errors.website?.[0] || clientErrors.website}
                  </p>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              <div className="space-y-2">
                <Label htmlFor="address_line1">
                  Address Line 1 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => handleChange('address_line1', e.target.value)}
                  required
                />
                {(errors.address_line1 || clientErrors.address_line1) && (
                  <p className="text-sm text-destructive">
                    {errors.address_line1?.[0] || clientErrors.address_line1}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => handleChange('address_line2', e.target.value)}
                />
                {errors.address_line2 && (
                  <p className="text-sm text-destructive">{errors.address_line2[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive">{errors.state[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                  />
                  {errors.postal_code && (
                    <p className="text-sm text-destructive">{errors.postal_code[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <SearchableSelect
                    id="country"
                    options={countryOptions}
                    value={formData.country || '__none__'}
                    onValueChange={(value) =>
                      handleChange('country', value === '__none__' ? '' : value)
                    }
                    placeholder="Select country"
                    searchPlaceholder="Search countries..."
                    allowEmpty
                    emptyOptionLabel="Select country"
                    isLoading={isLoadingCountries && countryOptions.length === 0}
                    loadingMessage="Loading countries..."
                    emptyMessage={
                      isCountriesError && countryOptions.length === 0
                        ? 'Could not load countries. Ensure you are logged in as a platform admin.'
                        : 'No countries configured'
                    }
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <SearchableSelect
                    id="timezone"
                    options={timezoneOptions}
                    value={formData.timezone || ''}
                    onValueChange={(value) => handleChange('timezone', value)}
                    placeholder="Select timezone"
                    searchPlaceholder="Search timezones..."
                    isLoading={isLoadingTimezones}
                    loadingMessage="Loading timezones..."
                    emptyMessage="No timezones configured"
                  />
                  {errors.timezone && (
                    <p className="text-sm text-destructive">{errors.timezone[0]}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <SearchableSelect
                  id="currency"
                  options={currencyOptions}
                  value={formData.currency || ''}
                  onValueChange={(value) => handleChange('currency', value)}
                  placeholder="Select currency"
                  searchPlaceholder="Search currencies..."
                  isLoading={isLoadingCurrencies}
                  loadingMessage="Loading currencies..."
                  emptyMessage="No currencies configured"
                />
                {errors.currency && (
                  <p className="text-sm text-destructive">{errors.currency[0]}</p>
                )}
              </div>
            </div>

            {/* Subscription Plan */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Subscription Plan</h3>
              <div className="space-y-2">
                <Label htmlFor="plan_id">Plan</Label>
                <Select
                  value={formData.plan_id != null ? String(formData.plan_id) : '__default__'}
                  onValueChange={(value) =>
                    handleChange('plan_id', value === '__default__' ? undefined : Number(value))
                  }
                >
                  <SelectTrigger id="plan_id">
                    <SelectValue placeholder="Select a plan (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">
                      {isLoadingPlans ? 'Loading plans...' : 'Use default (first active plan)'}
                    </SelectItem>
                    {!isLoadingPlans &&
                      plans.map((plan) => (
                        <SelectItem key={plan.id} value={String(plan.id)}>
                          {plan.name}
                          {plan.price_monthly != null
                            ? ` — ${plan.currency} ${Number(plan.price_monthly)}/mo`
                            : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.plan_id && (
                  <p className="text-sm text-destructive">{errors.plan_id[0]}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Choose a subscription plan for this academy. If not set, the first active plan is
                  used.
                </p>
              </div>
            </div>

            {/* Owner Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Owner Information</h3>
              <div className="space-y-2">
                <Label htmlFor="owner_email">
                  Owner Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="owner_email"
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => handleChange('owner_email', e.target.value)}
                  placeholder="owner@example.com"
                  required
                />
                {(errors.owner_email || clientErrors.owner_email) && (
                  <p className="text-sm text-destructive">
                    {errors.owner_email?.[0] || clientErrors.owner_email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  An invitation email will be sent to this address
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/platform/academies')}
                disabled={createAcademy.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAcademy.isPending}>
                {createAcademy.isPending ? 'Creating...' : 'Create Academy'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
