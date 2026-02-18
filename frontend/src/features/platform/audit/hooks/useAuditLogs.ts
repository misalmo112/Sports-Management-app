/**
 * Hook for fetching audit logs list
 */
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../services/auditApi';
import type { AuditLogsListResponse } from '../types';

export const useAuditLogs = (params?: {
  action?: string;
  resource_type?: string;
  academy?: string;
  user?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
}) => {
  return useQuery<AuditLogsListResponse, Error>({
    queryKey: ['audit', 'logs', params],
    queryFn: () => getAuditLogs(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
