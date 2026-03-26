/**
 * TanStack Query hooks for Platform Academies
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAcademies,
  getAcademy,
  createAcademy,
  updateAcademy,
  updateAcademyPlan,
  updateAcademyQuota,
  generateAcademyInviteLink,
  deleteAcademy,
  exportAcademy,
  getAcademyWhatsappConfig,
  updateAcademyWhatsappConfig,
  testSendAcademyWhatsapp,
  getAcademyNotificationLogs,
} from '../services/api';
import type {
  AcademiesListResponse,
  Academy,
  AcademyQuota,
  AcademySubscription,
  CreateAcademyRequest,
  AcademyWhatsAppConfig,
  AcademyWhatsAppConfigUpdateRequest,
  UpdateAcademyRequest,
  UpdateAcademyPlanRequest,
  UpdateAcademyQuotaRequest,
  AcademyInviteLinkResponse,
  AcademyInviteLinkRequest,
  NotificationChannel,
  NotificationDocType,
  NotificationLogsListResponse,
  NotificationStatus,
  WhatsAppTestSendRequest,
  WhatsappTestSendResponse,
} from '../types';

/**
 * Hook for fetching academies list
 */
export const useAcademies = (params?: {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<AcademiesListResponse, Error>({
    queryKey: ['academies', 'list', params],
    queryFn: () => getAcademies(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single academy
 */
export const useAcademy = (id: number | string | undefined) => {
  return useQuery<Academy, Error>({
    queryKey: ['academies', 'detail', id],
    queryFn: () => getAcademy(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for creating an academy
 */
export const useCreateAcademy = () => {
  const queryClient = useQueryClient();

  return useMutation<Academy, Error, CreateAcademyRequest>({
    mutationFn: createAcademy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academies', 'list'] });
    },
  });
};

/**
 * Hook for updating an academy
 */
export const useUpdateAcademy = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Academy,
    Error,
    { id: number | string; data: UpdateAcademyRequest }
  >({
    mutationFn: ({ id, data }) => updateAcademy(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academies', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['academies', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for updating academy plan
 */
export const useUpdateAcademyPlan = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AcademySubscription,
    Error,
    { id: number | string; data: UpdateAcademyPlanRequest }
  >({
    mutationFn: ({ id, data }) => updateAcademyPlan(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academies', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['academies', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for updating academy quota
 */
export const useUpdateAcademyQuota = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AcademyQuota,
    Error,
    { id: number | string; data: UpdateAcademyQuotaRequest }
  >({
    mutationFn: ({ id, data }) => updateAcademyQuota(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academies', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['academies', 'detail', variables.id],
      });
    },
  });
};

/**
 * Hook for deleting an academy
 */
export const useDeleteAcademy = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteAcademy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academies', 'list'] });
    },
  });
};

/**
 * Hook for exporting academy data as ZIP (triggers download)
 */
export const useExportAcademy = () => {
  return useMutation<void, Error, string>({
    mutationFn: exportAcademy,
  });
};

/**
 * Hook for generating an academy invite link
 */
export const useAcademyInviteLink = () => {
  return useMutation<
    AcademyInviteLinkResponse,
    Error,
    { id: number | string; data?: AcademyInviteLinkRequest }
  >(
    {
      mutationFn: ({ id, data }) => generateAcademyInviteLink(id, data),
    }
  );
};

/**
 * Hook for fetching academy WhatsApp config.
 * Returns null if config does not exist (API returns 404).
 */
export const useAcademyWhatsappConfig = (id: number | string | undefined) => {
  return useQuery<AcademyWhatsAppConfig | null, Error>({
    queryKey: ['academies', 'whatsapp-config', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        return await getAcademyWhatsappConfig(id);
      } catch (err: any) {
        const statusCode = err?.response?.status;
        if (statusCode === 404) return null;
        throw err;
      }
    },
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateAcademyWhatsappConfig = (id: number | string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation<AcademyWhatsAppConfig, Error, AcademyWhatsAppConfigUpdateRequest>({
    mutationFn: (data) => {
      if (!id) throw new Error('Missing academy id');
      return updateAcademyWhatsappConfig(id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academies', 'whatsapp-config', id] });
    },
  });
};

export const useTestSendAcademyWhatsapp = (id: number | string | undefined) => {
  return useMutation<WhatsappTestSendResponse, Error, WhatsAppTestSendRequest>({
    mutationFn: (data) => {
      if (!id) throw new Error('Missing academy id');
      return testSendAcademyWhatsapp(id, data);
    },
  });
};

export const useAcademyNotificationLogs = (
  id: number | string | undefined,
  params?: {
    channel?: NotificationChannel;
    status?: NotificationStatus;
    doc_type?: NotificationDocType;
    page?: number;
  },
) => {
  return useQuery<NotificationLogsListResponse, Error>({
    queryKey: ['academies', 'notification-logs', id, params],
    queryFn: () => {
      if (!id) {
        throw new Error('Missing academy id');
      }
      return getAcademyNotificationLogs(id, params);
    },
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
