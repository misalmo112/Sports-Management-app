/**
 * Hook for inviting a guardian (create PARENT user + send invite email).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteGuardianParent } from '../services/usersApi';

export const useInviteGuardianParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parentId: number) => inviteGuardianParent(parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'parents-for-management'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
};
