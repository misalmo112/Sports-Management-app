/**
 * TanStack Query hooks for Tenant Classes and Enrollments
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  enrollStudent,
  getEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
} from '../services/api';
import type {
  ClassesListResponse,
  Class,
  CreateClassRequest,
  UpdateClassRequest,
  EnrollmentsListResponse,
  Enrollment,
  CreateEnrollmentRequest,
  EnrollStudentRequest,
  UpdateEnrollmentRequest,
} from '../types';

/**
 * Hook for fetching classes list
 */
export const useClasses = (params?: {
  coach?: number;
  is_active?: boolean;
  search?: string;
  sport?: number;
  location?: number;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<ClassesListResponse, Error>({
    queryKey: ['classes', 'list', params],
    queryFn: () => getClasses(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single class
 */
export const useClass = (id: number | string | undefined) => {
  return useQuery<Class, Error>({
    queryKey: ['classes', 'detail', id],
    queryFn: () => getClass(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating a class
 */
export const useCreateClass = () => {
  const queryClient = useQueryClient();

  return useMutation<Class, Error, CreateClassRequest>({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'list'] });
    },
  });
};

/**
 * Hook for updating a class
 */
export const useUpdateClass = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Class,
    Error,
    { id: number | string; data: UpdateClassRequest }
  >({
    mutationFn: ({ id, data }) => updateClass(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['classes', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting a class
 */
export const useDeleteClass = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteClass,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'list'] });
      queryClient.removeQueries({ queryKey: ['classes', 'detail', id] });
    },
  });
};

/**
 * Hook for enrolling a student in a class
 */
export const useEnrollStudent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Enrollment,
    Error,
    { classId: number | string; data: EnrollStudentRequest }
  >({
    mutationFn: ({ classId, data }) => enrollStudent(classId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classes', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['classes', 'detail', variables.classId],
      });
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'list'] });
    },
  });
};

/**
 * Hook for fetching enrollments list
 */
export const useEnrollments = (params?: {
  student?: number;
  class_obj?: number;
  status?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<EnrollmentsListResponse, Error>({
    queryKey: ['enrollments', 'list', params],
    queryFn: () => getEnrollments(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single enrollment
 */
export const useEnrollment = (id: number | string | undefined) => {
  return useQuery<Enrollment, Error>({
    queryKey: ['enrollments', 'detail', id],
    queryFn: () => getEnrollment(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating an enrollment
 */
export const useCreateEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation<Enrollment, Error, CreateEnrollmentRequest>({
    mutationFn: createEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['classes', 'list'] });
    },
  });
};

/**
 * Hook for updating an enrollment
 */
export const useUpdateEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Enrollment,
    Error,
    { id: number | string; data: UpdateEnrollmentRequest }
  >({
    mutationFn: ({ id, data }) => updateEnrollment(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['enrollments', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting an enrollment (unenroll)
 */
export const useDeleteEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteEnrollment,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['classes', 'list'] });
      queryClient.removeQueries({ queryKey: ['enrollments', 'detail', id] });
    },
  });
};
