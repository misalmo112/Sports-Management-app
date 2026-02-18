/**
 * Sports Settings Page
 * Manage academy sports
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Step3Sports from '../components/steps/Step3Sports';
import { useSaveSports } from '../hooks/useSaveSports';
import type { Step3Sports as Step3SportsType } from '../types';

export const SportsPage = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const saveSports = useSaveSports();

  const handleSubmit = async (data: Step3SportsType) => {
    setErrors({});
    setSuccess(false);

    try {
      await saveSports.mutateAsync(data);
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
            non_field_errors: [errorData || 'Failed to save sports'],
          });
        }
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to save sports'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sports</h1>
          <p className="text-muted-foreground mt-2">Manage academy sports</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Sports saved successfully!
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
          <CardTitle>Sports</CardTitle>
          <CardDescription>
            Manage your academy sports. Add, edit, or remove sports as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Step3Sports
            onSubmit={handleSubmit}
            errors={errors}
            isLoading={saveSports.isPending}
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
              disabled={saveSports.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => formRef.current?.requestSubmit()}
              disabled={saveSports.isPending}
            >
              {saveSports.isPending ? 'Saving...' : 'Save Sports'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
