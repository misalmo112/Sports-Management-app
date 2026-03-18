/**
 * API service functions for master data (timezones, currencies, countries)
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';

export interface TimezonesResponse {
  timezones: string[];
}

export interface CurrenciesResponse {
  currencies: string[];
}

export interface CountryItem {
  code: string;
  name: string;
}

export interface CountriesResponse {
  countries: CountryItem[];
}

export const getTimezones = async (): Promise<TimezonesResponse> => {
  const response = await apiClient.get<TimezonesResponse>(API_ENDPOINTS.TENANT.MASTERS.TIMEZONES);
  return response.data;
};

export const getCurrencies = async (): Promise<CurrenciesResponse> => {
  const response = await apiClient.get<CurrenciesResponse>(API_ENDPOINTS.TENANT.MASTERS.CURRENCIES);
  return response.data;
};

export const getCountries = async (): Promise<CountriesResponse> => {
  const response = await apiClient.get<CountriesResponse>(API_ENDPOINTS.TENANT.MASTERS.COUNTRIES);
  return response.data;
};
