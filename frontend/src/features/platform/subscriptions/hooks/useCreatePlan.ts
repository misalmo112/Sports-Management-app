/**
 * Hook for creating a plan
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan } from '../services/plansApi';
import type { CreatePlanRequest, Plan } from '../types';

export const useCreatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation<Plan, Error, CreatePlanRequest>({
    mutationFn: createPlan,
    onSuccess: () => {
      // Invalidate plans list to refetch
      queryClient.invalidateQueries({ queryKey: ['plans', 'list'] });
    },
  });
};
