/**
 * Hook for fetching unified parents list for User Management Parents tab.
 */
import { useQuery } from '@tanstack/react-query';
import { getParentsForManagement } from '../services/usersApi';
import type { ParentManagementRow } from '../types';

export const useParentsForManagement = (enabled = true) => {
  return useQuery<ParentManagementRow[], Error>({
    queryKey: ['users', 'parents-for-management'],
    queryFn: getParentsForManagement,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled,
  });
};
