/**
 * Hook for fetching onboarding state
 */
import { useQuery } from '@tanstack/react-query';
import { getOnboardingState } from '../services/onboardingApi';
import type { OnboardingStateResponse } from '../types';

const ONBOARDING_STATE_TIMEOUT_MS = 15_000;

/** Fetch onboarding state with a timeout so the UI never spins forever */
async function fetchOnboardingStateWithTimeout(): Promise<OnboardingStateResponse> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Check your connection and try again.')), ONBOARDING_STATE_TIMEOUT_MS)
  );
  return Promise.race([getOnboardingState(), timeout]);
}

export const useOnboardingState = () => {
  return useQuery<OnboardingStateResponse, Error>({
    queryKey: ['onboarding', 'state'],
    queryFn: fetchOnboardingStateWithTimeout,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false, // Fail fast on 401/403 so user sees error instead of spinning
    refetchOnMount: true,
  });
};
