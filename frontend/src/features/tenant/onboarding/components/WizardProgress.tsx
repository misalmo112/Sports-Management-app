/**
 * Progress indicator for onboarding wizard
 */
import { Check } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { OnboardingState } from '../types';

interface WizardProgressProps {
  state: OnboardingState | undefined;
  currentStep: number;
}

const STEP_NAMES = [
  'Academy Profile',
  'Branches',
  'Sports',
  'Terms',
  'Pricing',
];

export const WizardProgress = ({ state, currentStep }: WizardProgressProps) => {
  const getStepStatus = (step: number) => {
    if (!state) return 'upcoming';
    const stepKey = `step_${step}` as keyof typeof state.steps;
    const isCompleted = state.steps[stepKey]?.completed || false;
    
    if (isCompleted) return 'completed';
    if (step === currentStep) return 'current';
    if (step < currentStep) return 'completed';
    return 'upcoming';
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {STEP_NAMES.map((name, index) => {
          const step = index + 1;
          const status = getStepStatus(step);
          const isLast = step === STEP_NAMES.length;

          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {/* Step circle */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                      {
                        'bg-primary text-primary-foreground border-primary': status === 'current',
                        'bg-green-500 text-white border-green-500': status === 'completed',
                        'bg-gray-200 text-gray-500 border-gray-300': status === 'upcoming',
                      }
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <span className="font-semibold">{step}</span>
                    )}
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2 transition-colors',
                        status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                      )}
                    />
                  )}
                </div>
                {/* Step label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn('text-sm font-medium', {
                      'text-primary': status === 'current',
                      'text-green-600': status === 'completed',
                      'text-gray-500': status === 'upcoming',
                    })}
                  >
                    {name}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
