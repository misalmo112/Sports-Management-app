/**
 * API service functions for Tenant Parents
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';

export interface Parent {
  id: number;
  academy: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Parent[];
}

/**
 * List parents with optional filters
 */
export const getParents = async (
  params?: {
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<ParentsListResponse> => {
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
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.PARENTS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.PARENTS.LIST;

  const response = await apiClient.get<ParentsListResponse>(url);
  return response.data;
};

/**
 * Get parent details by ID
 */
export const getParent = async (id: number | string): Promise<Parent> => {
  const response = await apiClient.get<Parent>(
    API_ENDPOINTS.TENANT.PARENTS.DETAIL(id)
  );
  return response.data;
};
