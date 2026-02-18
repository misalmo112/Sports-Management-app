/**
 * TanStack Query hooks for Tenant Attendance
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  markAttendance,
  getCoachAttendance,
  getCoachAttendanceById,
  createCoachAttendance,
  updateCoachAttendance,
  deleteCoachAttendance,
} from '../services/api';
import type {
  AttendanceListResponse,
  Attendance,
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  CoachAttendanceListResponse,
  CoachAttendance,
  CreateCoachAttendanceRequest,
  UpdateCoachAttendanceRequest,
} from '../types';

/**
 * Hook for fetching attendance list
 */
export const useAttendance = (params?: {
  student?: number;
  class_obj?: number;
  date?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<AttendanceListResponse, Error>({
    queryKey: ['attendance', 'list', params],
    queryFn: () => getAttendance(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single attendance record
 */
export const useAttendanceById = (id: number | string | undefined) => {
  return useQuery<Attendance, Error>({
    queryKey: ['attendance', 'detail', id],
    queryFn: () => getAttendanceById(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating an attendance record
 */
export const useCreateAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation<Attendance, Error, CreateAttendanceRequest>({
    mutationFn: createAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] });
    },
  });
};

/**
 * Hook for updating an attendance record
 */
export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Attendance,
    Error,
    { id: number | string; data: UpdateAttendanceRequest }
  >({
    mutationFn: ({ id, data }) => updateAttendance(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['attendance', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting an attendance record
 */
export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteAttendance,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] });
      queryClient.removeQueries({ queryKey: ['attendance', 'detail', id] });
    },
  });
};

/**
 * Hook for marking attendance (bulk)
 */
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation<MarkAttendanceResponse, Error, MarkAttendanceRequest>({
    mutationFn: markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] });
    },
  });
};

/**
 * Hook for fetching coach attendance list
 */
export const useCoachAttendance = (params?: {
  coach?: number;
  class_obj?: number;
  date?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<CoachAttendanceListResponse, Error>({
    queryKey: ['coach-attendance', 'list', params],
    queryFn: () => getCoachAttendance(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single coach attendance record
 */
export const useCoachAttendanceById = (id: number | string | undefined) => {
  return useQuery<CoachAttendance, Error>({
    queryKey: ['coach-attendance', 'detail', id],
    queryFn: () => getCoachAttendanceById(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating a coach attendance record
 */
export const useCreateCoachAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation<CoachAttendance, Error, CreateCoachAttendanceRequest>({
    mutationFn: createCoachAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-attendance', 'list'] });
    },
  });
};

/**
 * Hook for updating a coach attendance record
 */
export const useUpdateCoachAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CoachAttendance,
    Error,
    { id: number | string; data: UpdateCoachAttendanceRequest }
  >({
    mutationFn: ({ id, data }) => updateCoachAttendance(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coach-attendance', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['coach-attendance', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting a coach attendance record
 */
export const useDeleteCoachAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteCoachAttendance,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['coach-attendance', 'list'] });
      queryClient.removeQueries({
        queryKey: ['coach-attendance', 'detail', id],
      });
    },
  });
};
