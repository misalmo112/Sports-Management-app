export interface TenantAuditLog {
  id: number;
  user: number | null;
  user_email: string | null;
  action: string;
  action_display: string;
  resource_type: string;
  resource_type_display: string;
  resource_id: string;
  academy: string;
  academy_name: string;
  changes_json: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string;
  scope: string;
  created_at: string;
}

export interface TenantAuditLogsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TenantAuditLog[];
}

export interface TenantAuditLogFilters {
  action?: string;
  resource_type?: string;
  user_email?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
}
