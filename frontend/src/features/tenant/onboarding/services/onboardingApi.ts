/**
 * API service functions for onboarding
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  OnboardingStateResponse,
  StepData,
  StepResponse,
} from '../types';

/**
 * Fetch current onboarding status
 */
export const getOnboardingState = async (): Promise<OnboardingStateResponse> => {
  const response = await apiClient.get<OnboardingStateResponse>(
    API_ENDPOINTS.ONBOARDING.STATE
  );
  return response.data;
};

/**
 * Submit step data
 */
export const submitStep = async (
  step: number,
  data: StepData
): Promise<StepResponse> => {
  const response = await apiClient.post<StepResponse>(
    API_ENDPOINTS.ONBOARDING.STEP(step),
    data
  );
  return response.data;
};

/**
 * Complete onboarding
 */
export const completeOnboarding = async (): Promise<{ status: string; message: string; data: any }> => {
  const response = await apiClient.post(
    API_ENDPOINTS.ONBOARDING.COMPLETE
  );
  return response.data;
};
