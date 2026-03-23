/**
 * Admins tab: merge ADMIN and STAFF list results (single role filter per request).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../services/usersApi';
import type { UsersListResponse, User } from '../types';

export const useAdminAndStaffUsers = (enabled: boolean) => {
  const adminQuery = useQuery<UsersListResponse, Error>({
    queryKey: ['users', 'list', 'ADMIN'],
    queryFn: () => getUsers('ADMIN'),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled,
  });

  const staffQuery = useQuery<UsersListResponse, Error>({
    queryKey: ['users', 'list', 'STAFF'],
    queryFn: () => getUsers('STAFF'),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled,
  });

  const data = useMemo<UsersListResponse | undefined>(() => {
    if (!adminQuery.data?.results && !staffQuery.data?.results) {
      return undefined;
    }
    const byId = new Map<number, User>();
    for (const u of adminQuery.data?.results ?? []) {
      byId.set(u.id, u);
    }
    for (const u of staffQuery.data?.results ?? []) {
      byId.set(u.id, u);
    }
    const results = [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return {
      count: results.length,
      next: null,
      previous: null,
      results,
    };
  }, [adminQuery.data, staffQuery.data]);

  return {
    data,
    isLoading: adminQuery.isLoading || staffQuery.isLoading,
    error: adminQuery.error ?? staffQuery.error,
    refetch: () => {
      void adminQuery.refetch();
      void staffQuery.refetch();
    },
  };
};
