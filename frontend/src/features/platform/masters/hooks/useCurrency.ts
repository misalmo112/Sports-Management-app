import { useQuery } from '@tanstack/react-query';
import { getCurrency } from '../services/mastersApi';
import type { Currency } from '../types';

export const useCurrency = (id: number | string | undefined) => {
  return useQuery<Currency, Error>({
    queryKey: ['platform', 'currencies', id],
    queryFn: () => getCurrency(id!),
    enabled: id != null && id !== '',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
