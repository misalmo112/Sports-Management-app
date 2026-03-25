import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkIssueRentApprovals,
  createRentPaySchedule,
  deleteRentPaySchedule,
  getPendingRentApprovals,
  getRentPaySchedule,
  getRentPayScheduleRuns,
  getRentPaySchedules,
  runRentPaySchedule,
  toggleRentPayScheduleActive,
  updateRentPaySchedule,
} from '../services/api';
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

export const useRentPaySchedules = (params?: {
  billing_type?: string;
  is_active?: boolean;
  location?: number;
  page?: number;
  page_size?: number;
}) =>
  useQuery<RentPaySchedulesListResponse, Error>({
    queryKey: ['rent-pay-schedules', 'list', params],
    queryFn: () => getRentPaySchedules(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const useRentPaySchedule = (id: number | string | undefined) =>
  useQuery<RentPaySchedule, Error>({
    queryKey: ['rent-pay-schedules', 'detail', id],
    queryFn: () => getRentPaySchedule(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const useCreateRentPaySchedule = () => {
  const qc = useQueryClient();
  return useMutation<RentPaySchedule, Error, CreateRentPayScheduleRequest>({
    mutationFn: createRentPaySchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'list'] });
    },
  });
};

export const useUpdateRentPaySchedule = () => {
  const qc = useQueryClient();
  return useMutation<RentPaySchedule, Error, { id: number | string; data: UpdateRentPayScheduleRequest }>({
    mutationFn: ({ id, data }) => updateRentPaySchedule(id, data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'list'] });
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'detail', v.id] });
    },
  });
};

export const useDeleteRentPaySchedule = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, number | string>({
    mutationFn: deleteRentPaySchedule,
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'list'] });
      qc.removeQueries({ queryKey: ['rent-pay-schedules', 'detail', id] });
      qc.removeQueries({ queryKey: ['rent-pay-schedules', 'runs', id] });
    },
  });
};

export const useToggleRentPayScheduleActive = () => {
  const qc = useQueryClient();
  return useMutation<
    RentPaySchedule,
    Error,
    number | string,
    { snapshots: Array<[readonly unknown[], RentPaySchedulesListResponse | undefined]> }
  >({
    mutationFn: toggleRentPayScheduleActive,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['rent-pay-schedules', 'list'] });
      const snapshots = qc.getQueriesData<RentPaySchedulesListResponse>({ queryKey: ['rent-pay-schedules', 'list'] });
      snapshots.forEach(([key, old]) => {
        if (!old) return;
        qc.setQueryData<RentPaySchedulesListResponse>(key, {
          ...old,
          results: old.results.map((s) => (s.id === Number(id) ? { ...s, is_active: !s.is_active } : s)),
        });
      });
      return { snapshots };
    },
    onError: (_e, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_d, _e, id) => {
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'list'] });
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'detail', id] });
    },
  });
};

export const useRunRentPaySchedule = () => {
  const qc = useQueryClient();
  return useMutation<ManualRunResponse, Error, number | string>({
    mutationFn: runRentPaySchedule,
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'list'] });
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['rent-pay-schedules', 'runs', id] });
      qc.invalidateQueries({ queryKey: ['rent-pending-approvals', 'list'] });
      qc.invalidateQueries({ queryKey: ['rent-pending-approvals', 'count'] });
    },
  });
};

export const useRentPayScheduleRuns = (
  scheduleId: number | string | undefined,
  params?: { page?: number; page_size?: number; enabled?: boolean },
) =>
  useQuery<RentPayScheduleRun[] | RentPayScheduleRunsListResponse, Error>({
    queryKey: ['rent-pay-schedules', 'runs', scheduleId, params?.page, params?.page_size],
    queryFn: () => getRentPayScheduleRuns(scheduleId!, { page: params?.page, page_size: params?.page_size }),
    enabled: (params?.enabled ?? true) && !!scheduleId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const usePendingRentApprovals = (params?: {
  schedule_id?: number;
  location_id?: number;
  billing_type?: string;
  page?: number;
  page_size?: number;
}) =>
  useQuery<PendingRentApprovalsListResponse, Error>({
    queryKey: ['rent-pending-approvals', 'list', params],
    queryFn: () => getPendingRentApprovals(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const useBulkIssueRentApprovals = () => {
  const qc = useQueryClient();
  return useMutation<BulkIssueRentApprovalsResponse, Error, BulkIssueRentApprovalsRequest>({
    mutationFn: bulkIssueRentApprovals,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rent-pending-approvals', 'list'] });
      qc.invalidateQueries({ queryKey: ['rent-pending-approvals', 'count'] });
    },
  });
};
