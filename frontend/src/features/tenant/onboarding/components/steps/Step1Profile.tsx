/**
 * Step 1: Academy Profile
 */
import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { useMasterCountries, useMasterCurrencies, useMasterTimezones } from '@/shared/hooks/useMasters';
import { validateStep1 } from '../../utils/validation';
import type { Step1Profile } from '../../types';

const DEFAULT_STEP1: Step1Profile = {
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

interface Step1ProfileProps {
  onSubmit: (data: Step1Profile) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
  /** Pre-fill from GET onboarding/state/ profile (academy creation data) */
  initialData?: Partial<Step1Profile> | null;
}

function normalizeCountryCode(
  rawValue: string | undefined,
  countries: Array<{ code: string; name: string }>
): string {
  if (!rawValue) return '';
  const value = rawValue.trim();
  if (!value) return '';

  // Already an alpha-3 code.
  if (value.length === 3) {
    return value.toUpperCase();
  }

  // Handle legacy values saved as country name (or non-uppercased code).
  const byCode = countries.find((c) => c.code.toLowerCase() === value.toLowerCase());
  if (byCode) return byCode.code;
  const byName = countries.find((c) => c.name.toLowerCase() === value.toLowerCase());
  if (byName) return byName.code;
  return '';
}

export default function Step1Profile({ onSubmit, errors, isLoading: _isLoading, formRef, initialData }: Step1ProfileProps) {
  const [formData, setFormData] = useState<Step1Profile>({ ...DEFAULT_STEP1 });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const { data: timezonesData, isLoading: isLoadingTimezones } = useMasterTimezones();
  const { data: currenciesData, isLoading: isLoadingCurrencies } = useMasterCurrencies();
  const { data: countriesData, isLoading: isLoadingCountries } = useMasterCountries();

  // Pre-fill from API profile then localStorage draft
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_1');
    let parsed: Partial<Step1Profile> = {};
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {
        console.error('Error loading saved step 1 data:', e);
      }
    }
    const fromApi = initialData ?? {};
    setFormData((prev) => ({ ...DEFAULT_STEP1, ...fromApi, ...parsed }));
  }, [initialData]);

  const handleChange = (field: keyof Step1Profile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const clientErrors = validateStep1(formData);
    if (clientErrors.length > 0) {
      const errorMap: Record<string, string[]> = {};
      clientErrors.forEach((err) => {
        if (!errorMap[err.field]) {
          errorMap[err.field] = [];
        }
        errorMap[err.field].push(err.message);
      });
      setValidationErrors(errorMap);
      return;
    }

    // Normalize legacy country names to alpha-3 codes before submit.
    const normalizedCountry = normalizeCountryCode(formData.country, countriesData?.countries || []);
    const payload: Step1Profile = {
      ...formData,
      country: normalizedCountry,
    };

    setValidationErrors({});
    setFormData(payload);
    await onSubmit(payload);
  };

  const displayErrors = { ...validationErrors, ...errors };

  const timezoneOptions = useMemo(
    () => (timezonesData?.timezones || []).map((tz) => ({ value: tz, label: tz })),
    [timezonesData?.timezones]
  );
  const currencyOptions = useMemo(
    () => (currenciesData?.currencies || []).map((c) => ({ value: c, label: c })),
    [currenciesData?.currencies]
  );
  const countryOptions = useMemo(
    () =>
      (countriesData?.countries || []).map((c) => ({
        value: c.code,
        label: `${c.name} (${c.code})`,
      })),
    [countriesData?.countries]
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Academy Information</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Academy Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              maxLength={255}
            />
            {displayErrors.name && (
              <p className="text-sm text-destructive mt-1">{displayErrors.name[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              maxLength={255}
            />
            {displayErrors.email && (
              <p className="text-sm text-destructive mt-1">{displayErrors.email[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
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
            <p id="phone-hint" className="text-xs text-muted-foreground mt-1">
              Include country code (e.g. +1 for US, +44 for UK). Only digits, spaces, and + - ( ) allowed.
            </p>
            {displayErrors.phone && (
              <p className="text-sm text-destructive mt-1">{displayErrors.phone[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://example.com"
            />
            {displayErrors.website && (
              <p className="text-sm text-destructive mt-1">{displayErrors.website[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="timezone">Timezone *</Label>
            <SearchableSelect
              id="timezone"
              options={timezoneOptions}
              value={formData.timezone}
              onValueChange={(value) => handleChange('timezone', value)}
              placeholder="Select timezone"
              searchPlaceholder="Search timezones..."
              required
              isLoading={isLoadingTimezones}
              loadingMessage="Loading timezones..."
            />
            {displayErrors.timezone && (
              <p className="text-sm text-destructive mt-1">{displayErrors.timezone[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="currency">Currency *</Label>
            <SearchableSelect
              id="currency"
              options={currencyOptions}
              value={formData.currency}
              onValueChange={(value) => handleChange('currency', value)}
              placeholder="Select currency"
              searchPlaceholder="Search currencies..."
              required
              isLoading={isLoadingCurrencies}
              loadingMessage="Loading currencies..."
            />
            {displayErrors.currency && (
              <p className="text-sm text-destructive mt-1">{displayErrors.currency[0]}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Address</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="address_line1">Address Line 1 *</Label>
            <Input
              id="address_line1"
              value={formData.address_line1}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              required
              maxLength={255}
            />
            {displayErrors.address_line1 && (
              <p className="text-sm text-destructive mt-1">{displayErrors.address_line1[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input
              id="address_line2"
              value={formData.address_line2}
              onChange={(e) => handleChange('address_line2', e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                maxLength={20}
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <SearchableSelect
                id="country"
                options={countryOptions}
                value={formData.country || '__none__'}
                onValueChange={(value) => handleChange('country', value === '__none__' ? '' : value)}
                placeholder="Select country"
                searchPlaceholder="Search countries..."
                allowEmpty
                emptyOptionLabel="Select country"
                isLoading={isLoadingCountries}
                loadingMessage="Loading countries..."
              />
              {displayErrors.country && (
                <p className="text-sm text-destructive mt-1">{displayErrors.country[0]}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit button is handled by WizardNavigation */}
    </form>
  );
}
