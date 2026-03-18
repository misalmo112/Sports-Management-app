/**
 * Platform masters: Currency and Timezone
 */

export interface Currency {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Timezone {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CurrenciesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Currency[];
}

export interface TimezonesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Timezone[];
}

export interface Country {
  id: number;
  code: string;
  name: string;
  phone_code: string;
  region: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CountriesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Country[];
}

export interface CreateCurrencyRequest {
  code: string;
  name?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateCurrencyRequest {
  code?: string;
  name?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateTimezoneRequest {
  code: string;
  name?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateTimezoneRequest {
  code?: string;
  name?: string;
  is_active?: boolean;
  sort_order?: number;
}
