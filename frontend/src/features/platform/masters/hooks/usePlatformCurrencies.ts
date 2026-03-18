import { useQuery } from '@tanstack/react-query';
import { getCurrencies } from '../services/mastersApi';
import type { CurrenciesListResponse } from '../types';

export const usePlatformCurrencies = (params?: {
  is_active?: boolean;
  search?: string;
}) => {
  return useQuery<CurrenciesListResponse, Error>({
    queryKey: ['platform', 'currencies', params],
    queryFn: () => getCurrencies(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
