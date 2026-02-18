/**
 * Age Categories Settings Page
 * Manage academy age categories
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Step4AgeCategories from '../components/steps/Step4AgeCategories';
import { useSaveAgeCategories } from '../hooks/useSaveAgeCategories';
import type { Step4AgeCategories as Step4AgeCategoriesType } from '../types';

export const AgeCategoriesPage = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const saveAgeCategories = useSaveAgeCategories();

  const handleSubmit = async (data: Step4AgeCategoriesType) => {
    setErrors({});
    setSuccess(false);

    try {
      await saveAgeCategories.mutateAsync(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (typeof errorData === 'object') {
          setErrors(errorData);
        } else {
          setErrors({
            non_field_errors: [errorData || 'Failed to save age categories'],
          });
        }
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to save age categories'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Age Categories</h1>
          <p className="text-muted-foreground mt-2">Manage academy age categories</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Age categories saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {errors.non_field_errors && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errors.non_field_errors.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Age Categories</CardTitle>
          <CardDescription>
            Manage your academy age categories. Add, edit, or remove age categories as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Step4AgeCategories
            onSubmit={handleSubmit}
            errors={errors}
            isLoading={saveAgeCategories.isPending}
            formRef={(form) => {
              if (form && formRef.current !== form) {
                (formRef as React.MutableRefObject<HTMLFormElement | null>).current = form;
              }
            }}
          />
          <div className="mt-6 flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={saveAgeCategories.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => formRef.current?.requestSubmit()}
              disabled={saveAgeCategories.isPending}
            >
              {saveAgeCategories.isPending ? 'Saving...' : 'Save Age Categories'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
