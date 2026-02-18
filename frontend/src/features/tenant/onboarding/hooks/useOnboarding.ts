/**
 * Main onboarding hook combining state and mutations
 */
import { useOnboardingState } from './useOnboardingState';
import { useSubmitStep } from './useSubmitStep';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeOnboarding } from '../services/onboardingApi';

export const useOnboarding = () => {
  const stateQuery = useOnboardingState();
  const submitStepMutation = useSubmitStep();
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      // Refetch state after completion
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'state'] });
    },
  });

  return {
    state: stateQuery.data?.data,
    isLoading: stateQuery.isLoading,
    isSubmitting: submitStepMutation.isPending,
    isCompleting: completeMutation.isPending,
    error: stateQuery.error || submitStepMutation.error || completeMutation.error,
    submitStep: submitStepMutation.mutateAsync,
    completeOnboarding: completeMutation.mutateAsync,
    refetch: stateQuery.refetch,
  };
};
