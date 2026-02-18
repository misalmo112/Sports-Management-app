/**
 * Hook for resending user invites
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resendInvite } from '../services/usersApi';

export const useResendInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { detail: string; invite_sent: boolean },
    Error,
    number
  >({
    mutationFn: (id: number) => resendInvite(id),
    onSuccess: () => {
      // Invalidate users list queries to refetch and update invite status
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
};
