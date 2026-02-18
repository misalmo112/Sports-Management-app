/**
 * Hook for fetching platform errors
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
}) => {
  return useQuery<ErrorLogsListResponse, Error>({
    queryKey: ['platform', 'errors', params],
    queryFn: () => getErrorLogs(params),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
};
