/**
 * Hook for deleting a plan
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePlan } from '../services/plansApi';

export const useDeletePlan = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'list'] });
    },
  });
};
