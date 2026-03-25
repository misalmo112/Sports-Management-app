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
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone: string;
  currency: string;
}

export interface UpdateAcademySettingsRequest extends Partial<Omit<AcademySettings, 'id'>> {}

export interface AcademyTaxSettings {
  global_tax_enabled: boolean;
  global_tax_rate_percent: string; // DRF Decimal serialization
}

export interface UpdateAcademyTaxSettingsRequest {
  global_tax_enabled?: boolean;
  global_tax_rate_percent?: number;
}

export interface ParentProfileSelfService {
  phone: string;
}

export interface ParentRecordSnapshot {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_numbers: unknown[];
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_active: boolean;
}

export interface CurrentAccount {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  allowed_modules?: string[] | null;
  is_active: boolean;
  last_login?: string | null;
  /** Present for PARENT role on GET / PATCH account */
  parent_profile?: ParentProfileSelfService;
  parent_record?: ParentRecordSnapshot | null;
}

export interface UpdateCurrentAccountRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  parent_profile?: Partial<ParentProfileSelfService>;
  parent_record?: Partial<
    Pick<
      ParentRecordSnapshot,
      | 'phone'
      | 'phone_numbers'
      | 'address_line1'
      | 'address_line2'
      | 'city'
      | 'state'
      | 'postal_code'
      | 'country'
    >
  >;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface ChangePasswordResponse {
  detail: string;
}

export interface PlanDetails {
  id: number;
  name: string;
  slug: string;
  description: string;
  price_monthly: string | null;
  price_yearly: string | null;
  currency: string;
  trial_days: number;
  seat_based_pricing: boolean;
}

export interface CurrentSubscription {
  id: number;
  academy: string;
  academy_name: string;
  plan: number;
  plan_name: string;
  status: string;
  is_current: boolean;
  start_at: string;
  end_at: string | null;
  trial_ends_at: string | null;
  overrides_json: Record<string, number>;
  canceled_at: string | null;
  cancel_reason: string;
  created_at: string;
  updated_at: string;
  plan_details: PlanDetails;
}

export interface AcademySubscriptionSummary {
  academy_id: string;
  academy_name: string;
  current_subscription: CurrentSubscription | null;
}

export interface TenantQuotaSummary {
  id: number;
  academy_id: string;
  academy_name: string;
  storage_bytes_limit: number;
  max_students: number;
  max_coaches: number;
  max_admins: number;
  max_classes: number;
  created_at: string;
  updated_at: string;
}

export interface TenantUsageSummaryValues {
  storage_used_bytes: number;
  storage_used_gb: number;
  db_size_bytes: number;
  db_size_gb: number;
  total_used_bytes: number;
  total_used_gb: number;
  storage_status: 'unlimited' | 'ok' | 'warning' | 'exceeded';
  storage_usage_pct: number;
  storage_warning_threshold_pct: number;
  students_count: number;
  coaches_count: number;
  admins_count: number;
  classes_count: number;
  counts_computed_at: string | null;
}

export interface AcademyUsageSummary {
  academy_id: string;
  academy_name: string;
  quota: TenantQuotaSummary | null;
  usage: TenantUsageSummaryValues;
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
