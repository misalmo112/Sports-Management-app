/**
 * API service functions for Tenant Billing
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  BillingItem,
  BillingItemsListResponse,
  CreateBillingItemRequest,
  UpdateBillingItemRequest,
  Invoice,
  InvoicesListResponse,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  Receipt,
  ReceiptsListResponse,
  CreateReceiptRequest,
  UpdateReceiptRequest,
} from '../types';

/**
 * List billing items with optional filters
 */
export const getBillingItems = async (
  params?: {
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<BillingItemsListResponse> => {
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
    ? `${API_ENDPOINTS.TENANT.BILLING.ITEMS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.BILLING.ITEMS.LIST;

  const response = await apiClient.get<BillingItemsListResponse>(url);
  return response.data;
};

/**
 * Get billing item details by ID
 */
export const getBillingItem = async (
  id: number | string
): Promise<BillingItem> => {
  const response = await apiClient.get<BillingItem>(
    API_ENDPOINTS.TENANT.BILLING.ITEMS.DETAIL(id)
  );
  return response.data;
};

/**
 * Create a new billing item
 */
export const createBillingItem = async (
  data: CreateBillingItemRequest
): Promise<BillingItem> => {
  const response = await apiClient.post<BillingItem>(
    API_ENDPOINTS.TENANT.BILLING.ITEMS.CREATE,
    data
  );
  return response.data;
};

/**
 * Update billing item
 */
export const updateBillingItem = async (
  id: number | string,
  data: UpdateBillingItemRequest
): Promise<BillingItem> => {
  const response = await apiClient.patch<BillingItem>(
    API_ENDPOINTS.TENANT.BILLING.ITEMS.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Delete billing item
 */
export const deleteBillingItem = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.BILLING.ITEMS.DELETE(id));
};

/**
 * List invoices with optional filters
 */
export const getInvoices = async (
  params?: {
    parent?: number;
    status?: string;
    page?: number;
    page_size?: number;
  }
): Promise<InvoicesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.parent) {
    queryParams.append('parent', params.parent.toString());
  }
  if (params?.status) {
    queryParams.append('status', params.status);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.BILLING.INVOICES.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.BILLING.INVOICES.LIST;

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:127',message:'Calling getInvoices API',data:{url,params,hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<InvoicesListResponse>(url);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:131',message:'getInvoices API success',data:{status:response.status,dataCount:response.data?.results?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:135',message:'getInvoices API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Get invoice details by ID
 */
export const getInvoice = async (id: number | string): Promise<Invoice> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:138',message:'Calling getInvoice API',data:{id,url:API_ENDPOINTS.TENANT.BILLING.INVOICES.DETAIL(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<Invoice>(
      API_ENDPOINTS.TENANT.BILLING.INVOICES.DETAIL(id)
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:142',message:'getInvoice API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:146',message:'getInvoice API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Create a new invoice
 */
export const createInvoice = async (
  data: CreateInvoiceRequest
): Promise<Invoice> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:148',message:'Calling createInvoice API',data:{url:API_ENDPOINTS.TENANT.BILLING.INVOICES.CREATE,dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.post<Invoice>(
      API_ENDPOINTS.TENANT.BILLING.INVOICES.CREATE,
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:154',message:'createInvoice API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:158',message:'createInvoice API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Update invoice
 */
export const updateInvoice = async (
  id: number | string,
  data: UpdateInvoiceRequest
): Promise<Invoice> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:161',message:'Calling updateInvoice API',data:{id,url:API_ENDPOINTS.TENANT.BILLING.INVOICES.UPDATE(id),dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.patch<Invoice>(
      API_ENDPOINTS.TENANT.BILLING.INVOICES.UPDATE(id),
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:167',message:'updateInvoice API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:171',message:'updateInvoice API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Delete invoice
 */
export const deleteInvoice = async (id: number | string): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:175',message:'Calling deleteInvoice API',data:{id,url:API_ENDPOINTS.TENANT.BILLING.INVOICES.DELETE(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    await apiClient.delete(API_ENDPOINTS.TENANT.BILLING.INVOICES.DELETE(id));
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:178',message:'deleteInvoice API success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:180',message:'deleteInvoice API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * List receipts with optional filters
 */
export const getReceipts = async (
  params?: {
    invoice?: number;
    page?: number;
    page_size?: number;
  }
): Promise<ReceiptsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.invoice) {
    queryParams.append('invoice', params.invoice.toString());
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.BILLING.RECEIPTS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.BILLING.RECEIPTS.LIST;

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:201',message:'Calling getReceipts API',data:{url,params,hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<ReceiptsListResponse>(url);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:205',message:'getReceipts API success',data:{status:response.status,dataCount:response.data?.results?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:209',message:'getReceipts API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Get receipt details by ID
 */
export const getReceipt = async (id: number | string): Promise<Receipt> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:212',message:'Calling getReceipt API',data:{id,url:API_ENDPOINTS.TENANT.BILLING.RECEIPTS.DETAIL(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<Receipt>(
      API_ENDPOINTS.TENANT.BILLING.RECEIPTS.DETAIL(id)
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:216',message:'getReceipt API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:220',message:'getReceipt API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Create a new receipt
 */
export const createReceipt = async (
  data: CreateReceiptRequest
): Promise<Receipt> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:222',message:'Calling createReceipt API',data:{url:API_ENDPOINTS.TENANT.BILLING.RECEIPTS.CREATE,dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.post<Receipt>(
      API_ENDPOINTS.TENANT.BILLING.RECEIPTS.CREATE,
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:228',message:'createReceipt API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:232',message:'createReceipt API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Update receipt
 */
export const updateReceipt = async (
  id: number | string,
  data: UpdateReceiptRequest
): Promise<Receipt> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:235',message:'Calling updateReceipt API',data:{id,url:API_ENDPOINTS.TENANT.BILLING.RECEIPTS.UPDATE(id),dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.patch<Receipt>(
      API_ENDPOINTS.TENANT.BILLING.RECEIPTS.UPDATE(id),
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:241',message:'updateReceipt API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:245',message:'updateReceipt API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Delete receipt
 */
export const deleteReceipt = async (id: number | string): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:249',message:'Calling deleteReceipt API',data:{id,url:API_ENDPOINTS.TENANT.BILLING.RECEIPTS.DELETE(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    await apiClient.delete(API_ENDPOINTS.TENANT.BILLING.RECEIPTS.DELETE(id));
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:252',message:'deleteReceipt API success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'billing/api.ts:254',message:'deleteReceipt API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};
