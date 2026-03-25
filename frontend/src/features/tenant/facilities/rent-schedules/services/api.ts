import apiClient from '@/shared/services/api';
import type {
  BulkIssueRentApprovalsRequest,
  BulkIssueRentApprovalsResponse,
  CreateRentPayScheduleRequest,
  ManualRunResponse,
  PendingRentApprovalsListResponse,
  RentPaySchedule,
  RentPayScheduleRun,
  RentPayScheduleRunsListResponse,
  RentPaySchedulesListResponse,
  UpdateRentPayScheduleRequest,
} from '../types';

const BASE = '/api/v1/tenant/facilities/rent-pay-schedules/';
const PENDING = '/api/v1/tenant/facilities/rent/pending-approvals/';
const BULK = '/api/v1/tenant/facilities/rent/bulk-issue/';

const detailUrl = (id: number | string) => `${BASE}${id}/`;

export const getRentPaySchedules = async (params?: {
  billing_type?: string;
  is_active?: boolean;
  location?: number;
  page?: number;
  page_size?: number;
}): Promise<RentPaySchedulesListResponse> => {
  const q = new URLSearchParams();
  if (params?.billing_type) q.append('billing_type', params.billing_type);
  if (params?.is_active !== undefined) q.append('is_active', String(params.is_active));
  if (params?.location) q.append('location', String(params.location));
  if (params?.page) q.append('page', String(params.page));
  if (params?.page_size) q.append('page_size', String(params.page_size));
  const qs = q.toString();
  const url = qs ? `${BASE}?${qs}` : BASE;
  const res = await apiClient.get<RentPaySchedulesListResponse>(url);
  return res.data;
};

export const getRentPaySchedule = async (id: number | string): Promise<RentPaySchedule> => {
  const res = await apiClient.get<RentPaySchedule>(detailUrl(id));
  return res.data;
};

export const createRentPaySchedule = async (data: CreateRentPayScheduleRequest): Promise<RentPaySchedule> => {
  const res = await apiClient.post<RentPaySchedule>(BASE, data);
  return res.data;
};

export const updateRentPaySchedule = async (
  id: number | string,
  data: UpdateRentPayScheduleRequest,
): Promise<RentPaySchedule> => {
  const res = await apiClient.patch<RentPaySchedule>(detailUrl(id), data);
  return res.data;
};

export const deleteRentPaySchedule = async (id: number | string): Promise<void> => {
  await apiClient.delete(detailUrl(id));
};

export const toggleRentPayScheduleActive = async (id: number | string): Promise<RentPaySchedule> => {
  const res = await apiClient.post<RentPaySchedule>(`${detailUrl(id)}toggle-active/`, {});
  return res.data;
};

export const runRentPaySchedule = async (id: number | string): Promise<ManualRunResponse> => {
  const res = await apiClient.post<ManualRunResponse>(`${detailUrl(id)}run/`, {});
  return res.data;
};

export const getRentPayScheduleRuns = async (
  scheduleId: number | string,
  params?: { page?: number; page_size?: number },
): Promise<RentPayScheduleRun[] | RentPayScheduleRunsListResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.append('page', String(params.page));
  if (params?.page_size) q.append('page_size', String(params.page_size));
  const qs = q.toString();
  const url = qs ? `${detailUrl(scheduleId)}runs/?${qs}` : `${detailUrl(scheduleId)}runs/`;
  const res = await apiClient.get<RentPayScheduleRun[] | RentPayScheduleRunsListResponse>(url);
  return res.data;
};

export const getPendingRentApprovals = async (params?: {
  schedule_id?: number;
  location_id?: number;
  billing_type?: string;
  page?: number;
  page_size?: number;
}): Promise<PendingRentApprovalsListResponse> => {
  const q = new URLSearchParams();
  if (params?.schedule_id) q.append('schedule_id', String(params.schedule_id));
  if (params?.location_id) q.append('location_id', String(params.location_id));
  if (params?.billing_type) q.append('billing_type', params.billing_type);
  if (params?.page) q.append('page', String(params.page));
  if (params?.page_size) q.append('page_size', String(params.page_size));
  const qs = q.toString();
  const url = qs ? `${PENDING}?${qs}` : PENDING;
  const res = await apiClient.get<PendingRentApprovalsListResponse>(url);
  return res.data;
};

export const bulkIssueRentApprovals = async (
  data: BulkIssueRentApprovalsRequest,
): Promise<BulkIssueRentApprovalsResponse> => {
  const res = await apiClient.post<BulkIssueRentApprovalsResponse>(BULK, data);
  return res.data;
};
