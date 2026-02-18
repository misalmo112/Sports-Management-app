/**
 * Navigation buttons for onboarding wizard
 */
import { Button } from '@/shared/components/ui/button';
import { Loader2 } from 'lucide-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const WizardNavigation = ({
  currentStep,
  totalSteps,
  canGoNext,
  isSubmitting,
  onPrevious,
  onNext,
}: WizardNavigationProps) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isSubmitting}
      >
        Previous
      </Button>
      <Button
        type="button"
        onClick={onNext}
        disabled={!canGoNext || isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLastStep ? 'Complete' : 'Next'}
      </Button>
    </div>
  );
};
