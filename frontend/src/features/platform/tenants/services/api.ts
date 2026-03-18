/**
 * API service functions for Platform Academies
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Academy,
  AcademiesListResponse,
  AcademyQuota,
  AcademySubscription,
  CreateAcademyRequest,
  UpdateAcademyRequest,
  UpdateAcademyPlanRequest,
  UpdateAcademyQuotaRequest,
  AcademyInviteLinkResponse,
  AcademyInviteLinkRequest,
} from '../types';

/**
 * List academies with optional filters
 */
export const getAcademies = async (
  params?: {
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<AcademiesListResponse> => {
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
    ? `${API_ENDPOINTS.PLATFORM.ACADEMIES.LIST}?${queryString}`
    : API_ENDPOINTS.PLATFORM.ACADEMIES.LIST;

  const response = await apiClient.get<AcademiesListResponse>(url);
  return response.data;
};

/**
 * Get academy details by ID
 */
export const getAcademy = async (id: number | string): Promise<Academy> => {
  const response = await apiClient.get<Academy>(
    API_ENDPOINTS.PLATFORM.ACADEMIES.DETAIL(id)
  );
  return response.data;
};

/**
 * Create a new academy
 */
export const createAcademy = async (
  data: CreateAcademyRequest
): Promise<Academy> => {
  const response = await apiClient.post<Academy>(
    API_ENDPOINTS.PLATFORM.ACADEMIES.CREATE,
    data
  );
  return response.data;
};

/**
 * Update academy
 */
export const updateAcademy = async (
  id: number | string,
  data: UpdateAcademyRequest
): Promise<Academy> => {
  const response = await apiClient.patch<Academy>(
    API_ENDPOINTS.PLATFORM.ACADEMIES.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Delete academy
 */
export const deleteAcademy = async (id: string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.PLATFORM.ACADEMIES.DETAIL(id));
};

/**
 * Export academy data as ZIP (platform + tenant). Triggers browser download.
 */
export const exportAcademy = async (id: string): Promise<void> => {
  const response = await apiClient.get(API_ENDPOINTS.PLATFORM.ACADEMIES.EXPORT(id), {
    responseType: 'blob',
  });
  const blob = response.data as Blob;
  const disposition = response.headers['content-disposition'];
  let filename = 'academy-export.zip';
  if (typeof disposition === 'string') {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1].trim();
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Update academy plan
 */
export const updateAcademyPlan = async (
  id: number | string,
  data: UpdateAcademyPlanRequest
): Promise<AcademySubscription> => {
  const response = await apiClient.patch<AcademySubscription>(
    API_ENDPOINTS.PLATFORM.ACADEMIES.PLAN(id),
    data
  );
  return response.data;
};

/**
 * Update academy quota
 */
export const updateAcademyQuota = async (
  id: number | string,
  data: UpdateAcademyQuotaRequest
): Promise<AcademyQuota> => {
  const response = await apiClient.patch<AcademyQuota>(
    API_ENDPOINTS.PLATFORM.ACADEMIES.QUOTA(id),
    data
  );
  return response.data;
};

/**
 * Generate invite link for academy admin
 */
export const generateAcademyInviteLink = async (
  id: number | string,
  data?: AcademyInviteLinkRequest
): Promise<AcademyInviteLinkResponse> => {
  const response = await apiClient.post<AcademyInviteLinkResponse>(
    API_ENDPOINTS.PLATFORM.ACADEMIES.INVITE_LINK(id),
    data
  );
  return response.data;
};
