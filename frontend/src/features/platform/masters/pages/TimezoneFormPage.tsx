/**
 * Timezone create/edit page (Platform - SUPERADMIN)
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useTimezone } from '../hooks/useTimezone';
import { useCreateTimezone } from '../hooks/useCreateTimezone';
import { useUpdateTimezone } from '../hooks/useUpdateTimezone';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import type { CreateTimezoneRequest, UpdateTimezoneRequest } from '../types';

export const TimezoneFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id != null && id !== 'new';
  const [formData, setFormData] = useState<CreateTimezoneRequest & { sort_order?: number }>({
    code: '',
    name: '',
    is_active: true,
    sort_order: 0,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { data: timezone, isLoading: loadDetail, error: loadError } = useTimezone(isEdit ? id : undefined);
  const createTimezone = useCreateTimezone();
  const updateTimezone = useUpdateTimezone(id!);

  useEffect(() => {
    if (timezone) {
      setFormData({
        code: timezone.code,
        name: timezone.name ?? '',
        is_active: timezone.is_active,
        sort_order: timezone.sort_order ?? 0,
      });
    }
  }, [timezone]);

  const handleChange = (field: keyof typeof formData, value: string | number | boolean | undefined) => {
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
    const payload: CreateTimezoneRequest & { sort_order?: number } = {
      code: formData.code?.trim() ?? '',
      name: formData.name?.trim() ?? '',
      is_active: formData.is_active ?? true,
      sort_order: formData.sort_order ?? 0,
    };
    try {
      if (isEdit) {
        await updateTimezone.mutateAsync(payload as UpdateTimezoneRequest);
        navigate('/dashboard/platform/masters/timezones');
      } else {
        await createTimezone.mutateAsync(payload);
        navigate('/dashboard/platform/masters/timezones');
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (data && typeof data === 'object') {
        const next: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(data)) {
          next[k] = Array.isArray(v) ? v : [v];
        }
        setErrors(next);
      } else {
        setErrors({ non_field_errors: ['Failed to save timezone.'] });
      }
    }
  };

  if (isEdit && loadDetail) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading timezone..." />
      </div>
    );
  }
  if (isEdit && loadError) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState error={loadError} onRetry={() => {}} title="Failed to load timezone" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/platform/masters/timezones')}>
          ← Back to Time zones
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Time zone' : 'Add Time zone'}</CardTitle>
          <CardDescription>
            {isEdit ? 'Update timezone details.' : 'Add a new timezone (e.g. America/New_York).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors.map((msg, i) => (
                    <div key={i}>{msg}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="America/New_York"
                  disabled={isEdit}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.join(' ')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={formData.name ?? ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Eastern Time"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={formData.sort_order ?? 0}
                  onChange={(e) => handleChange('sort_order', parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">{isEdit ? 'Save' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/platform/masters/timezones')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
