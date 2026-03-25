/**
 * TanStack Query hooks for Tenant Students
 */
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../services/api';
import type {
  StudentsListResponse,
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
} from '../types';

/**
 * Hook for fetching students list
 */
export const useStudents = (
  params?: {
    parent?: number;
    is_active?: boolean;
    gender?: string;
    search?: string;
    page?: number;
    page_size?: number;
  },
  options?: Pick<UseQueryOptions<StudentsListResponse, Error>, 'enabled'>
) => {
  return useQuery<StudentsListResponse, Error>({
    queryKey: ['students', 'list', params],
    queryFn: () => getStudents(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook for fetching a single student
 */
export const useStudent = (id: number | string | undefined) => {
  // Validate ID - prevent route parameter strings like ":1"
  const isValidId = id !== undefined && 
    (typeof id === 'number' || (typeof id === 'string' && !id.startsWith(':') && !isNaN(Number(id))));
  
  return useQuery<Student, Error>({
    queryKey: ['students', 'detail', id],
    queryFn: () => getStudent(id!),
    enabled: isValidId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating a student
 */
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation<Student, Error, CreateStudentRequest>({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
    },
  });
};

/**
 * Hook for updating a student
 */
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Student,
    Error,
    { id: number | string; data: UpdateStudentRequest }
  >({
    mutationFn: ({ id, data }) => updateStudent(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['students', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting a student
 */
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteStudent,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.removeQueries({ queryKey: ['students', 'detail', id] });
    },
  });
};
