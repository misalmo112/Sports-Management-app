/**
 * RequireOnboardingIncomplete guard component
 * Redirects to dashboard if onboarding is already completed
 */
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useOnboardingState } from '@/features/tenant/onboarding/hooks/useOnboardingState';
import { canRunAcademyOnboardingWizard, getCurrentUserRole } from '@/shared/utils/roleAccess';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { logout } from '@/shared/utils/auth';

interface RequireOnboardingIncompleteProps {
  children: ReactNode;
}

export const RequireOnboardingIncomplete = ({ children }: RequireOnboardingIncompleteProps) => {
  const role = getCurrentUserRole();

  if (role === 'SUPERADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!canRunAcademyOnboardingWizard(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data, isLoading, isError, error, refetch } = useOnboardingState();

  if (isError) {
    const message = error?.message || (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Could not load onboarding.';
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to load onboarding</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => refetch()}>Try again</Button>
            <Button variant="outline" onClick={() => logout()}>
              Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (data?.data?.is_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
