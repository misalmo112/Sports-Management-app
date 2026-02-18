/**
 * Step 6: Pricing
 */
import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { validateStep6 } from '../../utils/validation';
import type { Step6Pricing, PricingItem, DurationType } from '../../types';

interface Step6PricingProps {
  onSubmit: (data: Step6Pricing) => Promise<void>;
  errors?: Record<string, string[]>;
  isLoading?: boolean;
  formRef?: (form: HTMLFormElement | null) => void;
}

const DURATION_TYPES: DurationType[] = ['MONTHLY', 'WEEKLY', 'SESSION', 'CUSTOM'];

export default function Step6Pricing({ onSubmit, errors, isLoading: _isLoading, formRef }: Step6PricingProps) {
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([
    { name: '', description: '', duration_type: 'MONTHLY', duration_value: 1, price: 0, currency: 'USD' },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step_6');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.pricing_items && parsed.pricing_items.length > 0) {
          setPricingItems(parsed.pricing_items);
        }
      } catch (e) {
        console.error('Error loading saved step 6 data:', e);
      }
    }
  }, []);

  const addPricingItem = () => {
    setPricingItems([...pricingItems, { name: '', description: '', duration_type: 'MONTHLY', duration_value: 1, price: 0, currency: 'USD' }]);
  };

  const removePricingItem = (index: number) => {
    if (pricingItems.length > 1) {
      setPricingItems(pricingItems.filter((_, i) => i !== index));
    }
  };

  const updatePricingItem = (index: number, field: keyof PricingItem, value: string | number) => {
    setPricingItems(pricingItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Step6Pricing = { pricing_items: pricingItems };
    const clientErrors = validateStep6(data);
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
          <h3 className="text-lg font-semibold">Pricing Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={addPricingItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pricing Item
          </Button>
        </div>

        <div className="space-y-6">
          {pricingItems.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Pricing Item {index + 1}</h4>
                {pricingItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePricingItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor={`pricing-name-${index}`}>Name *</Label>
                <Input
                  id={`pricing-name-${index}`}
                  value={item.name}
                  onChange={(e) => updatePricingItem(index, 'name', e.target.value)}
                  required
                  maxLength={255}
                />
                {displayErrors[`pricing_items[${index}].name`] && (
                  <p className="text-sm text-destructive mt-1">
                    {displayErrors[`pricing_items[${index}].name`][0]}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor={`pricing-description-${index}`}>Description</Label>
                <Textarea
                  id={`pricing-description-${index}`}
                  value={item.description || ''}
                  onChange={(e) => updatePricingItem(index, 'description', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`pricing-duration-type-${index}`}>Duration Type *</Label>
                  <Select
                    value={item.duration_type}
                    onValueChange={(value) => updatePricingItem(index, 'duration_type', value as DurationType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {displayErrors[`pricing_items[${index}].duration_type`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`pricing_items[${index}].duration_type`][0]}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`pricing-duration-value-${index}`}>Duration Value *</Label>
                  <Input
                    id={`pricing-duration-value-${index}`}
                    type="number"
                    min="1"
                    value={item.duration_value}
                    onChange={(e) => updatePricingItem(index, 'duration_value', parseInt(e.target.value) || 1)}
                    required
                  />
                  {displayErrors[`pricing_items[${index}].duration_value`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`pricing_items[${index}].duration_value`][0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`pricing-price-${index}`}>Price *</Label>
                  <Input
                    id={`pricing-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updatePricingItem(index, 'price', parseFloat(e.target.value) || 0)}
                    required
                  />
                  {displayErrors[`pricing_items[${index}].price`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`pricing_items[${index}].price`][0]}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`pricing-currency-${index}`}>Currency *</Label>
                  <Input
                    id={`pricing-currency-${index}`}
                    value={item.currency}
                    onChange={(e) => updatePricingItem(index, 'currency', e.target.value.toUpperCase())}
                    maxLength={3}
                    required
                    placeholder="USD"
                  />
                  {displayErrors[`pricing_items[${index}].currency`] && (
                    <p className="text-sm text-destructive mt-1">
                      {displayErrors[`pricing_items[${index}].currency`][0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayErrors.pricing_items && (
          <p className="text-sm text-destructive mt-2">{displayErrors.pricing_items[0]}</p>
        )}
      </div>

      {/* Submit button is handled by WizardNavigation */}
    </form>
  );
}
