/**
 * Hook for fetching plans list
 */
import { useQuery } from '@tanstack/react-query';
import { getPlans } from '../services/plansApi';
import type { PlansListResponse } from '../types';

export const usePlans = (params?: {
  is_active?: boolean;
  search?: string;
  page?: number;
}) => {
  return useQuery<PlansListResponse, Error>({
    queryKey: ['plans', 'list', params],
    queryFn: () => getPlans(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};
