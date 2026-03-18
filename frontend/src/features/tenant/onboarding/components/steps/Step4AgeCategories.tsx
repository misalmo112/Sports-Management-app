/**
 * Step 4: Age Categories
 */
import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { validateAgeCategories } from '../../utils/validation';
import type { AgeCategoriesPayload, AgeCategory } from '../../types';

interface Step4AgeCategoriesProps {
  onSubmit: (data: AgeCategoriesPayload) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
}

export default function Step4AgeCategories({ onSubmit, errors, isLoading: _isLoading, formRef }: Step4AgeCategoriesProps) {
  const [ageCategories, setAgeCategories] = useState<AgeCategory[]>([
    { name: '', age_min: 0, age_max: 0, description: '' },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.age_categories && parsed.age_categories.length > 0) {
          setAgeCategories(parsed.age_categories);
        }
      } catch (e) {
        console.error('Error loading saved step 4 data:', e);
      }
    }
  }, []);

  const addCategory = () => {
    setAgeCategories([...ageCategories, { name: '', age_min: 0, age_max: 0, description: '' }]);
  };

  const removeCategory = (index: number) => {
    if (ageCategories.length > 1) {
      setAgeCategories(ageCategories.filter((_, i) => i !== index));
    }
  };

  const updateCategory = (index: number, field: keyof AgeCategory, value: string | number) => {
    setAgeCategories(ageCategories.map((cat, i) => 
      i === index ? { ...cat, [field]: value } : cat
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: AgeCategoriesPayload = { age_categories: ageCategories };
    const clientErrors = validateAgeCategories(data);
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
          <h3 className="text-lg font-semibold">Age Categories</h3>
          <Button type="button" variant="outline" size="sm" onClick={addCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="space-y-6">
          {ageCategories.map((category, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Category {index + 1}</h4>
                {ageCategories.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor={`category-name-${index}`}>Category Name *</Label>
                <Input
                  id={`category-name-${index}`}
                  value={category.name}
                  onChange={(e) => updateCategory(index, 'name', e.target.value)}
                  required
                  maxLength={255}
                />
                {displayErrors[`age_categories[${index}].name`] && (
                  <p className="text-sm text-destructive mt-1">
                    {displayErrors[`age_categories[${index}].name`][0]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`category-age-min-${index}`}>Minimum Age *</Label>
                  <Input
                    id={`category-age-min-${index}`}
                    type="number"
                    min="0"
                    value={category.age_min}
                    onChange={(e) => updateCategory(index, 'age_min', parseInt(e.target.value) || 0)}
                    required
                  />
                  {displayErrors[`age_categories[${index}].age_min`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`age_categories[${index}].age_min`][0]}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`category-age-max-${index}`}>Maximum Age *</Label>
                  <Input
                    id={`category-age-max-${index}`}
                    type="number"
                    min="0"
                    value={category.age_max}
                    onChange={(e) => updateCategory(index, 'age_max', parseInt(e.target.value) || 0)}
                    required
                  />
                  {displayErrors[`age_categories[${index}].age_max`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`age_categories[${index}].age_max`][0]}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor={`category-description-${index}`}>Description</Label>
                <Textarea
                  id={`category-description-${index}`}
                  value={category.description || ''}
                  onChange={(e) => updateCategory(index, 'description', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {displayErrors.age_categories && (
          <p className="text-sm text-destructive mt-2">{displayErrors.age_categories[0]}</p>
        )}
      </div>

      {/* Submit button is handled by WizardNavigation */}
    </form>
  );
}
