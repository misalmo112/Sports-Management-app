import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type { TenantAuditLogsListResponse, TenantAuditLogFilters } from '../types';

export const getTenantAuditLogs = async (
  params?: TenantAuditLogFilters
): Promise<TenantAuditLogsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.action) queryParams.append('action', params.action);
  if (params?.resource_type) queryParams.append('resource_type', params.resource_type);
  if (params?.user_email) queryParams.append('user_email', params.user_email);
  if (params?.date_from) queryParams.append('date_from', params.date_from);
  if (params?.date_to) queryParams.append('date_to', params.date_to);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());

  const qs = queryParams.toString();
  const url = qs
    ? `${API_ENDPOINTS.TENANT.AUDIT_LOGS}?${qs}`
    : API_ENDPOINTS.TENANT.AUDIT_LOGS;

  const response = await apiClient.get<TenantAuditLogsListResponse>(url);
  return response.data;
};
