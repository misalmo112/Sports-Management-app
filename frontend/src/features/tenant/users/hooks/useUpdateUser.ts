/**
 * Hook for updating users
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '../services/usersApi';
import type { UpdateUserRequest, UpdateUserResponse } from '../types';

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateUserResponse,
    Error,
    { id: number; data: UpdateUserRequest }
  >({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      // Invalidate users list queries to refetch
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
};
