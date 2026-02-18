/**
 * RequireOnboardingIncomplete guard component
 * Redirects to dashboard if onboarding is already completed
 */
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useOnboardingState } from '@/features/tenant/onboarding/hooks/useOnboardingState';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';

interface RequireOnboardingIncompleteProps {
  children: ReactNode;
}

export const RequireOnboardingIncomplete = ({ children }: RequireOnboardingIncompleteProps) => {
  const role = getCurrentUserRole();

  if (role === 'SUPERADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const { data, isLoading } = useOnboardingState();
  
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
    // Redirect to dashboard if onboarding is completed
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
