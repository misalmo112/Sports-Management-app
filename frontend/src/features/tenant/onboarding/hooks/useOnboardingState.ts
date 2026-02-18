/**
 * Hook for fetching onboarding state
 */
import { useQuery } from '@tanstack/react-query';
import { getOnboardingState } from '../services/onboardingApi';
import type { OnboardingStateResponse } from '../types';

export const useOnboardingState = () => {
  return useQuery<OnboardingStateResponse, Error>({
    queryKey: ['onboarding', 'state'],
    queryFn: getOnboardingState,
    staleTime: 0, // Always refetch
    refetchOnWindowFocus: true,
  });
};
