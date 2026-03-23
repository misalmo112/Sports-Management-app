/**
 * Main onboarding wizard container
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useOnboarding } from '../hooks/useOnboarding';
import { WizardProgress } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';
import { ErrorDisplay } from './ErrorDisplay';
import Step1Profile from './steps/Step1Profile';
import Step2Locations from './steps/Step2Locations';
import Step3Sports from './steps/Step3Sports';
import Step5Terms from './steps/Step5Terms';
import Step6Pricing from './steps/Step6Pricing';
import { logout } from '@/shared/utils/auth';
import { getTenantDashboardHomePath } from '@/shared/nav/navigation';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';
import { LogOut } from 'lucide-react';
import type { StepData } from '../types';

const TOTAL_STEPS = 5;

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { state, isLoading, isSubmitting, isCompleting, error, submitStep, completeOnboarding, refetch } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<Record<string, string[]>>({});
  const [_formData, setFormData] = useState<Record<number, StepData>>({});
  const formRefs = useRef<Record<number, HTMLFormElement | null>>({});

  // Initialize current step from API state
  useEffect(() => {
    if (state) {
      setCurrentStep(state.current_step);
    }
  }, [state]);

  // Redirect to dashboard if onboarding is complete
  useEffect(() => {
    if (state?.is_completed) {
      setTimeout(() => {
        navigate(getTenantDashboardHomePath(getCurrentUserRole()));
      }, 2000);
    }
  }, [state?.is_completed, navigate]);

  const handleStepChange = (newStep: number) => {
    // Prevent skipping to future incomplete steps
    if (!state) return;
    
    const stepKey = `step_${newStep - 1}` as keyof typeof state.steps;
    const previousStepCompleted = newStep === 1 || state.steps[stepKey]?.completed || false;
    
    if (newStep > currentStep && !previousStepCompleted) {
      return; // Cannot skip ahead
    }

    setCurrentStep(newStep);
    setStepErrors({});
  };

  const handleSubmit = async (stepData: StepData) => {
    setStepErrors({});
    
    try {
      const response = await submitStep({ step: currentStep, data: stepData });
      
      if (response.status === 'error') {
        if (response.errors) {
          setStepErrors(response.errors);
        }
        return;
      }

      // Save form data to localStorage
      setFormData((prev) => ({ ...prev, [currentStep]: stepData }));
      localStorage.setItem(`onboarding_step_${currentStep}`, JSON.stringify(stepData));

      // If this is the last step and onboarding is complete, call complete endpoint
      if (currentStep === TOTAL_STEPS && response.onboarding_complete) {
        await completeOnboarding();
        // Clear all localStorage
        for (let i = 1; i <= TOTAL_STEPS; i++) {
          localStorage.removeItem(`onboarding_step_${i}`);
        }
        // Redirect will happen via useEffect
      } else if (response.next_step) {
        // Move to next step
        setCurrentStep(response.next_step);
        setStepErrors({});
      }

      // Refetch state to get updated progress
      await refetch();
    } catch (err) {
      console.error('Error submitting step:', err);
      if (err instanceof Error) {
        setStepErrors({ _general: [err.message] });
      }
    }
  };

  const handleNext = () => {
    // Trigger form submission for current step
    const form = formRefs.current[currentStep];
    if (form) {
      form.requestSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      handleStepChange(currentStep - 1);
    }
  };

  const renderStep = () => {
    const commonProps = {
      onSubmit: handleSubmit,
      errors: stepErrors,
      isLoading: isSubmitting || isCompleting,
      formRef: (form: HTMLFormElement | null) => {
        formRefs.current[currentStep] = form;
      },
    };

    switch (currentStep) {
      case 1:
        return <Step1Profile {...commonProps} initialData={state?.profile} />;
      case 2:
        return <Step2Locations {...commonProps} />;
      case 3:
        return <Step3Sports {...commonProps} />;
      case 4:
        return <Step5Terms {...commonProps} />;
      case 5:
        return <Step6Pricing {...commonProps} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading onboarding status...</p>
        </div>
      </div>
    );
  }

  if (state?.is_completed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Onboarding Complete!</CardTitle>
            <CardDescription>Redirecting to setup checklist...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Academy Onboarding</CardTitle>
                <CardDescription>
                  Complete the following steps to set up your academy
                </CardDescription>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-background hover:border-destructive/50 hover:text-destructive"
                data-testid="logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <WizardProgress state={state} currentStep={currentStep} />
            
            <ErrorDisplay 
              error={error || undefined} 
              apiErrors={stepErrors}
            />

            <div className="mt-6">
              {renderStep()}
            </div>

            <WizardNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoNext={true} // Individual steps will handle validation
              isSubmitting={isSubmitting || isCompleting}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
