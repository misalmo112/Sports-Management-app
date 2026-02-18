/**
 * TanStack Query hooks for Tenant Facilities
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addRentInvoicePayment,
  adjustInventoryItemQuantity,
  createBill,
  createBillLineItem,
  createInventoryItem,
  createRentConfig,
  createRentInvoice,
  deleteBill,
  deleteBillLineItem,
  deleteInventoryItem,
  deleteRentConfig,
  deleteRentInvoice,
  getBills,
  getBillLineItems,
  getInventoryItems,
  getRentConfigs,
  getRentInvoices,
  getRentReceipts,
  markBillPaid,
  markRentInvoicePaid,
  updateBill,
  updateBillLineItem,
  updateInventoryItem,
  updateRentConfig,
  updateRentInvoice,
} from '../services/api';
import type {
  AddRentPaymentRequest,
  AdjustInventoryQuantityRequest,
  CreateBillLineItemRequest,
  CreateBillRequest,
  CreateFacilityRentConfigRequest,
  CreateInventoryItemRequest,
  CreateRentInvoiceRequest,
  MarkRentInvoicePaidRequest,
  UpdateBillLineItemRequest,
  UpdateBillRequest,
  UpdateFacilityRentConfigRequest,
  UpdateInventoryItemRequest,
  UpdateRentInvoiceRequest,
} from '../types';

export const useRentConfigs = (params?: {
  location?: number;
  period_type?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ['facilities', 'rent-configs', params],
    queryFn: () => getRentConfigs(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateRentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFacilityRentConfigRequest) => createRentConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-configs'] });
    },
  });
};

export const useUpdateRentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateFacilityRentConfigRequest }) =>
      updateRentConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-configs'] });
    },
  });
};

export const useDeleteRentConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteRentConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-configs'] });
    },
  });
};

export const useRentInvoices = (params?: {
  status?: string;
  location?: number;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ['facilities', 'rent-invoices', params],
    queryFn: () => getRentInvoices(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateRentInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRentInvoiceRequest) => createRentInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-invoices'] });
    },
  });
};

export const useUpdateRentInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateRentInvoiceRequest }) =>
      updateRentInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-invoices'] });
    },
  });
};

export const useDeleteRentInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteRentInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-invoices'] });
    },
  });
};

export const useAddRentInvoicePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AddRentPaymentRequest }) =>
      addRentInvoicePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-receipts'] });
    },
  });
};

export const useMarkRentInvoicePaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data?: MarkRentInvoicePaidRequest }) =>
      markRentInvoicePaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'rent-receipts'] });
    },
  });
};

export const useRentReceipts = (params?: {
  rent_invoice?: number;
  payment_date?: string;
  payment_method?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ['facilities', 'rent-receipts', params],
    queryFn: () => getRentReceipts(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useBills = (params?: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ['facilities', 'bills', params],
    queryFn: () => getBills(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBillRequest) => createBill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bills'] });
    },
  });
};

export const useUpdateBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateBillRequest }) => updateBill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bills'] });
    },
  });
};

export const useDeleteBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bills'] });
    },
  });
};

export const useMarkBillPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => markBillPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bills'] });
    },
  });
};

export const useBillLineItems = (
  params?: { bill?: number; page?: number; page_size?: number },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['facilities', 'bill-line-items', params],
    queryFn: () => getBillLineItems(params),
    enabled: options?.enabled ?? true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateBillLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBillLineItemRequest) => createBillLineItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bill-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bills'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'inventory-items'] });
    },
  });
};

export const useUpdateBillLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateBillLineItemRequest }) =>
      updateBillLineItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bill-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bills'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'inventory-items'] });
    },
  });
};

export const useDeleteBillLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteBillLineItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bill-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'bills'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'inventory-items'] });
    },
  });
};

export const useInventoryItems = (params?: {
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ['facilities', 'inventory-items', params],
    queryFn: () => getInventoryItems(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInventoryItemRequest) => createInventoryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'inventory-items'] });
    },
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateInventoryItemRequest }) =>
      updateInventoryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'inventory-items'] });
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'inventory-items'] });
    },
  });
};

export const useAdjustInventoryQuantity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AdjustInventoryQuantityRequest }) =>
      adjustInventoryItemQuantity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', 'inventory-items'] });
    },
  });
};

