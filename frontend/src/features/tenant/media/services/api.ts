/**
 * API service functions for Tenant Media
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type { MediaFile, MediaFilesListResponse, UploadMediaRequest } from '../types';

/**
 * List media files with optional filters
 */
export const getMedia = async (
  params?: {
    is_active?: boolean;
    mime_type?: string;
    class_obj?: number;
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<MediaFilesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.is_active !== undefined) {
    queryParams.append('is_active', params.is_active.toString());
  }
  if (params?.mime_type) {
    queryParams.append('mime_type', params.mime_type);
  }
  if (params?.class_obj) {
    queryParams.append('class_obj', params.class_obj.toString());
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
    ? `${API_ENDPOINTS.TENANT.MEDIA.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.MEDIA.LIST;

  const response = await apiClient.get<MediaFilesListResponse>(url);
  return response.data;
};

/**
 * Get media file details by ID
 */
export const getMediaById = async (id: string): Promise<MediaFile> => {
  const response = await apiClient.get<MediaFile>(
    API_ENDPOINTS.TENANT.MEDIA.DETAIL(id)
  );
  return response.data;
};

/**
 * Upload a single media file
 */
export const uploadMedia = async (
  data: UploadMediaRequest
): Promise<MediaFile> => {
  const formData = new FormData();
  formData.append('file', data.file);
  if (data.class_id !== undefined) {
    formData.append('class_id', data.class_id.toString());
  }
  if (data.description) {
    formData.append('description', data.description);
  }

  const response = await apiClient.post<MediaFile>(
    API_ENDPOINTS.TENANT.MEDIA.UPLOAD,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && data.onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          data.onProgress(progress);
        }
      },
    }
  );
  return response.data;
};

/**
 * Delete media file
 */
export const deleteMedia = async (id: string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.MEDIA.DELETE(id));
};
