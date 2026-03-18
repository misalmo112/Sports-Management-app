/**
 * TypeScript types for Platform Academies feature
 */

export interface Academy {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  onboarding_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  primary_admin?: {
    email: string;
    is_active: boolean;
    is_verified?: boolean;
  } | null;
  current_subscription?: AcademySubscription | null;
  quota?: AcademyQuota | null;
  usage?: {
    storage_used_bytes: number;
    storage_used_gb: number;
    db_size_bytes: number;
    db_size_gb: number;
    total_used_bytes: number;
    total_used_gb: number;
    students_count: number;
    coaches_count: number;
    admins_count: number;
    classes_count: number;
    counts_computed_at?: string | null;
  } | null;
}

export interface AcademySubscription {
  id: number;
  academy: string;
  academy_name: string;
  plan: number;
  plan_name: string;
  status: string;
  is_current: boolean;
  start_at: string;
  end_at?: string | null;
  trial_ends_at?: string | null;
  overrides_json?: Record<string, number>;
  canceled_at?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademyQuota {
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

export interface AcademiesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Academy[];
}

export interface CreateAcademyRequest {
  name: string;
  slug: string;
  email: string;
  phone: string;
  website?: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  owner_email: string;
  /** Subscription plan ID (optional; backend defaults to first active plan if omitted). */
  plan_id?: number | null;
}

export interface UpdateAcademyRequest {
  name?: string;
  slug?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  is_active?: boolean;
}

export interface UpdateAcademyPlanRequest {
  plan_id: number;
  start_at?: string;
  overrides_json?: Record<string, number>;
}

export interface UpdateAcademyQuotaRequest {
  overrides_json: {
    storage_bytes?: number;
    max_students?: number;
    max_coaches?: number;
    max_admins?: number;
    max_classes?: number;
  };
}

export interface AcademyInviteLinkResponse {
  invite_url: string;
  email: string;
  role: string;
  expires_in_hours: number;
}

export interface AcademyInviteLinkRequest {
  email?: string;
  force?: boolean;
}
