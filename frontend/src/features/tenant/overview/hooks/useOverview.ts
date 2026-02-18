/**
 * Hook for fetching overview data
 */
import { useQuery } from '@tanstack/react-query';
import { getOverview } from '../services/overviewApi';
import type { Overview } from '../types';

export const useOverview = () => {
  return useQuery<Overview, Error>({
    queryKey: ['tenant', 'overview'],
    queryFn: getOverview,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};
