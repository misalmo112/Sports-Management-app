/**
 * TypeScript types for Platform Audit feature
 */

export interface AuditLog {
  id: number;
  user: number;
  user_email: string;
  action: string;
  action_display: string;
  resource_type: string;
  resource_type_display: string;
  resource_id: string;
  academy: string;
  academy_name: string;
  changes_json?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLog[];
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
