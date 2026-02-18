/**
 * TanStack Query hooks for Tenant Parents
 */
import { useQuery } from '@tanstack/react-query';
import { getParents, getParent } from '../services/parentsApi';
import type { ParentsListResponse, Parent } from '../services/parentsApi';

/**
 * Hook for fetching parents list
 */
export const useParents = (params?: {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<ParentsListResponse, Error>({
    queryKey: ['parents', 'list', params],
    queryFn: () => getParents(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single parent
 */
export const useParent = (id: number | string | undefined) => {
  return useQuery<Parent, Error>({
    queryKey: ['parents', 'detail', id],
    queryFn: () => getParent(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
