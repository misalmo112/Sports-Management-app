/**
 * TanStack Query hooks for Tenant Settings
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  getSports,
  getSport,
  createSport,
  updateSport,
  deleteSport,
  getAgeCategories,
  getAgeCategory,
  createAgeCategory,
  updateAgeCategory,
  deleteAgeCategory,
  getTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
  getAcademySettings,
  updateAcademySettings,
  getCurrentAccount,
  updateCurrentAccount,
  changePassword,
  getAcademySubscription,
  getAcademyUsage,
  getBulkImportSchema,
} from '../services/api';
import type {
  Location,
  LocationListResponse,
  CreateLocationRequest,
  UpdateLocationRequest,
  Sport,
  SportListResponse,
  CreateSportRequest,
  UpdateSportRequest,
  AgeCategory,
  AgeCategoryListResponse,
  CreateAgeCategoryRequest,
  UpdateAgeCategoryRequest,
  Term,
  TermListResponse,
  CreateTermRequest,
  UpdateTermRequest,
  AcademySettings,
  UpdateAcademySettingsRequest,
  CurrentAccount,
  UpdateCurrentAccountRequest,
  ChangePasswordRequest,
  ChangePasswordResponse,
  AcademySubscriptionSummary,
  AcademyUsageSummary,
  BulkImportDatasetType,
  BulkImportSchema,
} from '../types';

// ==================== Locations ====================

export const useLocations = (params?: {
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<LocationListResponse, Error>({
    queryKey: ['locations', 'list', params],
    queryFn: () => getLocations(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useLocation = (id: number | string | undefined) => {
  return useQuery<Location, Error>({
    queryKey: ['locations', 'detail', id],
    queryFn: () => getLocation(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation<Location, Error, CreateLocationRequest>({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', 'list'] });
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Location,
    Error,
    { id: number | string; data: UpdateLocationRequest }
  >({
    mutationFn: ({ id, data }) => updateLocation(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['locations', 'detail', variables.id],
      });
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', 'list'] });
    },
  });
};

// ==================== Sports ====================

export const useSports = (params?: {
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<SportListResponse, Error>({
    queryKey: ['sports', 'list', params],
    queryFn: () => getSports(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useSport = (id: number | string | undefined) => {
  return useQuery<Sport, Error>({
    queryKey: ['sports', 'detail', id],
    queryFn: () => getSport(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateSport = () => {
  const queryClient = useQueryClient();

  return useMutation<Sport, Error, CreateSportRequest>({
    mutationFn: createSport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports', 'list'] });
    },
  });
};

export const useUpdateSport = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Sport,
    Error,
    { id: number | string; data: UpdateSportRequest }
  >({
    mutationFn: ({ id, data }) => updateSport(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sports', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['sports', 'detail', variables.id],
      });
    },
  });
};

export const useDeleteSport = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteSport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports', 'list'] });
    },
  });
};

// ==================== Age Categories ====================

export const useAgeCategories = (params?: {
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<AgeCategoryListResponse, Error>({
    queryKey: ['age-categories', 'list', params],
    queryFn: () => getAgeCategories(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useAgeCategory = (id: number | string | undefined) => {
  return useQuery<AgeCategory, Error>({
    queryKey: ['age-categories', 'detail', id],
    queryFn: () => getAgeCategory(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateAgeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<AgeCategory, Error, CreateAgeCategoryRequest>({
    mutationFn: createAgeCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['age-categories', 'list'] });
    },
  });
};

export const useUpdateAgeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AgeCategory,
    Error,
    { id: number | string; data: UpdateAgeCategoryRequest }
  >({
    mutationFn: ({ id, data }) => updateAgeCategory(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['age-categories', 'list'],
      });
      queryClient.invalidateQueries({
        queryKey: ['age-categories', 'detail', variables.id],
      });
    },
  });
};

export const useDeleteAgeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteAgeCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['age-categories', 'list'] });
    },
  });
};

// ==================== Terms ====================

export const useTerms = (params?: {
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<TermListResponse, Error>({
    queryKey: ['terms', 'list', params],
    queryFn: () => getTerms(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useTerm = (id: number | string | undefined) => {
  return useQuery<Term, Error>({
    queryKey: ['terms', 'detail', id],
    queryFn: () => getTerm(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateTerm = () => {
  const queryClient = useQueryClient();

  return useMutation<Term, Error, CreateTermRequest>({
    mutationFn: createTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', 'list'] });
    },
  });
};

export const useUpdateTerm = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Term,
    Error,
    { id: number | string; data: UpdateTermRequest }
  >({
    mutationFn: ({ id, data }) => updateTerm(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['terms', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['terms', 'detail', variables.id],
      });
    },
  });
};

export const useDeleteTerm = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: deleteTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', 'list'] });
    },
  });
};

// ==================== Academy Settings ====================

export const useCurrentAccount = (options?: { enabled?: boolean }) => {
  return useQuery<CurrentAccount, Error>({
    queryKey: ['current-account'],
    queryFn: getCurrentAccount,
    enabled: options?.enabled ?? true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateCurrentAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<CurrentAccount, Error, UpdateCurrentAccountRequest>({
    mutationFn: updateCurrentAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-account'] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation<ChangePasswordResponse, Error, ChangePasswordRequest>({
    mutationFn: changePassword,
  });
};

export const useAcademySettings = (options?: { enabled?: boolean }) => {
  return useQuery<AcademySettings, Error>({
    queryKey: ['academy-settings'],
    queryFn: getAcademySettings,
    enabled: options?.enabled ?? true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateAcademySettings = () => {
  const queryClient = useQueryClient();

  return useMutation<AcademySettings, Error, UpdateAcademySettingsRequest>({
    mutationFn: updateAcademySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-settings'] });
    },
  });
};

export const useAcademySubscription = (options?: { enabled?: boolean }) => {
  return useQuery<AcademySubscriptionSummary, Error>({
    queryKey: ['academy-subscription'],
    queryFn: getAcademySubscription,
    enabled: options?.enabled ?? true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useAcademyUsage = (options?: { enabled?: boolean }) => {
  return useQuery<AcademyUsageSummary, Error>({
    queryKey: ['academy-usage'],
    queryFn: getAcademyUsage,
    enabled: options?.enabled ?? true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

// ==================== Bulk Imports ====================

export const useBulkImportSchema = (
  datasetType: BulkImportDatasetType
) => {
  return useQuery<BulkImportSchema, Error>({
    queryKey: ['bulk-import-schema', datasetType],
    queryFn: () => getBulkImportSchema(datasetType),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
