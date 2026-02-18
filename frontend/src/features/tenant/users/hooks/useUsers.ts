/**
 * Hook for fetching users list
 */
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../services/usersApi';
import type { UsersListResponse } from '../types';

export const useUsers = (role?: string, status?: string) => {
  return useQuery<UsersListResponse, Error>({
    queryKey: ['users', 'list', role, status],
    queryFn: () => getUsers(role, status),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};
