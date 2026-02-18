/**
 * Step 3: Sports
 */
import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { validateStep3 } from '../../utils/validation';
import type { Step3Sports, Sport } from '../../types';

interface Step3SportsProps {
  onSubmit: (data: Step3Sports) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
}

export default function Step3Sports({ onSubmit, errors, isLoading: _isLoading, formRef }: Step3SportsProps) {
  const [sports, setSports] = useState<Sport[]>([
    { name: '', description: '', age_min: undefined, age_max: undefined },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sports && parsed.sports.length > 0) {
          setSports(parsed.sports);
        }
      } catch (e) {
        console.error('Error loading saved step 3 data:', e);
      }
    }
  }, []);

  const addSport = () => {
    setSports([...sports, { name: '', description: '', age_min: undefined, age_max: undefined }]);
  };

  const removeSport = (index: number) => {
    if (sports.length > 1) {
      setSports(sports.filter((_, i) => i !== index));
    }
  };

  const updateSport = (index: number, field: keyof Sport, value: string | number | undefined) => {
    setSports(sports.map((sport, i) => 
      i === index ? { ...sport, [field]: value } : sport
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Step3Sports = { sports };
    const clientErrors = validateStep3(data);
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
          <h3 className="text-lg font-semibold">Sports</h3>
          <Button type="button" variant="outline" size="sm" onClick={addSport}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sport
          </Button>
        </div>

        <div className="space-y-6">
          {sports.map((sport, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Sport {index + 1}</h4>
                {sports.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSport(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor={`sport-name-${index}`}>Sport Name *</Label>
                <Input
                  id={`sport-name-${index}`}
                  value={sport.name}
                  onChange={(e) => updateSport(index, 'name', e.target.value)}
                  required
                  maxLength={255}
                />
                {displayErrors[`sports[${index}].name`] && (
                  <p className="text-sm text-destructive mt-1">
                    {displayErrors[`sports[${index}].name`][0]}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor={`sport-description-${index}`}>Description</Label>
                <Textarea
                  id={`sport-description-${index}`}
                  value={sport.description || ''}
                  onChange={(e) => updateSport(index, 'description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`sport-age-min-${index}`}>Minimum Age</Label>
                  <Input
                    id={`sport-age-min-${index}`}
                    type="number"
                    min="0"
                    value={sport.age_min || ''}
                    onChange={(e) => updateSport(index, 'age_min', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                  {displayErrors[`sports[${index}].age_min`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`sports[${index}].age_min`][0]}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`sport-age-max-${index}`}>Maximum Age</Label>
                  <Input
                    id={`sport-age-max-${index}`}
                    type="number"
                    min="0"
                    value={sport.age_max || ''}
                    onChange={(e) => updateSport(index, 'age_max', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                  {displayErrors[`sports[${index}].age_max`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`sports[${index}].age_max`][0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayErrors.sports && (
          <p className="text-sm text-destructive mt-2">{displayErrors.sports[0]}</p>
        )}
      </div>

      {/* Submit button is handled by WizardNavigation */}
    </form>
  );
}
