import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkIssuePendingStaffApprovals,
  createStaffPaySchedule,
  deleteStaffPaySchedule,
  getPendingStaffApprovals,
  getStaffPaySchedule,
  getStaffPayScheduleRuns,
  getStaffPaySchedules,
  patchStaffInvoiceStatus,
  runStaffPaySchedule,
  toggleStaffPayScheduleActive,
  updateStaffPaySchedule,
} from '../services/api';
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

export const useStaffPaySchedules = (params?: {
  coach?: number;
  billing_type?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}) =>
  useQuery<StaffPaySchedulesListResponse, Error>({
    queryKey: ['staff-pay-schedules', 'list', params],
    queryFn: () => getStaffPaySchedules(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const useStaffPaySchedule = (id: number | string | undefined) =>
  useQuery<StaffPaySchedule, Error>({
    queryKey: ['staff-pay-schedules', 'detail', id],
    queryFn: () => getStaffPaySchedule(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const useCreateStaffPaySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<StaffPaySchedule, Error, CreateStaffPayScheduleRequest>({
    mutationFn: createStaffPaySchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'list'] });
    },
  });
};

export const useUpdateStaffPaySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<StaffPaySchedule, Error, { id: number | string; data: UpdateStaffPayScheduleRequest }>({
    mutationFn: ({ id, data }) => updateStaffPaySchedule(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'detail', variables.id] });
    },
  });
};

export const useDeleteStaffPaySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number | string>({
    mutationFn: deleteStaffPaySchedule,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'list'] });
      queryClient.removeQueries({ queryKey: ['staff-pay-schedules', 'detail', id] });
      queryClient.removeQueries({ queryKey: ['staff-pay-schedules', 'runs', id] });
    },
  });
};

export const useToggleStaffPayScheduleActive = () => {
  const queryClient = useQueryClient();
  return useMutation<
    StaffPaySchedule,
    Error,
    number | string,
    { snapshots: Array<[readonly unknown[], StaffPaySchedulesListResponse | undefined]> }
  >({
    mutationFn: toggleStaffPayScheduleActive,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['staff-pay-schedules', 'list'] });
      const snapshots = queryClient.getQueriesData<StaffPaySchedulesListResponse>({
        queryKey: ['staff-pay-schedules', 'list'],
      });
      snapshots.forEach(([key, oldData]) => {
        if (!oldData) return;
        queryClient.setQueryData<StaffPaySchedulesListResponse>(key, {
          ...oldData,
          results: oldData.results.map((s) => (s.id === Number(id) ? { ...s, is_active: !s.is_active } : s)),
        });
      });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'detail', id] });
    },
  });
};

export const useRunStaffPaySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation<ManualRunResponse, Error, number | string>({
    mutationFn: runStaffPaySchedule,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-pay-schedules', 'runs', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-pending-approvals', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-pending-approvals', 'count'] });
    },
  });
};

export const useStaffPayScheduleRuns = (
  scheduleId: number | string | undefined,
  params?: { page?: number; page_size?: number; enabled?: boolean },
) =>
  useQuery<StaffPayScheduleRun[] | StaffPayScheduleRunsListResponse, Error>({
    queryKey: ['staff-pay-schedules', 'runs', scheduleId, params?.page, params?.page_size],
    queryFn: () => getStaffPayScheduleRuns(scheduleId!, { page: params?.page, page_size: params?.page_size }),
    enabled: (params?.enabled ?? true) && !!scheduleId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const usePendingStaffApprovals = (params?: {
  schedule_id?: number;
  coach_id?: number;
  billing_type?: string;
  page?: number;
  page_size?: number;
}) =>
  useQuery<PendingStaffApprovalsListResponse, Error>({
    queryKey: ['staff-pending-approvals', 'list', params],
    queryFn: () => getPendingStaffApprovals(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const useBulkIssuePendingStaffApprovals = () => {
  const queryClient = useQueryClient();
  return useMutation<BulkIssuePendingStaffApprovalsResponse, Error, BulkIssuePendingStaffApprovalsRequest>({
    mutationFn: bulkIssuePendingStaffApprovals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-pending-approvals', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-pending-approvals', 'count'] });
    },
  });
};

export const useCancelStaffInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number | string>({
    mutationFn: (id) => patchStaffInvoiceStatus(id, 'CANCELLED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-pending-approvals', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-pending-approvals', 'count'] });
      queryClient.invalidateQueries({ queryKey: ['staff-invoices'] });
    },
  });
};
