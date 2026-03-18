import { useQuery } from '@tanstack/react-query';
import { getTimezone } from '../services/mastersApi';
import type { Timezone } from '../types';

export const useTimezone = (id: number | string | undefined) => {
  return useQuery<Timezone, Error>({
    queryKey: ['platform', 'timezones', id],
    queryFn: () => getTimezone(id!),
    enabled: id != null && id !== '',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
