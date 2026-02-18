/**
 * TanStack Query hooks for Tenant Billing
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBillingItems,
  getBillingItem,
  createBillingItem,
  updateBillingItem,
  deleteBillingItem,
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from '../services/api';
import type {
  BillingItemsListResponse,
  BillingItem,
  CreateBillingItemRequest,
  UpdateBillingItemRequest,
  InvoicesListResponse,
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  ReceiptsListResponse,
  Receipt,
  CreateReceiptRequest,
  UpdateReceiptRequest,
} from '../types';

/**
 * Hook for fetching billing items list
 */
export const useBillingItems = (params?: {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<BillingItemsListResponse, Error>({
    queryKey: ['billing-items', 'list', params],
    queryFn: () => getBillingItems(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single billing item
 */
export const useBillingItem = (id: number | string | undefined) => {
  return useQuery<BillingItem, Error>({
    queryKey: ['billing-items', 'detail', id],
    queryFn: () => getBillingItem(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating a billing item
 */
export const useCreateBillingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<BillingItem, Error, CreateBillingItemRequest>({
    mutationFn: createBillingItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-items', 'list'] });
    },
  });
};

/**
 * Hook for updating a billing item
 */
export const useUpdateBillingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BillingItem,
    Error,
    { id: number | string; data: UpdateBillingItemRequest }
  >({
    mutationFn: ({ id, data }) => updateBillingItem(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing-items', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['billing-items', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting a billing item
 */
export const useDeleteBillingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteBillingItem,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['billing-items', 'list'] });
      queryClient.removeQueries({ queryKey: ['billing-items', 'detail', id] });
    },
  });
};

/**
 * Hook for fetching invoices list
 */
export const useInvoices = (params?: {
  parent?: number;
  status?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<InvoicesListResponse, Error>({
    queryKey: ['invoices', 'list', params],
    queryFn: () => getInvoices(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single invoice
 */
export const useInvoice = (id: number | string | undefined) => {
  return useQuery<Invoice, Error>({
    queryKey: ['invoices', 'detail', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating an invoice
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, CreateInvoiceRequest>({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
    },
  });
};

/**
 * Hook for updating an invoice
 */
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Invoice,
    Error,
    { id: number | string; data: UpdateInvoiceRequest }
  >({
    mutationFn: ({ id, data }) => updateInvoice(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['invoices', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting an invoice
 */
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteInvoice,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      queryClient.removeQueries({ queryKey: ['invoices', 'detail', id] });
    },
  });
};

/**
 * Hook for fetching receipts list
 */
export const useReceipts = (params?: {
  invoice?: number;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<ReceiptsListResponse, Error>({
    queryKey: ['receipts', 'list', params],
    queryFn: () => getReceipts(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single receipt
 */
export const useReceipt = (id: number | string | undefined) => {
  return useQuery<Receipt, Error>({
    queryKey: ['receipts', 'detail', id],
    queryFn: () => getReceipt(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating a receipt
 */
export const useCreateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation<Receipt, Error, CreateReceiptRequest>({
    mutationFn: createReceipt,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receipts', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['invoices', 'detail', data.invoice],
      });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
    },
  });
};

/**
 * Hook for updating a receipt
 */
export const useUpdateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Receipt,
    Error,
    { id: number | string; data: UpdateReceiptRequest }
  >({
    mutationFn: ({ id, data }) => updateReceipt(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['receipts', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['receipts', 'detail', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['invoices', 'detail', data.invoice],
      });
    },
  });
};

/**
 * Hook for deleting a receipt
 */
export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteReceipt,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['receipts', 'list'] });
      queryClient.removeQueries({ queryKey: ['receipts', 'detail', id] });
    },
  });
};
