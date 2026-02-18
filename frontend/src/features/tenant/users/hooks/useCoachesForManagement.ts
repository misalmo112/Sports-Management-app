/**
 * Hook for fetching unified coaches list for User Management Coaches tab.
 * Only runs when enabled is true (e.g. when Coaches tab is active) to avoid
 * extra requests and potential auth/ordering issues on initial load.
 */
import { useQuery } from '@tanstack/react-query';
import { getCoachesForManagement } from '../services/usersApi';
import type { CoachManagementRow } from '../types';

export const useCoachesForManagement = (enabled = true) => {
  return useQuery<CoachManagementRow[], Error>({
    queryKey: ['users', 'coaches-for-management'],
    queryFn: getCoachesForManagement,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled,
  });
};
