/**
 * Step 1: Academy Profile
 */
import { useState, useEffect } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useMasterCurrencies, useMasterTimezones } from '@/shared/hooks/useMasters';
import { validateStep1 } from '../../utils/validation';
import type { Step1Profile } from '../../types';

interface Step1ProfileProps {
  onSubmit: (data: Step1Profile) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
}

export default function Step1Profile({ onSubmit, errors, isLoading: _isLoading, formRef }: Step1ProfileProps) {
  const [formData, setFormData] = useState<Step1Profile>({
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
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const { data: timezonesData, isLoading: isLoadingTimezones } = useMasterTimezones();
  const { data: currenciesData, isLoading: isLoadingCurrencies } = useMasterCurrencies();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading saved step 1 data:', e);
      }
    }
  }, []);

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

    setValidationErrors({});
    await onSubmit(formData);
  };

  const displayErrors = { ...validationErrors, ...errors };

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
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              maxLength={20}
            />
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
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleChange('timezone', value)}
              required
            >
              <SelectTrigger>
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
            {displayErrors.timezone && (
              <p className="text-sm text-destructive mt-1">{displayErrors.timezone[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="currency">Currency *</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleChange('currency', value)}
              required
            >
              <SelectTrigger>
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
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              value={formData.address_line1}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              maxLength={255}
            />
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
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit button is handled by WizardNavigation */}
    </form>
  );
}
