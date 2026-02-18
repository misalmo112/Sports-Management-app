/**
 * TanStack Query hooks for Tenant Coaches
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoaches,
  getCoach,
  createCoach,
  updateCoach,
  deleteCoach,
  getCoachPaySchemes,
  getCoachPayScheme,
  createCoachPayScheme,
  updateCoachPayScheme,
  deleteCoachPayScheme,
  getCoachPayments,
  createCoachPayment,
  getStaffInvoices,
  createStaffInvoice,
  updateStaffInvoice,
  deleteStaffInvoice,
  getStaffReceipts,
} from '../services/api';
import type {
  CoachesListResponse,
  Coach,
  CreateCoachRequest,
  UpdateCoachRequest,
  CoachPayScheme,
  CoachPaySchemeListResponse,
  CreateCoachPaySchemeRequest,
  UpdateCoachPaySchemeRequest,
  CoachPaymentListResponse,
  CreateCoachPaymentRequest,
  StaffInvoiceListResponse,
  CreateStaffInvoiceRequest,
  UpdateStaffInvoiceRequest,
  StaffReceiptListResponse,
} from '../services/api';

/**
 * Hook for fetching coaches list
 */
export const useCoaches = (params?: {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<CoachesListResponse, Error>({
    queryKey: ['coaches', 'list', params],
    queryFn: () => getCoaches(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single coach
 */
export const useCoach = (id: number | string | undefined) => {
  return useQuery<Coach, Error>({
    queryKey: ['coaches', 'detail', id],
    queryFn: () => getCoach(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating a coach
 */
export const useCreateCoach = () => {
  const queryClient = useQueryClient();
  return useMutation<Coach, Error, CreateCoachRequest>({
    mutationFn: createCoach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
  });
};

/**
 * Hook for updating a coach
 */
export const useUpdateCoach = () => {
  const queryClient = useQueryClient();
  return useMutation<Coach, Error, { id: number | string; data: UpdateCoachRequest }>({
    mutationFn: ({ id, data }) => updateCoach(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      queryClient.invalidateQueries({ queryKey: ['coaches', 'detail', variables.id] });
    },
  });
};

/**
 * Hook for deleting a coach
 */
export const useDeleteCoach = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number | string>({
    mutationFn: deleteCoach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
  });
};

// --- Coach Pay Schemes ---

export const useCoachPaySchemes = (params?: {
  coach?: number;
  period_type?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<CoachPaySchemeListResponse, Error>({
    queryKey: ['coach-pay-schemes', 'list', params],
    queryFn: () => getCoachPaySchemes(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCoachPayScheme = (id: number | string | undefined) => {
  return useQuery<CoachPayScheme, Error>({
    queryKey: ['coach-pay-schemes', 'detail', id],
    queryFn: () => getCoachPayScheme(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateCoachPayScheme = () => {
  const queryClient = useQueryClient();
  return useMutation<CoachPayScheme, Error, CreateCoachPaySchemeRequest>({
    mutationFn: createCoachPayScheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-pay-schemes'] });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
  });
};

export const useUpdateCoachPayScheme = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CoachPayScheme,
    Error,
    { id: number | string; data: UpdateCoachPaySchemeRequest }
  >({
    mutationFn: ({ id, data }) => updateCoachPayScheme(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coach-pay-schemes'] });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      queryClient.invalidateQueries({
        queryKey: ['coach-pay-schemes', 'detail', variables.id],
      });
    },
  });
};

export const useDeleteCoachPayScheme = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number | string>({
    mutationFn: deleteCoachPayScheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-pay-schemes'] });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
  });
};

// --- Coach Payments ---

export const useCoachPayments = (params?: {
  coach?: number;
  period_type?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<CoachPaymentListResponse, Error>({
    queryKey: ['coach-payments', params],
    queryFn: () => getCoachPayments(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateCoachPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCoachPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-payments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['staff-invoices'] });
    },
  });
};

// --- Staff Invoices ---

export const useStaffInvoices = (params?: {
  coach?: number;
  status?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<StaffInvoiceListResponse, Error>({
    queryKey: ['staff-invoices', params],
    queryFn: () => getStaffInvoices(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateStaffInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStaffInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invoices'] });
    },
  });
};

export const useUpdateStaffInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateStaffInvoiceRequest }) =>
      updateStaffInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invoices'] });
    },
  });
};

export const useDeleteStaffInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStaffInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invoices'] });
    },
  });
};

// --- Staff Receipts ---

export const useStaffReceipts = (params?: {
  coach?: number;
  payment_date?: string;
  payment_method?: string;
  staff_invoice?: number;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<StaffReceiptListResponse, Error>({
    queryKey: ['staff-receipts', params],
    queryFn: () => getStaffReceipts(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
