import apiClient from '@/shared/services/api';

import type {
  BulkIssuePendingApprovalsRequest,
  BulkIssuePendingApprovalsResponse,
  CreateInvoiceScheduleRequest,
  CreateStudentScheduleOverrideRequest,
  InvoiceSchedule,
  InvoiceSchedulesListResponse,
  InvoiceScheduleRun,
  InvoiceScheduleRunsListResponse,
  ManualRunResponse,
  PendingApprovalsListResponse,
  UpdateInvoiceScheduleRequest,
  UpdateStudentScheduleOverrideRequest,
  StudentScheduleOverride,
} from '../types';

const INVOICE_SCHEDULES_BASE = '/api/v1/tenant/invoice-schedules/';
const PENDING_APPROVALS_BASE = '/api/v1/tenant/pending-approvals/';
const BULK_ISSUE_BASE = '/api/v1/tenant/bulk-issue/';

const scheduleDetailUrl = (id: number | string) => `${INVOICE_SCHEDULES_BASE}${id}/`;
const toggleActiveUrl = (id: number | string) => `${INVOICE_SCHEDULES_BASE}${id}/toggle-active/`;
const runUrl = (id: number | string) => `${INVOICE_SCHEDULES_BASE}${id}/run/`;
const runsUrl = (id: number | string) => `${INVOICE_SCHEDULES_BASE}${id}/runs/`;
const overridesBaseUrl = (scheduleId: number | string) => `${INVOICE_SCHEDULES_BASE}${scheduleId}/overrides/`;
const overrideDetailUrl = (scheduleId: number | string, overrideId: number | string) =>
  `${overridesBaseUrl(scheduleId)}${overrideId}/`;

export const getInvoiceSchedules = async (
  params?: {
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }
): Promise<InvoiceSchedulesListResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.is_active !== undefined) {
    queryParams.append('is_active', params.is_active.toString());
  }
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${INVOICE_SCHEDULES_BASE}?${queryString}` : INVOICE_SCHEDULES_BASE;
  const res = await apiClient.get<InvoiceSchedulesListResponse>(url);
  return res.data;
};

export const getInvoiceSchedule = async (id: number | string): Promise<InvoiceSchedule> => {
  const res = await apiClient.get<InvoiceSchedule>(scheduleDetailUrl(id));
  return res.data;
};

export const createInvoiceSchedule = async (
  data: CreateInvoiceScheduleRequest
): Promise<InvoiceSchedule> => {
  const res = await apiClient.post<InvoiceSchedule>(INVOICE_SCHEDULES_BASE, data);
  return res.data;
};

export const updateInvoiceSchedule = async (
  id: number | string,
  data: UpdateInvoiceScheduleRequest
): Promise<InvoiceSchedule> => {
  const res = await apiClient.patch<InvoiceSchedule>(scheduleDetailUrl(id), data);
  return res.data;
};

export const deleteInvoiceSchedule = async (id: number | string): Promise<void> => {
  await apiClient.delete(scheduleDetailUrl(id));
};

export const toggleInvoiceScheduleActive = async (
  id: number | string
): Promise<InvoiceSchedule> => {
  const res = await apiClient.post<InvoiceSchedule>(toggleActiveUrl(id), {});
  return res.data;
};

export const runInvoiceSchedule = async (id: number | string): Promise<ManualRunResponse> => {
  const res = await apiClient.post<ManualRunResponse>(runUrl(id), {});
  return res.data;
};

export const getInvoiceScheduleRuns = async (
  scheduleId: number | string
): Promise<InvoiceScheduleRun[] | InvoiceScheduleRunsListResponse> => {
  const res = await apiClient.get<InvoiceScheduleRun[] | InvoiceScheduleRunsListResponse>(runsUrl(scheduleId));
  return res.data;
};

export const getScheduleOverrides = async (
  scheduleId: number | string
): Promise<StudentScheduleOverride[] | { count: number; next: string | null; previous: string | null; results: StudentScheduleOverride[] }> => {
  // The UI needs the full set of overridden student IDs to prevent duplicates.
  // Default DRF pagination (PAGE_SIZE) would otherwise return only the first page.
  const res = await apiClient.get(overridesBaseUrl(scheduleId), {
    params: { page_size: 1000 },
  });
  return res.data;
};

export const createScheduleOverride = async (
  scheduleId: number | string,
  data: CreateStudentScheduleOverrideRequest
): Promise<StudentScheduleOverride> => {
  const res = await apiClient.post<StudentScheduleOverride>(overridesBaseUrl(scheduleId), data);
  return res.data;
};

export const updateScheduleOverride = async (
  scheduleId: number | string,
  overrideId: number | string,
  data: UpdateStudentScheduleOverrideRequest
): Promise<StudentScheduleOverride> => {
  const res = await apiClient.patch<StudentScheduleOverride>(overrideDetailUrl(scheduleId, overrideId), data);
  return res.data;
};

export const deleteScheduleOverride = async (
  scheduleId: number | string,
  overrideId: number | string
): Promise<void> => {
  await apiClient.delete(overrideDetailUrl(scheduleId, overrideId));
};

export const getPendingApprovals = async (params?: {
  schedule_id?: number;
  class_id?: number;
  date_from?: string;
  page?: number;
  page_size?: number;
}): Promise<PendingApprovalsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.schedule_id) queryParams.append('schedule_id', params.schedule_id.toString());
  if (params?.class_id) queryParams.append('class_id', params.class_id.toString());
  if (params?.date_from) queryParams.append('date_from', params.date_from);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${PENDING_APPROVALS_BASE}?${queryString}` : PENDING_APPROVALS_BASE;
  const res = await apiClient.get<PendingApprovalsListResponse>(url);
  return res.data;
};

export const bulkIssuePendingApprovals = async (
  data: BulkIssuePendingApprovalsRequest
): Promise<BulkIssuePendingApprovalsResponse> => {
  const res = await apiClient.post<BulkIssuePendingApprovalsResponse>(BULK_ISSUE_BASE, data);
  return res.data;
};

