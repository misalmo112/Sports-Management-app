/**
 * RequireOnboardingComplete guard component
 * Checks if onboarding is completed, redirects to onboarding if not
 */
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useOnboardingState } from '@/features/tenant/onboarding/hooks/useOnboardingState';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';

interface RequireOnboardingCompleteProps {
  children: ReactNode;
}

export const RequireOnboardingComplete = ({ children }: RequireOnboardingCompleteProps) => {
  const role = getCurrentUserRole();

  if (role === 'SUPERADMIN') {
    return <>{children}</>;
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
  
  if (!data?.data?.is_completed) {
    // Redirect to onboarding if not completed
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
