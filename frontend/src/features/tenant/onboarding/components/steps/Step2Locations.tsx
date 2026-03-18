/**
 * Step 2: Branches
 */
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { useMasterCountries } from '@/shared/hooks/useMasters';
import { Plus, Trash2 } from 'lucide-react';
import { validateStep2 } from '../../utils/validation';
import type { Step2Locations, Location } from '../../types';

interface Step2LocationsProps {
  onSubmit: (data: Step2Locations) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
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

export default function Step2Locations({ onSubmit, errors, isLoading: _isLoading, formRef }: Step2LocationsProps) {
  const { data: countriesData, isLoading: isLoadingCountries } = useMasterCountries();
  const countries = countriesData?.countries || [];

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: `${c.name} (${c.code})`,
      })),
    [countries]
  );

  // Auto-fill branch country from Step 1 selection (stored as onboarding_step_1 draft).
  const defaultCountry = useMemo(() => {
    try {
      const step1 = localStorage.getItem('onboarding_step_1');
      if (!step1) return '';
      const parsed = JSON.parse(step1) as { country?: string };
      return normalizeCountryCode(parsed.country, countries);
    } catch {
      return '';
    }
  }, [countries]);

  const [locations, setLocations] = useState<Location[]>([
    { name: '', address_line1: '', city: '', state: '', postal_code: '', country: defaultCountry, phone: '' },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.locations && parsed.locations.length > 0) {
          setLocations(
            parsed.locations.map((l: Location) => ({
              ...l,
              country: l.country ? normalizeCountryCode(l.country, countries) : defaultCountry,
            }))
          );
          return;
        }
      } catch (e) {
        console.error('Error loading saved step 2 data:', e);
      }
    }
    // If no saved locations, ensure the initial branch uses the default country.
    setLocations((prev) =>
      prev.map((l) => ({
        ...l,
        country: l.country ? normalizeCountryCode(l.country, countries) : defaultCountry,
      }))
    );
  }, [countries, defaultCountry]);

  useEffect(() => {
    // When countries load later, normalize any existing values and backfill empty countries.
    if (countries.length === 0) return;
    setLocations((prev) =>
      prev.map((l) => ({
        ...l,
        country: l.country ? normalizeCountryCode(l.country, countries) : defaultCountry,
      }))
    );
  }, [countries, defaultCountry]);

  const addLocation = () => {
    setLocations([
      ...locations,
      { name: '', address_line1: '', city: '', state: '', postal_code: '', country: defaultCountry, phone: '' },
    ]);
  };

  const removeLocation = (index: number) => {
    if (locations.length > 1) {
      setLocations(locations.filter((_, i) => i !== index));
    }
  };

  const updateLocation = (index: number, field: keyof Location, value: string | number | undefined) => {
    setLocations(locations.map((loc, i) => 
      i === index ? { ...loc, [field]: value } : loc
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure payload uses master alpha-3 codes, and omit UI-only fields.
    const normalizedLocations: Location[] = locations.map((l) => {
      const { capacity: _capacity, ...rest } = l;
      return {
        ...rest,
        country: rest.country ? normalizeCountryCode(rest.country, countries) : defaultCountry,
      };
    });

    const data: Step2Locations = { locations: normalizedLocations };
    const clientErrors = validateStep2(data);
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
    await onSubmit(data);
  };

  const displayErrors = { ...validationErrors, ...errors };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Branches</h3>
          <Button type="button" variant="outline" size="sm" onClick={addLocation}>
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </div>

        <div className="space-y-6">
          {locations.map((location, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Branch {index + 1}</h4>
                {locations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLocation(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor={`location-name-${index}`}>Branch Name *</Label>
                <Input
                  id={`location-name-${index}`}
                  value={location.name}
                  onChange={(e) => updateLocation(index, 'name', e.target.value)}
                  required
                  maxLength={255}
                />
                {displayErrors[`locations[${index}].name`] && (
                  <p className="text-sm text-destructive mt-1">
                    {displayErrors[`locations[${index}].name`][0]}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor={`location-address1-${index}`}>Address Line 1</Label>
                <Input
                  id={`location-address1-${index}`}
                  value={location.address_line1 || ''}
                  onChange={(e) => updateLocation(index, 'address_line1', e.target.value)}
                  maxLength={255}
                />
              </div>

              <div>
                <Label htmlFor={`location-address2-${index}`}>Address Line 2</Label>
                <Input
                  id={`location-address2-${index}`}
                  value={location.address_line2 || ''}
                  onChange={(e) => updateLocation(index, 'address_line2', e.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`location-city-${index}`}>City</Label>
                  <Input
                    id={`location-city-${index}`}
                    value={location.city || ''}
                    onChange={(e) => updateLocation(index, 'city', e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor={`location-state-${index}`}>State/Province</Label>
                  <Input
                    id={`location-state-${index}`}
                    value={location.state || ''}
                    onChange={(e) => updateLocation(index, 'state', e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`location-postal-${index}`}>Postal Code</Label>
                  <Input
                    id={`location-postal-${index}`}
                    value={location.postal_code || ''}
                    onChange={(e) => updateLocation(index, 'postal_code', e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label htmlFor={`location-country-${index}`}>Country</Label>
                  <SearchableSelect
                    id={`location-country-${index}`}
                    options={countryOptions}
                    value={location.country || '__none__'}
                    onValueChange={(value) =>
                      updateLocation(index, 'country', value === '__none__' ? '' : value)
                    }
                    placeholder="Select country"
                    searchPlaceholder="Search countries..."
                    allowEmpty
                    emptyOptionLabel="Select country"
                    isLoading={isLoadingCountries}
                    loadingMessage="Loading countries..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`location-phone-${index}`}>Phone</Label>
                  <Input
                    id={`location-phone-${index}`}
                    type="tel"
                    value={location.phone || ''}
                    onChange={(e) => updateLocation(index, 'phone', e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayErrors.locations && (
          <p className="text-sm text-destructive mt-2">{displayErrors.locations[0]}</p>
        )}
      </div>

      {/* Submit button is handled by WizardNavigation */}
    </form>
  );
}
