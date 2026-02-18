/**
 * Hook for inviting an existing staff coach (create user, link, send invite).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteStaffCoach } from '../services/usersApi';

export const useInviteStaffCoach = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (coachId: number) => inviteStaffCoach(coachId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'coaches-for-management'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
};
