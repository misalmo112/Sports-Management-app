import { useQuery } from '@tanstack/react-query';
import { getTimezones } from '../services/mastersApi';
import type { TimezonesListResponse } from '../types';

export const usePlatformTimezones = (params?: {
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page_size?: number;
}) => {
  return useQuery<TimezonesListResponse, Error>({
    queryKey: ['platform', 'timezones', params],
    queryFn: () => getTimezones(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
