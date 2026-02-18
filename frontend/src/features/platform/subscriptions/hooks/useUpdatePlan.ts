/**
 * Hook for updating a plan
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePlan } from '../services/plansApi';
import type { UpdatePlanRequest, Plan } from '../types';

export const useUpdatePlan = (id: number | string) => {
  const queryClient = useQueryClient();

  return useMutation<Plan, Error, UpdatePlanRequest>({
    mutationFn: (data) => updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'detail', id] });
    },
  });
};

/**
 * Hook for updating any plan (e.g. from list table). Mutation variables: { id, data }.
 */
export const useUpdatePlanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Plan,
    Error,
    { id: number | string; data: UpdatePlanRequest }
  >({
    mutationFn: ({ id, data }) => updatePlan(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['plans', 'detail', variables.id],
      });
    },
  });
};
