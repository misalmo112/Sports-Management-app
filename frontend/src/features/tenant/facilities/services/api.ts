/**
 * API service functions for Tenant Facilities
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  AddRentPaymentRequest,
  AdjustInventoryQuantityRequest,
  Bill,
  BillLineItem,
  CreateBillLineItemRequest,
  CreateBillRequest,
  CreateFacilityRentConfigRequest,
  CreateInventoryItemRequest,
  CreateRentInvoiceRequest,
  FacilityRentConfig,
  InventoryItem,
  MarkRentInvoicePaidRequest,
  PaginatedResponse,
  RentInvoice,
  RentPayment,
  RentReceipt,
  UpdateBillLineItemRequest,
  UpdateBillRequest,
  UpdateFacilityRentConfigRequest,
  UpdateInventoryItemRequest,
  UpdateRentInvoiceRequest,
} from '../types';

const buildQueryString = (params?: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  if (!params) return '';

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const q = query.toString();
  return q ? `?${q}` : '';
};

export const getRentConfigs = async (params?: {
  location?: number;
  period_type?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}) => {
  const qs = buildQueryString({
    location: params?.location,
    period_type: params?.period_type,
    is_active: params?.is_active !== undefined ? String(params.is_active) : undefined,
    page: params?.page,
    page_size: params?.page_size,
  });
  const response = await apiClient.get<PaginatedResponse<FacilityRentConfig>>(
    `${API_ENDPOINTS.TENANT.FACILITIES.RENT_CONFIGS.LIST}${qs}`
  );
  return response.data;
};

export const createRentConfig = async (data: CreateFacilityRentConfigRequest) => {
  const response = await apiClient.post<FacilityRentConfig>(
    API_ENDPOINTS.TENANT.FACILITIES.RENT_CONFIGS.CREATE,
    data
  );
  return response.data;
};

export const updateRentConfig = async (id: number | string, data: UpdateFacilityRentConfigRequest) => {
  const response = await apiClient.patch<FacilityRentConfig>(
    API_ENDPOINTS.TENANT.FACILITIES.RENT_CONFIGS.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteRentConfig = async (id: number | string) => {
  await apiClient.delete(API_ENDPOINTS.TENANT.FACILITIES.RENT_CONFIGS.DELETE(id));
};

export const getRentInvoices = async (params?: {
  status?: string;
  location?: number;
  issued_date?: string;
  due_date?: string;
  page?: number;
  page_size?: number;
}) => {
  const qs = buildQueryString({
    status: params?.status,
    location: params?.location,
    issued_date: params?.issued_date,
    due_date: params?.due_date,
    page: params?.page,
    page_size: params?.page_size,
  });
  const response = await apiClient.get<PaginatedResponse<RentInvoice>>(
    `${API_ENDPOINTS.TENANT.FACILITIES.RENT_INVOICES.LIST}${qs}`
  );
  return response.data;
};

export const createRentInvoice = async (data: CreateRentInvoiceRequest) => {
  const response = await apiClient.post<RentInvoice>(
    API_ENDPOINTS.TENANT.FACILITIES.RENT_INVOICES.CREATE,
    data
  );
  return response.data;
};

export const updateRentInvoice = async (id: number | string, data: UpdateRentInvoiceRequest) => {
  const response = await apiClient.patch<RentInvoice>(
    API_ENDPOINTS.TENANT.FACILITIES.RENT_INVOICES.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteRentInvoice = async (id: number | string) => {
  await apiClient.delete(API_ENDPOINTS.TENANT.FACILITIES.RENT_INVOICES.DELETE(id));
};

export const addRentInvoicePayment = async (id: number | string, data: AddRentPaymentRequest) => {
  const response = await apiClient.post<RentPayment>(
    API_ENDPOINTS.TENANT.FACILITIES.RENT_INVOICES.ADD_PAYMENT(id),
    data
  );
  return response.data;
};

export const markRentInvoicePaid = async (id: number | string, data?: MarkRentInvoicePaidRequest) => {
  const response = await apiClient.post<RentInvoice>(
    API_ENDPOINTS.TENANT.FACILITIES.RENT_INVOICES.MARK_PAID(id),
    data || {}
  );
  return response.data;
};

export const getRentReceipts = async (params?: {
  rent_invoice?: number;
  payment_date?: string;
  payment_method?: string;
  page?: number;
  page_size?: number;
}) => {
  const qs = buildQueryString({
    rent_invoice: params?.rent_invoice,
    payment_date: params?.payment_date,
    payment_method: params?.payment_method,
    page: params?.page,
    page_size: params?.page_size,
  });
  const response = await apiClient.get<PaginatedResponse<RentReceipt>>(
    `${API_ENDPOINTS.TENANT.FACILITIES.RENT_RECEIPTS.LIST}${qs}`
  );
  return response.data;
};

export const getRentReceipt = async (id: number | string) => {
  const response = await apiClient.get<RentReceipt>(
    API_ENDPOINTS.TENANT.FACILITIES.RENT_RECEIPTS.DETAIL(id)
  );
  return response.data;
};

export const getBills = async (params?: {
  status?: string;
  bill_date?: string;
  due_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  const qs = buildQueryString({
    status: params?.status,
    bill_date: params?.bill_date,
    due_date: params?.due_date,
    search: params?.search,
    page: params?.page,
    page_size: params?.page_size,
  });
  const response = await apiClient.get<PaginatedResponse<Bill>>(
    `${API_ENDPOINTS.TENANT.FACILITIES.BILLS.LIST}${qs}`
  );
  return response.data;
};

export const createBill = async (data: CreateBillRequest) => {
  const response = await apiClient.post<Bill>(API_ENDPOINTS.TENANT.FACILITIES.BILLS.CREATE, data);
  return response.data;
};

export const updateBill = async (id: number | string, data: UpdateBillRequest) => {
  const response = await apiClient.patch<Bill>(API_ENDPOINTS.TENANT.FACILITIES.BILLS.UPDATE(id), data);
  return response.data;
};

export const deleteBill = async (id: number | string) => {
  await apiClient.delete(API_ENDPOINTS.TENANT.FACILITIES.BILLS.DELETE(id));
};

export const markBillPaid = async (id: number | string) => {
  const response = await apiClient.post<Bill>(API_ENDPOINTS.TENANT.FACILITIES.BILLS.MARK_PAID(id), {});
  return response.data;
};

export const getBillLineItems = async (params?: {
  bill?: number;
  inventory_item?: number;
  page?: number;
  page_size?: number;
}) => {
  const qs = buildQueryString({
    bill: params?.bill,
    inventory_item: params?.inventory_item,
    page: params?.page,
    page_size: params?.page_size,
  });
  const response = await apiClient.get<PaginatedResponse<BillLineItem>>(
    `${API_ENDPOINTS.TENANT.FACILITIES.BILL_LINE_ITEMS.LIST}${qs}`
  );
  return response.data;
};

export const createBillLineItem = async (data: CreateBillLineItemRequest) => {
  const response = await apiClient.post<BillLineItem>(API_ENDPOINTS.TENANT.FACILITIES.BILL_LINE_ITEMS.CREATE, data);
  return response.data;
};

export const updateBillLineItem = async (id: number | string, data: UpdateBillLineItemRequest) => {
  const response = await apiClient.patch<BillLineItem>(
    API_ENDPOINTS.TENANT.FACILITIES.BILL_LINE_ITEMS.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteBillLineItem = async (id: number | string) => {
  await apiClient.delete(API_ENDPOINTS.TENANT.FACILITIES.BILL_LINE_ITEMS.DELETE(id));
};

export const getInventoryItems = async (params?: {
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  const qs = buildQueryString({
    search: params?.search,
    page: params?.page,
    page_size: params?.page_size,
  });
  const response = await apiClient.get<PaginatedResponse<InventoryItem>>(
    `${API_ENDPOINTS.TENANT.FACILITIES.INVENTORY_ITEMS.LIST}${qs}`
  );
  return response.data;
};

export const createInventoryItem = async (data: CreateInventoryItemRequest) => {
  const response = await apiClient.post<InventoryItem>(
    API_ENDPOINTS.TENANT.FACILITIES.INVENTORY_ITEMS.CREATE,
    data
  );
  return response.data;
};

export const updateInventoryItem = async (id: number | string, data: UpdateInventoryItemRequest) => {
  const response = await apiClient.patch<InventoryItem>(
    API_ENDPOINTS.TENANT.FACILITIES.INVENTORY_ITEMS.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteInventoryItem = async (id: number | string) => {
  await apiClient.delete(API_ENDPOINTS.TENANT.FACILITIES.INVENTORY_ITEMS.DELETE(id));
};

export const adjustInventoryItemQuantity = async (id: number | string, data: AdjustInventoryQuantityRequest) => {
  const response = await apiClient.post<InventoryItem>(
    API_ENDPOINTS.TENANT.FACILITIES.INVENTORY_ITEMS.ADJUST_QUANTITY(id),
    data
  );
  return response.data;
};
