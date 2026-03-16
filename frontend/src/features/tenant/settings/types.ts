/**
 * TypeScript types for Tenant Settings feature
 */

export interface Location {
  id: number;
  academy: number;
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  capacity?: number;
  created_at: string;
  updated_at: string;
}

export interface LocationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Location[];
}

export interface CreateLocationRequest {
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  capacity?: number;
}

export interface UpdateLocationRequest extends Partial<CreateLocationRequest> {}

export interface Sport {
  id: number;
  academy: number;
  name: string;
  description?: string;
  age_min?: number;
  age_max?: number;
  created_at: string;
  updated_at: string;
}

export interface SportListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sport[];
}

export interface CreateSportRequest {
  name: string;
  description?: string;
  age_min?: number;
  age_max?: number;
}

export interface UpdateSportRequest extends Partial<CreateSportRequest> {}

export interface AgeCategory {
  id: number;
  academy: number;
  name: string;
  age_min: number;
  age_max: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AgeCategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AgeCategory[];
}

export interface CreateAgeCategoryRequest {
  name: string;
  age_min: number;
  age_max: number;
  description?: string;
}

export interface UpdateAgeCategoryRequest extends Partial<CreateAgeCategoryRequest> {}

export interface Term {
  id: number;
  academy: number;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TermListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Term[];
}

export interface CreateTermRequest {
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface UpdateTermRequest extends Partial<CreateTermRequest> {}

export interface AcademySettings {
  id: string;
  name: string;
  email: string;
  timezone: string;
  currency: string;
}

export interface UpdateAcademySettingsRequest {
  timezone?: string;
  currency?: string;
}

export type BulkImportDatasetType = 'students' | 'coaches';

export interface BulkImportSchemaColumn {
  name: string;
  required: boolean;
  format: string;
  description: string;
  allowed_values?: string[];
}

export interface BulkImportSchema {
  dataset_type: BulkImportDatasetType;
  label: string;
  columns: BulkImportSchemaColumn[];
  required_columns: string[];
  template_headers: string[];
  sample_row: Record<string, string>;
}

export interface BulkImportRowResult {
  row_number: number;
  status: 'valid' | 'invalid' | 'created' | 'failed';
  normalized_data?: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  record_id?: number | null;
}

export interface BulkImportPreviewResponse {
  preview_token: string;
  dataset_type: BulkImportDatasetType;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  columns_detected: string[];
  unknown_columns: string[];
  row_results: BulkImportRowResult[];
}

export interface BulkImportCommitResponse {
  dataset_type: BulkImportDatasetType;
  created_count: number;
  skipped_count: number;
  failed_count: number;
  created_ids: number[];
  row_results: BulkImportRowResult[];
}
