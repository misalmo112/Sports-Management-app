/**
 * Hook for fetching error log dashboard summary counts.
 * Auto-refreshes every 60 seconds.
 */
import { useQuery } from '@tanstack/react-query';
import { getErrorLogSummary } from '../services/auditApi';
import type { ErrorLogSummary } from '../types';

export const useErrorLogSummary = () => {
  return useQuery<ErrorLogSummary, Error>({
    queryKey: ['error-log-summary'],
    queryFn: getErrorLogSummary,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
};
