/**
 * Plan Detail Page (Platform - SUPERADMIN)
 * View and edit subscription plan
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { usePlan } from '../hooks/usePlan';
import { useUpdatePlan } from '../hooks/useUpdatePlan';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { PlanLimitsFields } from '../components/PlanLimitsFields';
import type { UpdatePlanRequest } from '../types';
import { limitsFromJson, limitsToJson, formatLimitsForDisplay, type PlanLimits } from '../types';

export const PlanDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdatePlanRequest>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [limits, setLimits] = useState<PlanLimits>({});

  const { data: plan, isLoading, error } = usePlan(id);
  const updatePlan = useUpdatePlan(id!);
  const { data: currenciesData, isLoading: isLoadingCurrencies } = usePlatformCurrencies({
    is_active: true,
  });
  const currencies = currenciesData?.results ?? [];

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        currency: plan.currency,
        trial_days: plan.trial_days,
        limits_json: plan.limits_json,
        seat_based_pricing: plan.seat_based_pricing,
        is_active: plan.is_active,
        is_public: plan.is_public,
      });
      setLimits(limitsFromJson(plan.limits_json as Record<string, unknown>));
    }
  }, [plan]);

  const handleChange = (field: keyof UpdatePlanRequest, value: any) => {
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
      await updatePlan.mutateAsync({
        ...formData,
        limits_json: limitsToJson(limits),
      });
      setIsEditing(false);
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (typeof errorData === 'object') {
          setErrors(errorData);
        } else {
          setErrors({
            non_field_errors: [errorData || 'Failed to update plan'],
          });
        }
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to update plan'],
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading plan details..." />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Plan not found')}
          onRetry={() => window.location.reload()}
          title="Failed to load plan"
          fullPage
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/platform/plans')}>
          ← Back to Plans
        </Button>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>Edit Plan</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Plan' : 'Plan Details'}</CardTitle>
          <CardDescription>Plan ID: {plan.id}</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
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
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug || ''}
                    onChange={(e) => handleChange('slug', e.target.value)}
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
                    checked={formData.is_active ?? false}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public ?? false}
                    onCheckedChange={(checked) => handleChange('is_public', checked)}
                  />
                  <Label htmlFor="is_public">Public</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="seat_based_pricing"
                    checked={formData.seat_based_pricing ?? false}
                    onCheckedChange={(checked) => handleChange('seat_based_pricing', checked)}
                  />
                  <Label htmlFor="seat_based_pricing">Seat-based Pricing</Label>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setErrors({});
                    if (plan) {
                      setFormData({
                        name: plan.name,
                        slug: plan.slug,
                        description: plan.description,
                        price_monthly: plan.price_monthly,
                        price_yearly: plan.price_yearly,
                        currency: plan.currency,
                        trial_days: plan.trial_days,
                        limits_json: plan.limits_json,
                        seat_based_pricing: plan.seat_based_pricing,
                        is_active: plan.is_active,
                        is_public: plan.is_public,
                      });
                      setLimits(limitsFromJson(plan.limits_json as Record<string, unknown>));
                    }
                  }}
                  disabled={updatePlan.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePlan.isPending}>
                  {updatePlan.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="text-lg font-medium">{plan.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Slug</Label>
                  <p className="text-lg font-medium">{plan.slug}</p>
                </div>
              </div>

              {plan.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm">{plan.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Monthly Price</Label>
                  <p className="text-lg font-medium">
                    {plan.price_monthly
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: plan.currency || 'USD',
                        }).format(plan.price_monthly)
                      : '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Yearly Price</Label>
                  <p className="text-lg font-medium">
                    {plan.price_yearly
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: plan.currency || 'USD',
                        }).format(plan.price_yearly)
                      : '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Trial Days</Label>
                  <p className="text-lg font-medium">{plan.trial_days || '—'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Limits</Label>
                {(() => {
                  const displayItems = formatLimitsForDisplay(plan.limits_json as Record<string, unknown>);
                  if (displayItems.length === 0) {
                    return <p className="mt-2 text-sm text-muted-foreground">No limits set</p>;
                  }
                  return (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                      {displayItems.map((item) => (
                        <li key={item.label}>
                          {item.label}: {item.value}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              <div className="flex gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-2 flex gap-2">
                    {plan.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        Inactive
                      </span>
                    )}
                    {plan.is_public && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        Public
                      </span>
                    )}
                    {plan.seat_based_pricing && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        Seat-based
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Created: {new Date(plan.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(plan.updated_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
