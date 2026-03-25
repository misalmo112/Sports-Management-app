import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPortalStudent, patchPortalStudent } from '../services/api';
import type { PortalStudentPatchPayload } from '../types';

export const portalStudentQueryKey = (id: number | string) => ['portal-student', id] as const;

export function usePortalStudent(studentId: number | string | null, enabled = true) {
  return useQuery({
    queryKey: studentId != null ? portalStudentQueryKey(studentId) : ['portal-student', 'none'],
    queryFn: () => getPortalStudent(studentId as number | string),
    enabled: enabled && studentId != null,
    staleTime: 15000,
  });
}

export function usePatchPortalStudent(studentId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PortalStudentPatchPayload>) => patchPortalStudent(studentId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(portalStudentQueryKey(studentId), data);
    },
  });
}
