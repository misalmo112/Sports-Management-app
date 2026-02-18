/**
 * Step 2: Locations
 */
import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { validateStep2 } from '../../utils/validation';
import type { Step2Locations, Location } from '../../types';

interface Step2LocationsProps {
  onSubmit: (data: Step2Locations) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
}

export default function Step2Locations({ onSubmit, errors, isLoading: _isLoading, formRef }: Step2LocationsProps) {
  const [locations, setLocations] = useState<Location[]>([
    { name: '', address_line1: '', city: '', state: '', postal_code: '', country: '', phone: '', capacity: undefined },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.locations && parsed.locations.length > 0) {
          setLocations(parsed.locations);
        }
      } catch (e) {
        console.error('Error loading saved step 2 data:', e);
      }
    }
  }, []);

  const addLocation = () => {
    setLocations([...locations, { name: '', address_line1: '', city: '', state: '', postal_code: '', country: '', phone: '', capacity: undefined }]);
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
    
    const data: Step2Locations = { locations };
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
          <h3 className="text-lg font-semibold">Locations</h3>
          <Button type="button" variant="outline" size="sm" onClick={addLocation}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        <div className="space-y-6">
          {locations.map((location, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Location {index + 1}</h4>
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
                <Label htmlFor={`location-name-${index}`}>Location Name *</Label>
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
                  <Input
                    id={`location-country-${index}`}
                    value={location.country || ''}
                    onChange={(e) => updateLocation(index, 'country', e.target.value)}
                    maxLength={100}
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
                <div>
                  <Label htmlFor={`location-capacity-${index}`}>Capacity</Label>
                  <Input
                    id={`location-capacity-${index}`}
                    type="number"
                    min="0"
                    value={location.capacity || ''}
                    onChange={(e) => updateLocation(index, 'capacity', e.target.value ? parseInt(e.target.value) : undefined)}
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
