/**
 * Step 5: Terms
 */
import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { validateStep5 } from '../../utils/validation';
import type { Step5Terms, Term } from '../../types';

interface Step5TermsProps {
  onSubmit: (data: Step5Terms) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
}

export default function Step5Terms({ onSubmit, errors, isLoading: _isLoading, formRef }: Step5TermsProps) {
  const [terms, setTerms] = useState<Term[]>([
    { name: '', start_date: '', end_date: '', description: '' },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.terms && parsed.terms.length > 0) {
          setTerms(parsed.terms);
        }
      } catch (e) {
        console.error('Error loading saved step 5 data:', e);
      }
    }
  }, []);

  const addTerm = () => {
    setTerms([...terms, { name: '', start_date: '', end_date: '', description: '' }]);
  };

  const removeTerm = (index: number) => {
    if (terms.length > 1) {
      setTerms(terms.filter((_, i) => i !== index));
    }
  };

  const updateTerm = (index: number, field: keyof Term, value: string) => {
    setTerms(terms.map((term, i) => 
      i === index ? { ...term, [field]: value } : term
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Step5Terms = { terms };
    const clientErrors = validateStep5(data);
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
          <h3 className="text-lg font-semibold">Terms</h3>
          <Button type="button" variant="outline" size="sm" onClick={addTerm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Term
          </Button>
        </div>

        <div className="space-y-6">
          {terms.map((term, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Term {index + 1}</h4>
                {terms.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTerm(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor={`term-name-${index}`}>Term Name *</Label>
                <Input
                  id={`term-name-${index}`}
                  value={term.name}
                  onChange={(e) => updateTerm(index, 'name', e.target.value)}
                  required
                  maxLength={255}
                />
                {displayErrors[`terms[${index}].name`] && (
                  <p className="text-sm text-destructive mt-1">
                    {displayErrors[`terms[${index}].name`][0]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`term-start-${index}`}>Start Date *</Label>
                  <Input
                    id={`term-start-${index}`}
                    type="date"
                    value={term.start_date}
                    onChange={(e) => updateTerm(index, 'start_date', e.target.value)}
                    required
                  />
                  {displayErrors[`terms[${index}].start_date`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`terms[${index}].start_date`][0]}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`term-end-${index}`}>End Date *</Label>
                  <Input
                    id={`term-end-${index}`}
                    type="date"
                    value={term.end_date}
                    onChange={(e) => updateTerm(index, 'end_date', e.target.value)}
                    required
                  />
                  {displayErrors[`terms[${index}].end_date`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`terms[${index}].end_date`][0]}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor={`term-description-${index}`}>Description</Label>
                <Textarea
                  id={`term-description-${index}`}
                  value={term.description || ''}
                  onChange={(e) => updateTerm(index, 'description', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {displayErrors.terms && (
          <p className="text-sm text-destructive mt-2">{displayErrors.terms[0]}</p>
        )}
      </div>

      {/* Submit button is handled by WizardNavigation */}
    </form>
  );
}
