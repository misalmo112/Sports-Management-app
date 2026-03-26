/**
 * Hook for fetching platform errors with filters
 */
import { useQuery } from '@tanstack/react-query';
import { getErrorLogs } from '../services/auditApi';
import type { ErrorLogsListResponse } from '../types';

export const usePlatformErrors = (params?: {
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
  severity?: string;
  is_resolved?: string;
}) => {
  return useQuery<ErrorLogsListResponse, Error>({
    queryKey: ['error-logs', params],
    queryFn: () => getErrorLogs(params),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
};
