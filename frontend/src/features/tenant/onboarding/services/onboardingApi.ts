/**
 * API service functions for onboarding
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import axios from 'axios';
import type {
  OnboardingStateResponse,
  OnboardingChecklistResponse,
  OnboardingTemplatesResponse,
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
  try {
    const response = await apiClient.post<StepResponse>(
      API_ENDPOINTS.ONBOARDING.STEP(step),
      data
    );
    return response.data;
  } catch (err) {
    // Backend uses 400 with a structured { status: 'error', errors: ... } payload for validation.
    // Normalize Axios errors so UI can render field errors instead of a generic message.
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as StepResponse;
    }
    throw err;
  }
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

export const getOnboardingChecklist = async (): Promise<OnboardingChecklistResponse> => {
  const response = await apiClient.get<OnboardingChecklistResponse>(
    API_ENDPOINTS.ONBOARDING.CHECKLIST
  );
  return response.data;
};

export const updateOnboardingChecklist = async (
  patch: Partial<OnboardingChecklistResponse['data']>
): Promise<OnboardingChecklistResponse> => {
  const response = await apiClient.patch<OnboardingChecklistResponse>(
    API_ENDPOINTS.ONBOARDING.CHECKLIST,
    patch
  );
  return response.data;
};

export const getOnboardingTemplates = async (): Promise<OnboardingTemplatesResponse> => {
  const response = await apiClient.get<OnboardingTemplatesResponse>(
    API_ENDPOINTS.ONBOARDING.TEMPLATES
  );
  return response.data;
};
