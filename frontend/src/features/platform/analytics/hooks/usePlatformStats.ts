/**
 * Hook for fetching platform statistics
 */
import { useQuery } from '@tanstack/react-query';
import { getPlatformStats } from '../services/statsApi';
import type { PlatformStats } from '../types';

export const usePlatformStats = () => {
  return useQuery<PlatformStats, Error>({
    queryKey: ['platform', 'stats'],
    queryFn: getPlatformStats,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
};
