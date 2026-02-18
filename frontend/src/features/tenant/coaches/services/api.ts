/**
 * API service functions for Tenant Coaches
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';

export interface Coach {
  id: number;
  academy: number;
  user?: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  certifications?: string;
  bio?: string;
  assigned_classes_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Coach[];
}

/**
 * List coaches with optional filters
 */
export const getCoaches = async (
  params?: {
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<CoachesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.is_active !== undefined) {
    queryParams.append('is_active', params.is_active.toString());
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.COACHES.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.COACHES.LIST;

  const response = await apiClient.get<CoachesListResponse>(url);
  return response.data;
};

export interface CreateCoachRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  certifications?: string;
  bio?: string;
  is_active?: boolean;
  user?: number;
}

export interface UpdateCoachRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  certifications?: string;
  bio?: string;
  is_active?: boolean;
  user?: number;
}

/**
 * Get a single coach by ID
 */
export const getCoach = async (id: number | string): Promise<Coach> => {
  const response = await apiClient.get<Coach>(
    API_ENDPOINTS.TENANT.COACHES.DETAIL(id)
  );
  return response.data;
};

/**
 * Create a new coach
 */
export const createCoach = async (
  data: CreateCoachRequest
): Promise<Coach> => {
  const response = await apiClient.post<Coach>(
    API_ENDPOINTS.TENANT.COACHES.CREATE,
    data
  );
  return response.data;
};

/**
 * Update a coach
 */
export const updateCoach = async (
  id: number | string,
  data: UpdateCoachRequest
): Promise<Coach> => {
  const response = await apiClient.patch<Coach>(
    API_ENDPOINTS.TENANT.COACHES.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Delete a coach (soft delete)
 */
export const deleteCoach = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.COACHES.DELETE(id));
};

// --- Coach Pay Schemes ---

export type CoachPaySchemePeriodType = 'SESSION' | 'MONTH' | 'WEEK';

export interface CoachPayScheme {
  id: number;
  coach: number;
  coach_name: string;
  academy: number;
  period_type: CoachPaySchemePeriodType;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface CoachPaySchemeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CoachPayScheme[];
}

export interface CreateCoachPaySchemeRequest {
  coach: number;
  period_type: CoachPaySchemePeriodType;
  amount: string;
}

export interface UpdateCoachPaySchemeRequest {
  coach?: number;
  period_type?: CoachPaySchemePeriodType;
  amount?: string;
}

export const getCoachPaySchemes = async (
  params?: {
    coach?: number;
    period_type?: string;
    page?: number;
    page_size?: number;
  }
): Promise<CoachPaySchemeListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.coach !== undefined) {
    queryParams.append('coach', params.coach.toString());
  }
  if (params?.period_type) {
    queryParams.append('period_type', params.period_type);
  }
  if (params?.page !== undefined) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size !== undefined) {
    queryParams.append('page_size', params.page_size.toString());
  }
  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.COACH_PAY_SCHEMES.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.COACH_PAY_SCHEMES.LIST;
  const response = await apiClient.get<CoachPaySchemeListResponse>(url);
  return response.data;
};

export const getCoachPayScheme = async (
  id: number | string
): Promise<CoachPayScheme> => {
  const response = await apiClient.get<CoachPayScheme>(
    API_ENDPOINTS.TENANT.COACH_PAY_SCHEMES.DETAIL(id)
  );
  return response.data;
};

export const createCoachPayScheme = async (
  data: CreateCoachPaySchemeRequest
): Promise<CoachPayScheme> => {
  const response = await apiClient.post<CoachPayScheme>(
    API_ENDPOINTS.TENANT.COACH_PAY_SCHEMES.CREATE,
    data
  );
  return response.data;
};

export const updateCoachPayScheme = async (
  id: number | string,
  data: UpdateCoachPaySchemeRequest
): Promise<CoachPayScheme> => {
  const response = await apiClient.patch<CoachPayScheme>(
    API_ENDPOINTS.TENANT.COACH_PAY_SCHEMES.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteCoachPayScheme = async (
  id: number | string
): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.COACH_PAY_SCHEMES.DELETE(id));
};

// --- Coach Payments ---

export type PaymentMethod = 'CASH' | 'CHECK' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface CoachPayment {
  id: number;
  coach: number;
  coach_name: string;
  academy: number;
  period_type: CoachPaySchemePeriodType;
  period_start: string;
  amount: string;
  payment_date: string;
  payment_method: PaymentMethod;
  staff_invoice?: number | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CoachPaymentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CoachPayment[];
}

export interface CreateCoachPaymentRequest {
  coach: number;
  period_type: CoachPaySchemePeriodType;
  period_start: string;
  amount: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  staff_invoice?: number | null;
  notes?: string;
}

