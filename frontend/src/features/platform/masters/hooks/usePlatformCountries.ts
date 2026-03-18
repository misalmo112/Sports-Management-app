import { useQuery } from '@tanstack/react-query';
import { getCountries } from '../services/mastersApi';
import type { CountriesListResponse } from '../types';

export const usePlatformCountries = (params?: {
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page_size?: number;
}) => {
  return useQuery<CountriesListResponse, Error>({
    queryKey: ['platform', 'countries', params],
    queryFn: () => getCountries(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
