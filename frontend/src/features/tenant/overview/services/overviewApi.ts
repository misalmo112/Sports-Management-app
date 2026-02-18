/**
 * API service functions for Tenant Overview
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type { Overview } from '../types';

/**
 * Get overview data (role-based)
 */
export const getOverview = async (): Promise<Overview> => {
  const response = await apiClient.get<Overview>(API_ENDPOINTS.TENANT.OVERVIEW);
  return response.data;
};
