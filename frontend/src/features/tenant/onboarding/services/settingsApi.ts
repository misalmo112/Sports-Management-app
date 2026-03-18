/**
 * API service functions for Settings (using onboarding endpoints)
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Step2Locations,
  Step3Sports,
  AgeCategoriesPayload,
  Step4Terms,
  Step5Pricing,
} from '../types';

/**
 * Save locations (uses onboarding step 2 endpoint)
 */
export const saveLocations = async (data: Step2Locations) => {
  const response = await apiClient.post(
    API_ENDPOINTS.ONBOARDING.STEP(2),
    data
  );
  return response.data;
};

/**
 * Save sports (uses onboarding step 3 endpoint)
 */
export const saveSports = async (data: Step3Sports) => {
  const response = await apiClient.post(
    API_ENDPOINTS.ONBOARDING.STEP(3),
    data
  );
  return response.data;
};

/**
 * Save age categories (uses tenant settings endpoint; not part of activation wizard)
 */
export const saveAgeCategories = async (data: AgeCategoriesPayload) => {
  const response = await apiClient.post(
    API_ENDPOINTS.TENANT.SETTINGS.AGE_CATEGORIES.CREATE,
    data
  );
  return response.data;
};

/**
 * Save terms (uses onboarding step 4 endpoint)
 */
export const saveTerms = async (data: Step4Terms) => {
  const response = await apiClient.post(
    API_ENDPOINTS.ONBOARDING.STEP(4),
    data
  );
  return response.data;
};

/**
 * Save pricing (uses onboarding step 5 endpoint)
 */
export const savePricing = async (data: Step5Pricing) => {
  const response = await apiClient.post(
    API_ENDPOINTS.ONBOARDING.STEP(5),
    data
  );
  return response.data;
};
