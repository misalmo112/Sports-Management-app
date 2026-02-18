/**
 * Academy Plan Page (Platform - SUPERADMIN)
 * Manage academy subscription plan
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useUpdateAcademyPlan } from '../hooks/hooks';
import { useAcademy } from '../hooks/hooks';
import { usePlans } from '@/features/platform/subscriptions/hooks/usePlans';
import { extractValidationErrors } from '@/shared/utils/errorUtils';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import type { UpdateAcademyPlanRequest } from '../types';

export const AcademyPlanPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UpdateAcademyPlanRequest>({
    plan_id: 0,
    start_at: '',
    overrides_json: {},
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const { data: academy, isLoading: isLoadingAcademy, error: academyError } = useAcademy(id);
  const { data: plansData, isLoading: isLoadingPlans, error: plansError } = usePlans({ is_active: true });
  const updatePlan = useUpdateAcademyPlan();
  const [prefilledPlan, setPrefilledPlan] = useState(false);

  const hasPlans = (plansData?.results?.length ?? 0) > 0;

  useEffect(() => {
    if (prefilledPlan) return;
    if (academy?.current_subscription?.plan) {
      setFormData((prev) => ({
        ...prev,
        plan_id: academy.current_subscription?.plan ?? prev.plan_id,
      }));
      setPrefilledPlan(true);
      return;
    }
    if (academy) {
      setPrefilledPlan(true);
    }
  }, [academy, prefilledPlan]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plan_id || formData.plan_id <= 0) {
      newErrors.plan_id = 'Plan is required';
    }

    if (formData.start_at) {
      const date = new Date(formData.start_at);
      if (isNaN(date.getTime())) {
        newErrors.start_at = 'Please enter a valid date';
      }
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof UpdateAcademyPlanRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (clientErrors[field]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm() || !id) {
      return;
    }

    try {
      const submitData: UpdateAcademyPlanRequest = {
        plan_id: formData.plan_id,
      };

      if (formData.start_at?.trim()) {
        submitData.start_at = formData.start_at;
      }

      if (formData.overrides_json && Object.keys(formData.overrides_json).length > 0) {
        submitData.overrides_json = formData.overrides_json;
      }

      await updatePlan.mutateAsync({ id, data: submitData });
      navigate(`/dashboard/platform/academies/${id}`);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to update plan'],
        });
      }
    }
  };

  if (isLoadingAcademy) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading academy..." />
      </div>
    );
  }

  if (academyError || !academy) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={academyError || new Error('Academy not found')}
          onRetry={() => window.location.reload()}
          title="Failed to load academy"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/platform/academies/${id}`)}>
          ← Back to Academy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Academy Plan</CardTitle>
          <CardDescription>
            Manage subscription plan for {academy.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {(errors.non_field_errors || plansError || (!isLoadingPlans && !hasPlans)) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors?.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                  {plansError ? <div>Failed to load plans. Please try again.</div> : null}
                  {!isLoadingPlans && !hasPlans ? (
                    <div>No active plans found. Create a plan before updating subscriptions.</div>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan_id">
                  Plan <span className="text-destructive">*</span>
                </Label>
                {isLoadingPlans ? (
                  <div className="text-sm text-muted-foreground">Loading plans...</div>
                ) : (
                  <Select
                    value={formData.plan_id > 0 ? formData.plan_id.toString() : ''}
                    onValueChange={(value) => handleChange('plan_id', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plansData?.results.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.name} {plan.price_monthly && `($${plan.price_monthly}/mo)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(errors.plan_id || clientErrors.plan_id) && (
                  <p className="text-sm text-destructive">
                    {errors.plan_id?.[0] || clientErrors.plan_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_at">Start Date (Optional)</Label>
                <Input
                  id="start_at"
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => handleChange('start_at', e.target.value)}
                />
                {(errors.start_at || clientErrors.start_at) && (
                  <p className="text-sm text-destructive">
                    {errors.start_at?.[0] || clientErrors.start_at}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Leave empty to start immediately
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/dashboard/platform/academies/${id}`)}
                disabled={updatePlan.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatePlan.isPending || isLoadingPlans || !hasPlans}>
                {updatePlan.isPending ? 'Updating...' : 'Update Plan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
