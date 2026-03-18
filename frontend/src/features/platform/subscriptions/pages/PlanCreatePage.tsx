/**
 * Plan Create Page (Platform - SUPERADMIN)
 * Create a new subscription plan
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { usePlatformCurrencies } from '@/features/platform/masters/hooks/usePlatformCurrencies';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useCreatePlan } from '../hooks/useCreatePlan';
import { PlanLimitsFields } from '../components/PlanLimitsFields';
import type { CreatePlanRequest } from '../types';
import { limitsFromJson, limitsToJson, type PlanLimits } from '../types';

export const PlanCreatePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: '',
    slug: '',
    description: '',
    price_monthly: undefined,
    price_yearly: undefined,
    currency: 'USD',
    trial_days: undefined,
    limits_json: {},
    seat_based_pricing: false,
    is_active: true,
    is_public: false,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [limits, setLimits] = useState<PlanLimits>(() => limitsFromJson(formData.limits_json));

  const createPlan = useCreatePlan();
  const { data: currenciesData, isLoading: isLoadingCurrencies } = usePlatformCurrencies({
    is_active: true,
  });
  const currencies = currenciesData?.results ?? [];

  const handleChange = (field: keyof CreatePlanRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const plan = await createPlan.mutateAsync({
        ...formData,
        limits_json: limitsToJson(limits),
      });
      navigate(`/dashboard/platform/plans/${plan.id}`);
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (typeof errorData === 'object') {
          setErrors(errorData);
        } else {
          setErrors({
            non_field_errors: [errorData || 'Failed to create plan'],
          });
        }
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create plan'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/platform/plans')}>
          ← Back to Plans
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Plan</CardTitle>
          <CardDescription>Create a new subscription plan</CardDescription>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  required
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Monthly Price</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_monthly || ''}
                  onChange={(e) => handleChange('price_monthly', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                {errors.price_monthly && (
                  <p className="text-sm text-destructive">{errors.price_monthly[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_yearly">Yearly Price</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_yearly || ''}
                  onChange={(e) => handleChange('price_yearly', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                {errors.price_yearly && (
                  <p className="text-sm text-destructive">{errors.price_yearly[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency || ''}
                  onValueChange={(value) => handleChange('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCurrencies ? (
                      <SelectItem value="__loading__" disabled>
                        Loading currencies...
                      </SelectItem>
                    ) : currencies.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        No currencies configured
                      </SelectItem>
                    ) : (
                      currencies.map((c) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.name || c.code}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.currency && (
                  <p className="text-sm text-destructive">{errors.currency[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trial_days">Trial Days</Label>
                <Input
                  id="trial_days"
                  type="number"
                  min="0"
                  value={formData.trial_days || ''}
                  onChange={(e) => handleChange('trial_days', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                {errors.trial_days && (
                  <p className="text-sm text-destructive">{errors.trial_days[0]}</p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Plan limits</Label>
                <PlanLimitsFields value={limits} onChange={setLimits} errors={errors} />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => handleChange('is_public', checked)}
                />
                <Label htmlFor="is_public">Public</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="seat_based_pricing"
                  checked={formData.seat_based_pricing}
                  onCheckedChange={(checked) => handleChange('seat_based_pricing', checked)}
                />
                <Label htmlFor="seat_based_pricing">Seat-based Pricing</Label>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/platform/plans')}
                disabled={createPlan.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPlan.isPending}>
                {createPlan.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
