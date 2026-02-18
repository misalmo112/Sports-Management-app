/**
 * API service functions for Tenant Feedback
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Feedback,
  FeedbackListResponse,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
} from '../types';

/**
 * List feedback with optional filters
 */
export const getFeedback = async (params?: {
  status?: string;
  priority?: string;
  page?: number;
}): Promise<FeedbackListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.page) queryParams.append('page', params.page.toString());

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.FEEDBACK.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.FEEDBACK.LIST;

  const response = await apiClient.get<FeedbackListResponse>(url);
  return response.data;
};

/**
 * Get feedback details by ID
 */
export const getFeedbackById = async (id: number | string): Promise<Feedback> => {
  const response = await apiClient.get<Feedback>(
    API_ENDPOINTS.TENANT.FEEDBACK.DETAIL(id)
  );
  return response.data;
};

/**
 * Create a new feedback
 */
export const createFeedback = async (
  data: CreateFeedbackRequest
): Promise<Feedback> => {
  const response = await apiClient.post<Feedback>(
    API_ENDPOINTS.TENANT.FEEDBACK.CREATE,
    data
  );
  return response.data;
};

/**
 * Update feedback
 */
export const updateFeedback = async (
  id: number | string,
  data: UpdateFeedbackRequest
): Promise<Feedback> => {
  const response = await apiClient.patch<Feedback>(
    API_ENDPOINTS.TENANT.FEEDBACK.UPDATE(id),
    data
  );
  return response.data;
};
