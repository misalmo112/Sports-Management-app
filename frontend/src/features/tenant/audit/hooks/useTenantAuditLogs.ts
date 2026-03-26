import { useQuery } from '@tanstack/react-query';
import { getTenantAuditLogs } from '../services/auditApi';
import type { TenantAuditLogFilters } from '../types';

export const useTenantAuditLogs = (filters?: TenantAuditLogFilters) => {
  return useQuery({
    queryKey: ['tenant-audit-logs', filters],
    queryFn: () => getTenantAuditLogs(filters),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};
