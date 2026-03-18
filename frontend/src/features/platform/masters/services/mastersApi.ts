/**
 * API service for Platform Masters (currencies, timezones)
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Currency,
  Timezone,
  Country,
  CurrenciesListResponse,
  TimezonesListResponse,
  CountriesListResponse,
  CreateCurrencyRequest,
  UpdateCurrencyRequest,
  CreateTimezoneRequest,
  UpdateTimezoneRequest,
} from '../types';

function buildQuery(params?: Record<string, boolean | string | number | undefined>): string {
  const queryParams = new URLSearchParams();
  if (!params) return '';
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  const s = queryParams.toString();
  return s ? `?${s}` : '';
}

// Currencies
export const getCurrencies = async (params?: {
  is_active?: boolean;
  search?: string;
  ordering?: string;
}): Promise<CurrenciesListResponse> => {
  const url = `${API_ENDPOINTS.PLATFORM.MASTERS.CURRENCIES.LIST}${buildQuery(params as Record<string, boolean | string | undefined>)}`;
  const response = await apiClient.get<CurrenciesListResponse | Currency[]>(url);
  const data = response.data;
  // Normalize: backend may return paginated { count, next, previous, results } or a plain list
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  if (data && typeof data === 'object' && 'results' in data) {
    return data as CurrenciesListResponse;
  }
  return { count: 0, next: null, previous: null, results: [] };
};

export const getCurrency = async (id: number | string): Promise<Currency> => {
  const response = await apiClient.get<Currency>(
    API_ENDPOINTS.PLATFORM.MASTERS.CURRENCIES.DETAIL(id)
  );
  return response.data;
};

export const createCurrency = async (data: CreateCurrencyRequest): Promise<Currency> => {
  const response = await apiClient.post<Currency>(
    API_ENDPOINTS.PLATFORM.MASTERS.CURRENCIES.LIST,
    data
  );
  return response.data;
};

export const updateCurrency = async (
  id: number | string,
  data: UpdateCurrencyRequest
): Promise<Currency> => {
  const response = await apiClient.patch<Currency>(
    API_ENDPOINTS.PLATFORM.MASTERS.CURRENCIES.DETAIL(id),
    data
  );
  return response.data;
};

export const deleteCurrency = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.PLATFORM.MASTERS.CURRENCIES.DETAIL(id));
};

// Timezones
export const getTimezones = async (params?: {
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page_size?: number;
}): Promise<TimezonesListResponse> => {
  const url = `${API_ENDPOINTS.PLATFORM.MASTERS.TIMEZONES.LIST}${buildQuery(params as Record<string, boolean | string | number | undefined>)}`;
  const response = await apiClient.get<TimezonesListResponse>(url);
  return response.data;
};

export const getTimezone = async (id: number | string): Promise<Timezone> => {
  const response = await apiClient.get<Timezone>(
    API_ENDPOINTS.PLATFORM.MASTERS.TIMEZONES.DETAIL(id)
  );
  return response.data;
};

export const createTimezone = async (data: CreateTimezoneRequest): Promise<Timezone> => {
  const response = await apiClient.post<Timezone>(
    API_ENDPOINTS.PLATFORM.MASTERS.TIMEZONES.LIST,
    data
  );
  return response.data;
};

export const updateTimezone = async (
  id: number | string,
  data: UpdateTimezoneRequest
): Promise<Timezone> => {
  const response = await apiClient.patch<Timezone>(
    API_ENDPOINTS.PLATFORM.MASTERS.TIMEZONES.DETAIL(id),
    data
  );
  return response.data;
};

export const deleteTimezone = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.PLATFORM.MASTERS.TIMEZONES.DETAIL(id));
};

// Countries (read-only list for dropdowns)
export const getCountries = async (params?: {
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page_size?: number;
}): Promise<CountriesListResponse> => {
  const url = `${API_ENDPOINTS.PLATFORM.MASTERS.COUNTRIES.LIST}${buildQuery(params as Record<string, boolean | string | number | undefined>)}`;
  const response = await apiClient.get<CountriesListResponse | Country[]>(url);
  const data = response.data;
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  if (data && typeof data === 'object' && 'results' in data) {
    return data as CountriesListResponse;
  }
  return { count: 0, next: null, previous: null, results: [] };
};
