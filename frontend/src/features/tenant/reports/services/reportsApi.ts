/**
 * API service functions for Tenant Reports
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type { Report, ReportType } from '../types';

export interface GetReportParams {
  report_type: ReportType;
  date_from?: string;
  date_to?: string;
  class_id?: number;
  student_id?: number;
  sport_id?: number;
  location_id?: number;
  coach_id?: number;
}

/**
 * Get report data
 */
export const getReport = async (params: GetReportParams): Promise<Report> => {
  const queryParams = new URLSearchParams();
  queryParams.append('report_type', params.report_type);
  if (params.date_from) {
    queryParams.append('date_from', params.date_from);
  }
  if (params.date_to) {
    queryParams.append('date_to', params.date_to);
  }
  if (params.class_id) {
    queryParams.append('class_id', params.class_id.toString());
  }
  if (params.student_id) {
    queryParams.append('student_id', params.student_id.toString());
  }
  if (params.sport_id) {
    queryParams.append('sport_id', params.sport_id.toString());
  }
  if (params.location_id) {
    queryParams.append('location_id', params.location_id.toString());
  }
  if (params.coach_id) {
    queryParams.append('coach_id', params.coach_id.toString());
  }

  const response = await apiClient.get<Report>(
    `${API_ENDPOINTS.TENANT.REPORTS}?${queryParams.toString()}`
  );
  return response.data;
};

/**
 * Build query string for report export (same params as getReport for finance_overview).
 */
function buildReportExportQuery(params: {
  report_type: string;
  date_from?: string;
  date_to?: string;
  location_id?: number;
  sport_id?: number;
  coach_id?: number;
  format: string;
}): string {
  const queryParams = new URLSearchParams();
  queryParams.append('report_type', params.report_type);
  queryParams.append('format', params.format);
  if (params.date_from) queryParams.append('date_from', params.date_from);
  if (params.date_to) queryParams.append('date_to', params.date_to);
  if (params.location_id) queryParams.append('location_id', params.location_id.toString());
  if (params.sport_id) queryParams.append('sport_id', params.sport_id.toString());
  if (params.coach_id) queryParams.append('coach_id', params.coach_id.toString());
  return queryParams.toString();
}

/**
 * Export report as CSV (or PDF). Triggers file download.
 */
export const exportReport = async (params: {
  report_type: 'finance_overview';
  date_from?: string;
  date_to?: string;
  location_id?: number;
  sport_id?: number;
  coach_id?: number;
  format: 'csv';
}): Promise<void> => {
  const query = buildReportExportQuery({ ...params, format: params.format });
  const response = await apiClient.get(`${API_ENDPOINTS.TENANT.REPORTS_EXPORT}?${query}`, {
    responseType: 'blob',
  });
  const blob = response.data as Blob;
  const disposition = response.headers['content-disposition'];
  let filename = `finance_overview_${params.date_from || 'from'}_${params.date_to || 'to'}.csv`;
  if (disposition && typeof disposition === 'string') {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1].trim();
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};
