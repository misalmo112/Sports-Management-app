/**
 * Hooks for master data lists.
 */
import { useQuery } from '@tanstack/react-query';
import { getCountries, getCurrencies, getTimezones } from '@/shared/services/masters';
import type { CountriesResponse, CurrenciesResponse, TimezonesResponse } from '@/shared/services/masters';

export const useMasterTimezones = () => {
  return useQuery<TimezonesResponse, Error>({
    queryKey: ['masters', 'timezones'],
    queryFn: getTimezones,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useMasterCurrencies = () => {
  return useQuery<CurrenciesResponse, Error>({
    queryKey: ['masters', 'currencies'],
    queryFn: getCurrencies,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useMasterCountries = () => {
  return useQuery<CountriesResponse, Error>({
    queryKey: ['masters', 'countries'],
    queryFn: getCountries,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
