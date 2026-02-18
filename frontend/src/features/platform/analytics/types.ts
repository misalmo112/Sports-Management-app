/**
 * TypeScript types for Platform Analytics feature
 */

export interface PlatformStats {
  academies: {
    total: number;
    active: number;
    onboarded: number;
    recent_30_days: number;
  };
  subscriptions: {
    total: number;
    active: number;
    trial: number;
  };
  usage: {
    total_students: number;
    total_coaches: number;
    total_admins?: number;
    total_classes: number;
    total_storage_bytes: number;
    total_storage_gb: number;
    total_db_bytes?: number;
    total_db_gb?: number;
    platform_db_bytes?: number;
    platform_db_gb?: number;
  };
  per_academy_usage?: Array<{
    academy_id: string;
    academy_name: string;
    academy_slug: string;
    academy_email: string;
    is_active: boolean;
    onboarding_completed: boolean;
    students_count: number;
    coaches_count: number;
    admins_count: number;
    classes_count: number;
    storage_used_bytes: number;
    storage_used_gb: number;
    db_size_bytes?: number;
    db_size_gb?: number;
  }>;
  generated_at: string;
}

export interface ErrorLog {
  id: number;
  request_id: string;
  path: string;
  method: string;
  status_code: number;
  code: string;
  message: string;
  stacktrace?: string | null;
  academy: string | null;
  academy_name: string | null;
  user: number | null;
  user_email: string | null;
  role: string;
  service: string;
  environment: string;
  created_at: string;
}

export interface ErrorLogsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ErrorLog[];
}
