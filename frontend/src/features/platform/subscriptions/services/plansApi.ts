/**
 * API service functions for Platform Plans
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Plan,
  PlansListResponse,
  CreatePlanRequest,
  UpdatePlanRequest,
} from '../types';

/**
 * List plans with optional filters
 */
export const getPlans = async (
  params?: {
    is_active?: boolean;
    search?: string;
    page?: number;
  }
): Promise<PlansListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.is_active !== undefined) {
    queryParams.append('is_active', params.is_active.toString());
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.PLATFORM.PLANS.LIST}?${queryString}`
    : API_ENDPOINTS.PLATFORM.PLANS.LIST;

  const response = await apiClient.get<PlansListResponse>(url);
  return response.data;
};

/**
 * Get plan details by ID
 */
export const getPlan = async (id: number | string): Promise<Plan> => {
  const response = await apiClient.get<Plan>(
    API_ENDPOINTS.PLATFORM.PLANS.DETAIL(id)
  );
  return response.data;
};

/**
 * Create a new plan
 */
export const createPlan = async (
  data: CreatePlanRequest
): Promise<Plan> => {
  const response = await apiClient.post<Plan>(
    API_ENDPOINTS.PLATFORM.PLANS.CREATE,
    data
  );
  return response.data;
};

/**
 * Update plan
 */
export const updatePlan = async (
  id: number | string,
  data: UpdatePlanRequest
): Promise<Plan> => {
  const response = await apiClient.patch<Plan>(
    API_ENDPOINTS.PLATFORM.PLANS.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Delete plan
 */
export const deletePlan = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.PLATFORM.PLANS.DETAIL(id));
};
