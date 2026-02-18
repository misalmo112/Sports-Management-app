/**
 * API service functions for Platform Analytics
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type { PlatformStats, ErrorLogsListResponse } from '../types';

/**
 * Get platform statistics
 */
export const getPlatformStats = async (): Promise<PlatformStats> => {
  const response = await apiClient.get<PlatformStats>(API_ENDPOINTS.PLATFORM.STATS);
  return response.data;
};

/**
 * Get platform errors
 */
export const getPlatformErrors = async (params?: {
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<ErrorLogsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.date_from) {
    queryParams.append('date_from', params.date_from);
  }
  if (params?.date_to) {
    queryParams.append('date_to', params.date_to);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.PLATFORM.ERRORS}?${queryString}`
    : API_ENDPOINTS.PLATFORM.ERRORS;

  const response = await apiClient.get<ErrorLogsListResponse>(url);
  return response.data;
};
