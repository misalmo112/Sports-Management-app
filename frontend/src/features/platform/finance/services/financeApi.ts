import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';

import type {
  AcademyOption,
  FinanceSummary,
  OperationalExpense,
  OperationalExpenseCreate,
  PaginatedResponse,
  PlatformPayment,
  PlatformPaymentCreate,
} from '../types';

interface AcademyListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    id: string;
    name: string;
  }>;
}

const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  return queryParams.toString();
};

export const getFinanceSummary = async (
  year?: number,
  month?: number
): Promise<FinanceSummary> => {
  const queryString = buildQueryString({ year, month });
  const url = queryString
    ? `${API_ENDPOINTS.PLATFORM.FINANCE.SUMMARY}?${queryString}`
    : API_ENDPOINTS.PLATFORM.FINANCE.SUMMARY;

  const response = await apiClient.get<FinanceSummary>(url);
  return response.data;
};

export const getPlatformPayments = async (params?: {
  academy?: string;
  subscription?: number;
  payment_date_after?: string;
  payment_date_before?: string;
  page?: number;
}): Promise<PaginatedResponse<PlatformPayment>> => {
  const queryString = buildQueryString({
    academy: params?.academy,
    subscription: params?.subscription,
    payment_date_after: params?.payment_date_after,
    payment_date_before: params?.payment_date_before,
    page: params?.page,
  });
  const url = queryString
    ? `${API_ENDPOINTS.PLATFORM.FINANCE.PAYMENTS.LIST}?${queryString}`
    : API_ENDPOINTS.PLATFORM.FINANCE.PAYMENTS.LIST;

  const response = await apiClient.get<PaginatedResponse<PlatformPayment>>(url);
  return response.data;
};

export const exportPayments = async (year?: number, month?: number): Promise<Blob> => {
  const queryString = buildQueryString({ year, month });
  const url = queryString
    ? `${API_ENDPOINTS.PLATFORM.FINANCE.EXPORT}?${queryString}`
    : API_ENDPOINTS.PLATFORM.FINANCE.EXPORT;

  const response = await apiClient.get<Blob>(url, {
    responseType: 'blob',
  });
  return response.data;
};

export const createPlatformPayment = async (
  data: PlatformPaymentCreate
): Promise<PlatformPayment> => {
  const response = await apiClient.post<PlatformPayment>(
    API_ENDPOINTS.PLATFORM.FINANCE.PAYMENTS.LIST,
    data
  );
  return response.data;
};

export const updatePlatformPayment = async (
  id: number,
  data: Partial<PlatformPaymentCreate>
): Promise<PlatformPayment> => {
  const response = await apiClient.patch<PlatformPayment>(
    API_ENDPOINTS.PLATFORM.FINANCE.PAYMENTS.DETAIL(id),
    data
  );
  return response.data;
};

export const getOperationalExpenses = async (params?: {
  category?: string;
  billing_cycle?: string;
  is_paid?: boolean;
  paid_date_after?: string;
  paid_date_before?: string;
  page?: number;
}): Promise<PaginatedResponse<OperationalExpense>> => {
  const queryString = buildQueryString({
    category: params?.category,
    billing_cycle: params?.billing_cycle,
    is_paid: params?.is_paid,
    paid_date_after: params?.paid_date_after,
    paid_date_before: params?.paid_date_before,
    page: params?.page,
  });
  const url = queryString
    ? `${API_ENDPOINTS.PLATFORM.FINANCE.EXPENSES.LIST}?${queryString}`
    : API_ENDPOINTS.PLATFORM.FINANCE.EXPENSES.LIST;

  const response = await apiClient.get<PaginatedResponse<OperationalExpense>>(url);
  return response.data;
};

export const createOperationalExpense = async (
  data: OperationalExpenseCreate
): Promise<OperationalExpense> => {
  const response = await apiClient.post<OperationalExpense>(
    API_ENDPOINTS.PLATFORM.FINANCE.EXPENSES.LIST,
    data
  );
  return response.data;
};

export const updateOperationalExpense = async (
  id: number,
  data: Partial<OperationalExpenseCreate>
): Promise<OperationalExpense> => {
  const response = await apiClient.patch<OperationalExpense>(
    API_ENDPOINTS.PLATFORM.FINANCE.EXPENSES.DETAIL(id),
    data
  );
  return response.data;
};

export const getAcademyOptions = async (): Promise<AcademyOption[]> => {
  const queryString = buildQueryString({ is_active: true, page_size: 100 });
  const response = await apiClient.get<AcademyListResponse>(
    `${API_ENDPOINTS.PLATFORM.ACADEMIES.LIST}?${queryString}`
  );

  return response.data.results.map((academy) => ({
    id: academy.id,
    name: academy.name,
  }));
};
