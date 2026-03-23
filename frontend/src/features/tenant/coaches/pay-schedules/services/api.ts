import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  BulkIssuePendingStaffApprovalsRequest,
  BulkIssuePendingStaffApprovalsResponse,
  CreateStaffPayScheduleRequest,
  ManualRunResponse,
  PendingStaffApprovalsListResponse,
  StaffPaySchedule,
  StaffPayScheduleRun,
  StaffPayScheduleRunsListResponse,
  StaffPaySchedulesListResponse,
  UpdateStaffPayScheduleRequest,
} from '../types';

const STAFF_PAY_SCHEDULES_BASE = '/api/v1/tenant/staff-pay-schedules/';
const STAFF_PENDING_APPROVALS_BASE = '/api/v1/tenant/staff/pending-approvals/';
const STAFF_BULK_ISSUE_BASE = '/api/v1/tenant/staff/bulk-issue/';

const scheduleDetailUrl = (id: number | string) => `${STAFF_PAY_SCHEDULES_BASE}${id}/`;
const toggleActiveUrl = (id: number | string) => `${STAFF_PAY_SCHEDULES_BASE}${id}/toggle-active/`;
const runUrl = (id: number | string) => `${STAFF_PAY_SCHEDULES_BASE}${id}/run/`;
const runsUrl = (id: number | string) => `${STAFF_PAY_SCHEDULES_BASE}${id}/runs/`;

export const getStaffPaySchedules = async (params?: {
  coach?: number;
  billing_type?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}): Promise<StaffPaySchedulesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.coach) queryParams.append('coach', params.coach.toString());
  if (params?.billing_type) queryParams.append('billing_type', params.billing_type);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${STAFF_PAY_SCHEDULES_BASE}?${queryString}` : STAFF_PAY_SCHEDULES_BASE;
  const response = await apiClient.get<StaffPaySchedulesListResponse>(url);
  return response.data;
};

export const getStaffPaySchedule = async (id: number | string): Promise<StaffPaySchedule> => {
  const response = await apiClient.get<StaffPaySchedule>(scheduleDetailUrl(id));
  return response.data;
};

export const createStaffPaySchedule = async (data: CreateStaffPayScheduleRequest): Promise<StaffPaySchedule> => {
  const response = await apiClient.post<StaffPaySchedule>(STAFF_PAY_SCHEDULES_BASE, data);
  return response.data;
};

export const updateStaffPaySchedule = async (
  id: number | string,
  data: UpdateStaffPayScheduleRequest,
): Promise<StaffPaySchedule> => {
  const response = await apiClient.patch<StaffPaySchedule>(scheduleDetailUrl(id), data);
  return response.data;
};

export const deleteStaffPaySchedule = async (id: number | string): Promise<void> => {
  await apiClient.delete(scheduleDetailUrl(id));
};

export const toggleStaffPayScheduleActive = async (id: number | string): Promise<StaffPaySchedule> => {
  const response = await apiClient.post<StaffPaySchedule>(toggleActiveUrl(id), {});
  return response.data;
};

export const runStaffPaySchedule = async (id: number | string): Promise<ManualRunResponse> => {
  const response = await apiClient.post<ManualRunResponse>(runUrl(id), {});
  return response.data;
};

export const getStaffPayScheduleRuns = async (
  scheduleId: number | string,
  params?: { page?: number; page_size?: number },
): Promise<StaffPayScheduleRun[] | StaffPayScheduleRunsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  const queryString = queryParams.toString();
  const url = queryString ? `${runsUrl(scheduleId)}?${queryString}` : runsUrl(scheduleId);
  const response = await apiClient.get<StaffPayScheduleRun[] | StaffPayScheduleRunsListResponse>(url);
  return response.data;
};

export const getPendingStaffApprovals = async (params?: {
  schedule_id?: number;
  coach_id?: number;
  billing_type?: string;
  page?: number;
  page_size?: number;
}): Promise<PendingStaffApprovalsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.schedule_id) queryParams.append('schedule_id', params.schedule_id.toString());
  if (params?.coach_id) queryParams.append('coach_id', params.coach_id.toString());
  if (params?.billing_type) queryParams.append('billing_type', params.billing_type);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${STAFF_PENDING_APPROVALS_BASE}?${queryString}` : STAFF_PENDING_APPROVALS_BASE;
  const response = await apiClient.get<PendingStaffApprovalsListResponse>(url);
  return response.data;
};

export const bulkIssuePendingStaffApprovals = async (
  data: BulkIssuePendingStaffApprovalsRequest,
): Promise<BulkIssuePendingStaffApprovalsResponse> => {
  const response = await apiClient.post<BulkIssuePendingStaffApprovalsResponse>(STAFF_BULK_ISSUE_BASE, data);
  return response.data;
};

export const patchStaffInvoiceStatus = async (
  id: number | string,
  status: 'CANCELLED' | 'PENDING' | 'PAID' | 'DRAFT',
): Promise<void> => {
  await apiClient.patch(API_ENDPOINTS.TENANT.STAFF_INVOICES.UPDATE(id), { status });
};
