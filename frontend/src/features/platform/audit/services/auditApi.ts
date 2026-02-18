/**
 * API service functions for Platform Audit
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type { AuditLog, AuditLogsListResponse, ErrorLogsListResponse } from '../types';

/**
 * List audit logs with optional filters
 */
export const getAuditLogs = async (params?: {
  action?: string;
  resource_type?: string;
  academy?: string;
  user?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
}): Promise<AuditLogsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.action) queryParams.append('action', params.action);
  if (params?.resource_type) queryParams.append('resource_type', params.resource_type);
  if (params?.academy) queryParams.append('academy', params.academy);
  if (params?.user) queryParams.append('user', params.user.toString());
  if (params?.date_from) queryParams.append('date_from', params.date_from);
  if (params?.date_to) queryParams.append('date_to', params.date_to);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.PLATFORM.AUDIT_LOGS.LIST}?${queryString}`
    : API_ENDPOINTS.PLATFORM.AUDIT_LOGS.LIST;

  const response = await apiClient.get<AuditLogsListResponse>(url);
  return response.data;
};

/**
 * Get audit log details by ID
 */
export const getAuditLog = async (id: number | string): Promise<AuditLog> => {
  const response = await apiClient.get<AuditLog>(
    API_ENDPOINTS.PLATFORM.AUDIT_LOGS.DETAIL(id)
  );
  return response.data;
};

/**
 * Get platform errors
 */
export const getErrorLogs = async (params?: {
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
