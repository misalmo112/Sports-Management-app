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
  changes_json?: Record<string, unknown>;
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

export type ErrorLogSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

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
  severity: ErrorLogSeverity;
  is_resolved: boolean;
  resolved_by: number | null;
  resolved_by_email: string | null;
  resolved_at: string | null;
  occurrence_count: number;
  last_seen_at: string | null;
}

export interface ErrorLogsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ErrorLog[];
}

export interface ErrorLogSummary {
  critical_unresolved: number;
  high_unresolved: number;
  total_last_24h: number;
  most_affected_academy: {
    id: string;
    name: string;
    count: number;
  } | null;
}
