/**
 * Hook for submitting onboarding steps
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitStep } from '../services/onboardingApi';
import type { StepData, StepResponse } from '../types';

export const useSubmitStep = () => {
  const queryClient = useQueryClient();

  return useMutation<StepResponse, Error, { step: number; data: StepData }>({
    mutationFn: ({ step, data }) => submitStep(step, data),
    onSuccess: () => {
      // Refetch onboarding state after successful submission
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'state'] });
    },
  });
};
