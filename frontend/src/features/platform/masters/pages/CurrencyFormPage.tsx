/**
 * Currency create/edit page (Platform - SUPERADMIN)
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
import { useCurrency } from '../hooks/useCurrency';
import { useCreateCurrency } from '../hooks/useCreateCurrency';
import { useUpdateCurrency } from '../hooks/useUpdateCurrency';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import type { CreateCurrencyRequest, UpdateCurrencyRequest } from '../types';

export const CurrencyFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id != null && id !== 'new';
  const [formData, setFormData] = useState<CreateCurrencyRequest & { sort_order?: number }>({
    code: '',
    name: '',
    is_active: true,
    sort_order: 0,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { data: currency, isLoading: loadDetail, error: loadError } = useCurrency(isEdit ? id : undefined);
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency(id!);

  useEffect(() => {
    if (currency) {
      setFormData({
        code: currency.code,
        name: currency.name ?? '',
        is_active: currency.is_active,
        sort_order: currency.sort_order ?? 0,
      });
    }
  }, [currency]);

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
    const code = (formData.code?.trim() ?? '').toUpperCase();
    if (!isEdit && code.length !== 3) {
      setErrors({
        code: [code.length === 0 ? 'Currency code is required.' : 'Currency code must be exactly 3 characters.'],
      });
      return;
    }
    const payload: CreateCurrencyRequest & { sort_order?: number } = {
      code: code || (currency?.code ?? ''),
      name: formData.name?.trim() ?? '',
      is_active: formData.is_active ?? true,
      sort_order: formData.sort_order ?? 0,
    };
    try {
      if (isEdit) {
        await updateCurrency.mutateAsync(payload as UpdateCurrencyRequest);
        navigate('/dashboard/platform/masters/currencies');
      } else {
        await createCurrency.mutateAsync(payload);
        navigate('/dashboard/platform/masters/currencies');
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
        setErrors({ non_field_errors: ['Failed to save currency.'] });
      }
    }
  };

  if (isEdit && loadDetail) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading currency..." />
      </div>
    );
  }
  if (isEdit && loadError) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState error={loadError} onRetry={() => {}} title="Failed to load currency" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/platform/masters/currencies')}>
          ← Back to Currencies
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Currency' : 'Add Currency'}</CardTitle>
          <CardDescription>
            {isEdit ? 'Update currency details.' : 'Add a new currency code for the platform.'}
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
                <Label htmlFor="code">Code (3 letters)</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="USD"
                  maxLength={3}
                  disabled={isEdit}
                  className="uppercase"
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
                  placeholder="US Dollar"
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
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/platform/masters/currencies')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
