/**
 * Hook for inviting users
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteUser } from '../services/usersApi';
import type { InviteUserRequest, InviteUserResponse } from '../types';

export const useInviteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<InviteUserResponse, Error, InviteUserRequest>({
    mutationFn: inviteUser,
    onSuccess: () => {
      // Invalidate users list queries to refetch
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
};
