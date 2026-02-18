/**
 * Academy Quota Page (Platform - SUPERADMIN)
 * Manage academy quotas
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useUpdateAcademyQuota } from '../hooks/hooks';
import { useAcademy } from '../hooks/hooks';
import { extractValidationErrors } from '@/shared/utils/errorUtils';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import type { UpdateAcademyQuotaRequest } from '../types';

export const AcademyQuotaPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UpdateAcademyQuotaRequest['overrides_json']>({
    storage_bytes: undefined,
    max_students: undefined,
    max_coaches: undefined,
    max_admins: undefined,
    max_classes: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [prefilledQuota, setPrefilledQuota] = useState(false);

  const { data: academy, isLoading: isLoadingAcademy, error: academyError } = useAcademy(id);
  const updateQuota = useUpdateAcademyQuota();

  useEffect(() => {
    if (prefilledQuota) return;
    if (academy?.current_subscription?.overrides_json) {
      setFormData((prev) => ({
        ...prev,
        ...academy.current_subscription?.overrides_json,
      }));
      setPrefilledQuota(true);
      return;
    }
    if (academy) {
      setPrefilledQuota(true);
    }
  }, [academy, prefilledQuota]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate that at least one quota is set
    const hasAnyQuota = Object.values(formData).some(
      (value) => value !== undefined && value !== null && (typeof value === 'string' ? value !== '' : true)
    );

    if (!hasAnyQuota) {
      newErrors.non_field_errors = 'At least one quota override must be set';
    }

    // Validate each quota is a non-negative integer
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && (typeof value === 'string' ? value !== '' : true)) {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (isNaN(numValue) || numValue < 0) {
          newErrors[key] = 'Must be a non-negative integer';
        }
      }
    });

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof UpdateAcademyQuotaRequest['overrides_json'], value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [field]: numValue,
    }));
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
      // Build overrides_json with only defined values
      const overrides_json: Record<string, number> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && (typeof value === 'string' ? value !== '' : true)) {
          overrides_json[key] = typeof value === 'string' ? parseInt(value, 10) : value;
        }
      });

      const submitData: UpdateAcademyQuotaRequest = {
        overrides_json,
      };

      await updateQuota.mutateAsync({ id, data: submitData });
      navigate(`/dashboard/platform/academies/${id}`);
    } catch (error: any) {
      const detailMessage = error?.response?.data?.detail;
      if (detailMessage) {
        setErrors({
          non_field_errors: [detailMessage],
        });
        return;
      }

      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to update quota'],
        });
      }
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
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
          <CardTitle>Update Academy Quotas</CardTitle>
          <CardDescription>
            Manage quota overrides for {academy.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {(errors.non_field_errors || clientErrors.non_field_errors) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors?.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                  {clientErrors.non_field_errors ? <div>{clientErrors.non_field_errors}</div> : null}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set quota overrides. Leave empty to use plan defaults. Values must be non-negative integers.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storage_bytes">Storage Limit (bytes)</Label>
                  <Input
                    id="storage_bytes"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.storage_bytes || ''}
                    onChange={(e) => handleChange('storage_bytes', e.target.value)}
                    placeholder="e.g., 10737418240 (10GB)"
                  />
                  {(errors.storage_bytes || clientErrors.storage_bytes) && (
                    <p className="text-sm text-destructive">
                      {errors.storage_bytes?.[0] || clientErrors.storage_bytes}
                    </p>
                  )}
                  {formData.storage_bytes && (
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(formData.storage_bytes)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_students">Max Students</Label>
                  <Input
                    id="max_students"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.max_students || ''}
                    onChange={(e) => handleChange('max_students', e.target.value)}
                    placeholder="e.g., 100"
                  />
                  {(errors.max_students || clientErrors.max_students) && (
                    <p className="text-sm text-destructive">
                      {errors.max_students?.[0] || clientErrors.max_students}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_coaches">Max Coaches</Label>
                  <Input
                    id="max_coaches"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.max_coaches || ''}
                    onChange={(e) => handleChange('max_coaches', e.target.value)}
                    placeholder="e.g., 10"
                  />
                  {(errors.max_coaches || clientErrors.max_coaches) && (
                    <p className="text-sm text-destructive">
                      {errors.max_coaches?.[0] || clientErrors.max_coaches}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_admins">Max Admins</Label>
                  <Input
                    id="max_admins"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.max_admins || ''}
                    onChange={(e) => handleChange('max_admins', e.target.value)}
                    placeholder="e.g., 5"
                  />
                  {(errors.max_admins || clientErrors.max_admins) && (
                    <p className="text-sm text-destructive">
                      {errors.max_admins?.[0] || clientErrors.max_admins}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_classes">Max Classes</Label>
                  <Input
                    id="max_classes"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.max_classes || ''}
                    onChange={(e) => handleChange('max_classes', e.target.value)}
                    placeholder="e.g., 50"
                  />
                  {(errors.max_classes || clientErrors.max_classes) && (
                    <p className="text-sm text-destructive">
                      {errors.max_classes?.[0] || clientErrors.max_classes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/dashboard/platform/academies/${id}`)}
                disabled={updateQuota.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateQuota.isPending}>
                {updateQuota.isPending ? 'Updating...' : 'Update Quotas'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
