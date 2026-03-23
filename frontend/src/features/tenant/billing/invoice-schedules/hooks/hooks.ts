import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  bulkIssuePendingApprovals,
  createInvoiceSchedule,
  createScheduleOverride,
  deleteInvoiceSchedule,
  deleteScheduleOverride,
  getInvoiceSchedule,
  getInvoiceScheduleRuns,
  getInvoiceSchedules,
  getPendingApprovals,
  getScheduleOverrides,
  toggleInvoiceScheduleActive,
  runInvoiceSchedule,
  updateInvoiceSchedule,
  updateScheduleOverride,
} from '../services/api';

import type {
  BulkIssuePendingApprovalsRequest,
  BulkIssuePendingApprovalsResponse,
  CreateInvoiceScheduleRequest,
  CreateStudentScheduleOverrideRequest,
  InvoiceSchedule,
  InvoiceScheduleRun,
  InvoiceScheduleRunsListResponse,
  InvoiceSchedulesListResponse,
  ManualRunResponse,
  PendingApprovalsListResponse,
  StudentScheduleOverride,
  UpdateInvoiceScheduleRequest,
  UpdateStudentScheduleOverrideRequest,
} from '../types';

export const useInvoiceSchedules = (params?: {
  is_active?: boolean;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<InvoiceSchedulesListResponse, Error>({
    queryKey: ['invoice-schedules', 'list', params],
    queryFn: () => getInvoiceSchedules(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useInvoiceSchedule = (id: number | string | undefined) => {
  return useQuery<InvoiceSchedule, Error>({
    queryKey: ['invoice-schedules', 'detail', id],
    queryFn: () => getInvoiceSchedule(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateInvoiceSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<InvoiceSchedule, Error, CreateInvoiceScheduleRequest>({
    mutationFn: createInvoiceSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'list'] });
    },
  });
};

export const useUpdateInvoiceSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<InvoiceSchedule, Error, { id: number | string; data: UpdateInvoiceScheduleRequest }>({
    mutationFn: ({ id, data }) => updateInvoiceSchedule(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'detail', variables.id] });
    },
  });
};

export const useDeleteInvoiceSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number | string>({
    mutationFn: deleteInvoiceSchedule,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'list'] });
      queryClient.removeQueries({ queryKey: ['invoice-schedules', 'detail', id] });
      queryClient.removeQueries({ queryKey: ['invoice-schedules', 'runs', id] });
    },
  });
};

export const useToggleInvoiceScheduleActive = () => {
  const queryClient = useQueryClient();
  return useMutation<InvoiceSchedule, Error, number | string>({
    mutationFn: toggleInvoiceScheduleActive,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'detail', id] });
    },
  });
};

export const useRunInvoiceSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<ManualRunResponse, Error, number | string>({
    mutationFn: runInvoiceSchedule,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'runs', id] });
      // A run can create new draft invoices, impacting pending approvals.
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', 'count'] });
    },
  });
};

export const useInvoiceScheduleRuns = (scheduleId: number | string | undefined, enabled: boolean = true) => {
  return useQuery<InvoiceScheduleRun[] | InvoiceScheduleRunsListResponse, Error>({
    queryKey: ['invoice-schedules', 'runs', scheduleId],
    queryFn: () => getInvoiceScheduleRuns(scheduleId!),
    enabled: enabled && !!scheduleId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

type OverridesListResponse =
  | StudentScheduleOverride[]
  | { count: number; next: string | null; previous: string | null; results: StudentScheduleOverride[] };

export const useScheduleOverrides = (scheduleId: number | string | undefined, enabled: boolean = true) => {
  return useQuery<OverridesListResponse, Error>({
    queryKey: ['invoice-schedules', 'overrides', scheduleId],
    queryFn: () => getScheduleOverrides(scheduleId!),
    enabled: enabled && !!scheduleId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateScheduleOverride = () => {
  const queryClient = useQueryClient();
  return useMutation<StudentScheduleOverride, Error, { scheduleId: number | string; data: CreateStudentScheduleOverrideRequest }>({
    mutationFn: ({ scheduleId, data }) => createScheduleOverride(scheduleId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'overrides', variables.scheduleId] });
    },
  });
};

export const useUpdateScheduleOverride = () => {
  const queryClient = useQueryClient();
  return useMutation<
    StudentScheduleOverride,
    Error,
    { scheduleId: number | string; overrideId: number | string; data: UpdateStudentScheduleOverrideRequest }
  >({
    mutationFn: ({ scheduleId, overrideId, data }) => updateScheduleOverride(scheduleId, overrideId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'overrides', variables.scheduleId] });
    },
  });
};

export const useDeleteScheduleOverride = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { scheduleId: number | string; overrideId: number | string }>({
    mutationFn: ({ scheduleId, overrideId }) => deleteScheduleOverride(scheduleId, overrideId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules', 'overrides', variables.scheduleId] });
    },
  });
};

export const usePendingApprovals = (params?: {
  schedule_id?: number;
  class_id?: number;
  date_from?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<PendingApprovalsListResponse, Error>({
    queryKey: ['pending-approvals', 'list', params],
    queryFn: () => getPendingApprovals(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useBulkIssuePendingApprovals = () => {
  const queryClient = useQueryClient();
  return useMutation<BulkIssuePendingApprovalsResponse, Error, BulkIssuePendingApprovalsRequest>({
    mutationFn: bulkIssuePendingApprovals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', 'count'] });
    },
  });
};