export const getCoachPayments = async (params?: {
  coach?: number;
  period_type?: string;
  page?: number;
  page_size?: number;
}): Promise<CoachPaymentListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.coach !== undefined) queryParams.append('coach', params.coach.toString());
  if (params?.period_type) queryParams.append('period_type', params.period_type);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.page_size !== undefined) queryParams.append('page_size', params.page_size.toString());
  const qs = queryParams.toString();
  const url = qs ? `${API_ENDPOINTS.TENANT.COACH_PAYMENTS.LIST}?${qs}` : API_ENDPOINTS.TENANT.COACH_PAYMENTS.LIST;
  const response = await apiClient.get<CoachPaymentListResponse>(url);
  return response.data;
};

export const createCoachPayment = async (data: CreateCoachPaymentRequest): Promise<CoachPayment> => {
  const response = await apiClient.post<CoachPayment>(
    API_ENDPOINTS.TENANT.COACH_PAYMENTS.CREATE,
    data
  );
  return response.data;
};

// --- Staff Invoices ---

export type StaffInvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED';

export interface StaffInvoice {
  id: number;
  academy: number;
  coach: number;
  coach_name: string;
  invoice_number: string;
  amount: string;
  currency: string;
  period_description: string;
  period_type: CoachPaySchemePeriodType;
  period_start: string;
  status: StaffInvoiceStatus;
  issued_date: string;
  due_date?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffInvoiceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StaffInvoice[];
}

export interface CreateStaffInvoiceRequest {
  coach: number;
  amount: number;
  currency?: string;
  period_description: string;
  period_type: CoachPaySchemePeriodType;
  period_start: string;
  status?: StaffInvoiceStatus;
  issued_date?: string;
  due_date?: string | null;
  notes?: string;
}

export interface UpdateStaffInvoiceRequest {
  coach?: number;
  amount?: number;
  currency?: string;
  period_description?: string;
  period_type?: CoachPaySchemePeriodType;
  period_start?: string;
  status?: StaffInvoiceStatus;
  issued_date?: string;
  due_date?: string | null;
  notes?: string;
}

export const getStaffInvoices = async (params?: {
  coach?: number;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<StaffInvoiceListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.coach !== undefined) queryParams.append('coach', params.coach.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.page_size !== undefined) queryParams.append('page_size', params.page_size.toString());
  const qs = queryParams.toString();
  const url = qs ? `${API_ENDPOINTS.TENANT.STAFF_INVOICES.LIST}?${qs}` : API_ENDPOINTS.TENANT.STAFF_INVOICES.LIST;
  const response = await apiClient.get<StaffInvoiceListResponse>(url);
  return response.data;
};

export const createStaffInvoice = async (data: CreateStaffInvoiceRequest): Promise<StaffInvoice> => {
  const response = await apiClient.post<StaffInvoice>(
    API_ENDPOINTS.TENANT.STAFF_INVOICES.CREATE,
    data
  );
  return response.data;
};

export const updateStaffInvoice = async (
  id: number | string,
  data: UpdateStaffInvoiceRequest
): Promise<StaffInvoice> => {
  const response = await apiClient.patch<StaffInvoice>(
    API_ENDPOINTS.TENANT.STAFF_INVOICES.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteStaffInvoice = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.STAFF_INVOICES.DELETE(id));
};

// --- Staff Receipts ---

export interface StaffReceipt {
  id: number;
  academy: number;
  coach: number;
  coach_name: string;
  staff_invoice?: number | null;
  staff_invoice_detail?: { id: number; invoice_number: string; coach_name: string } | null;
  coach_payment: number;
  receipt_number: string;
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffReceiptListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StaffReceipt[];
}

export const getStaffReceipts = async (params?: {
  coach?: number;
  payment_date?: string;
  payment_method?: string;
  staff_invoice?: number;
  page?: number;
  page_size?: number;
}): Promise<StaffReceiptListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.coach !== undefined) queryParams.append('coach', params.coach.toString());
  if (params?.payment_date) queryParams.append('payment_date', params.payment_date);
  if (params?.payment_method) queryParams.append('payment_method', params.payment_method);
  if (params?.staff_invoice !== undefined) queryParams.append('staff_invoice', params.staff_invoice.toString());
  if (params?.page !== undefined) queryParams.append('page', params.page.toString());
  if (params?.page_size !== undefined) queryParams.append('page_size', params.page_size.toString());
  const qs = queryParams.toString();
  const url = qs ? `${API_ENDPOINTS.TENANT.STAFF_RECEIPTS.LIST}?${qs}` : API_ENDPOINTS.TENANT.STAFF_RECEIPTS.LIST;
  const response = await apiClient.get<StaffReceiptListResponse>(url);
  return response.data;
};
