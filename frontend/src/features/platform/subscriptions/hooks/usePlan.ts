/**
 * Hook for fetching a single plan
 */
import { useQuery } from '@tanstack/react-query';
import { getPlan } from '../services/plansApi';
import type { Plan } from '../types';

export const usePlan = (id: number | string | undefined) => {
  return useQuery<Plan, Error>({
    queryKey: ['plans', 'detail', id],
    queryFn: () => getPlan(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
