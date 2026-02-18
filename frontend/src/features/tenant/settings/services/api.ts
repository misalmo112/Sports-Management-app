/**
 * API service functions for Tenant Settings
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
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
} from '../types';

// ==================== Locations ====================

export const getLocations = async (
  params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<LocationListResponse> => {
  const queryParams = new URLSearchParams();
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
    ? `${API_ENDPOINTS.TENANT.SETTINGS.LOCATIONS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.SETTINGS.LOCATIONS.LIST;

  const response = await apiClient.get<LocationListResponse>(url);
  return response.data;
};

export const getLocation = async (id: number | string): Promise<Location> => {
  const response = await apiClient.get<Location>(
    API_ENDPOINTS.TENANT.SETTINGS.LOCATIONS.DETAIL(id)
  );
  return response.data;
};

export const createLocation = async (
  data: CreateLocationRequest
): Promise<Location> => {
  const response = await apiClient.post<Location>(
    API_ENDPOINTS.TENANT.SETTINGS.LOCATIONS.CREATE,
    data
  );
  return response.data;
};

export const updateLocation = async (
  id: number | string,
  data: UpdateLocationRequest
): Promise<Location> => {
  const response = await apiClient.patch<Location>(
    API_ENDPOINTS.TENANT.SETTINGS.LOCATIONS.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteLocation = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.SETTINGS.LOCATIONS.DELETE(id));
};

// ==================== Sports ====================

export const getSports = async (
  params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<SportListResponse> => {
  const queryParams = new URLSearchParams();
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
    ? `${API_ENDPOINTS.TENANT.SETTINGS.SPORTS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.SETTINGS.SPORTS.LIST;

  const response = await apiClient.get<SportListResponse>(url);
  return response.data;
};

export const getSport = async (id: number | string): Promise<Sport> => {
  const response = await apiClient.get<Sport>(
    API_ENDPOINTS.TENANT.SETTINGS.SPORTS.DETAIL(id)
  );
  return response.data;
};

export const createSport = async (
  data: CreateSportRequest
): Promise<Sport> => {
  const response = await apiClient.post<Sport>(
    API_ENDPOINTS.TENANT.SETTINGS.SPORTS.CREATE,
    data
  );
  return response.data;
};

export const updateSport = async (
  id: number | string,
  data: UpdateSportRequest
): Promise<Sport> => {
  const response = await apiClient.patch<Sport>(
    API_ENDPOINTS.TENANT.SETTINGS.SPORTS.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteSport = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.SETTINGS.SPORTS.DELETE(id));
};

// ==================== Age Categories ====================

export const getAgeCategories = async (
  params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<AgeCategoryListResponse> => {
  const queryParams = new URLSearchParams();
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
    ? `${API_ENDPOINTS.TENANT.SETTINGS.AGE_CATEGORIES.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.SETTINGS.AGE_CATEGORIES.LIST;

  const response = await apiClient.get<AgeCategoryListResponse>(url);
  return response.data;
};

export const getAgeCategory = async (
  id: number | string
): Promise<AgeCategory> => {
  const response = await apiClient.get<AgeCategory>(
    API_ENDPOINTS.TENANT.SETTINGS.AGE_CATEGORIES.DETAIL(id)
  );
  return response.data;
};

export const createAgeCategory = async (
  data: CreateAgeCategoryRequest
): Promise<AgeCategory> => {
  const response = await apiClient.post<AgeCategory>(
    API_ENDPOINTS.TENANT.SETTINGS.AGE_CATEGORIES.CREATE,
    data
  );
  return response.data;
};

export const updateAgeCategory = async (
  id: number | string,
  data: UpdateAgeCategoryRequest
): Promise<AgeCategory> => {
  const response = await apiClient.patch<AgeCategory>(
    API_ENDPOINTS.TENANT.SETTINGS.AGE_CATEGORIES.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteAgeCategory = async (
  id: number | string
): Promise<void> => {
  await apiClient.delete(
    API_ENDPOINTS.TENANT.SETTINGS.AGE_CATEGORIES.DELETE(id)
  );
};

// ==================== Terms ====================

export const getTerms = async (
  params?: {
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<TermListResponse> => {
  const queryParams = new URLSearchParams();
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
    ? `${API_ENDPOINTS.TENANT.SETTINGS.TERMS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.SETTINGS.TERMS.LIST;

  const response = await apiClient.get<TermListResponse>(url);
  return response.data;
};

export const getTerm = async (id: number | string): Promise<Term> => {
  const response = await apiClient.get<Term>(
    API_ENDPOINTS.TENANT.SETTINGS.TERMS.DETAIL(id)
  );
  return response.data;
};

export const createTerm = async (data: CreateTermRequest): Promise<Term> => {
  const response = await apiClient.post<Term>(
    API_ENDPOINTS.TENANT.SETTINGS.TERMS.CREATE,
    data
  );
  return response.data;
};

export const updateTerm = async (
  id: number | string,
  data: UpdateTermRequest
): Promise<Term> => {
  const response = await apiClient.patch<Term>(
    API_ENDPOINTS.TENANT.SETTINGS.TERMS.UPDATE(id),
    data
  );
  return response.data;
};

export const deleteTerm = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.SETTINGS.TERMS.DELETE(id));
};

// ==================== Academy Settings ====================

export const getAcademySettings = async (): Promise<AcademySettings> => {
  const response = await apiClient.get<AcademySettings>(
    API_ENDPOINTS.TENANT.ACADEMY.DETAIL
  );
  return response.data;
};

export const updateAcademySettings = async (
  data: UpdateAcademySettingsRequest
): Promise<AcademySettings> => {
  const response = await apiClient.patch<AcademySettings>(
    API_ENDPOINTS.TENANT.ACADEMY.UPDATE,
    data
  );
  return response.data;
};
