export type StaffPayScheduleBillingType = 'SESSION' | 'MONTHLY' | 'WEEKLY';
export type StaffPayScheduleRunStatus = 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
export type StaffPayScheduleTriggerSource = 'SCHEDULED' | 'MANUAL';
export type CoachPaySchemePeriodType = 'SESSION' | 'MONTH' | 'WEEK';
export type StaffInvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED';

export interface StaffPaySchedule {
  id: number;
  academy: number;
  coach: number;
  billing_type: StaffPayScheduleBillingType;
  amount: string;
  sessions_per_cycle?: number | null;
  class_scope?: number | null;
  billing_day?: number | null;
  billing_day_of_week?: number | null;
  cycle_start_date: string;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffPaySchedulesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StaffPaySchedule[];
}

export interface CreateStaffPayScheduleRequest {
  coach: number;
  billing_type: StaffPayScheduleBillingType;
  amount: number | string;
  sessions_per_cycle?: number | null;
  class_scope?: number | null;
  billing_day?: number | null;
  billing_day_of_week?: number | null;
  cycle_start_date: string;
  is_active?: boolean;
}

export interface UpdateStaffPayScheduleRequest extends Partial<CreateStaffPayScheduleRequest> {}

export interface StaffPayScheduleFormData {
  coach?: number;
  billing_type: StaffPayScheduleBillingType;
  amount?: number | null;
  sessions_per_cycle?: number | null;
  class_scope?: number | null;
  billing_day?: number | null;
  billing_day_of_week?: number | null;
  cycle_start_date?: string;
  is_active?: boolean;
}

export interface StaffPayScheduleRun {
  id: number;
  schedule: number;
  run_at: string;
  invoices_created: number;
  status: StaffPayScheduleRunStatus;
  triggered_by: StaffPayScheduleTriggerSource;
  error_detail: string;
}

export interface StaffPayScheduleRunsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StaffPayScheduleRun[];
}

export interface ManualRunResponse {
  invoices_created: number;
  status: StaffPayScheduleRunStatus;
  run_at: string;
}

export interface PendingStaffApprovalCoachSummary {
  id: number;
  full_name: string;
}

export interface PendingStaffApprovalScheduleSummary {
  id: number;
  billing_type: StaffPayScheduleBillingType;
  next_run_at?: string | null;
}

export interface PendingStaffApprovalInvoice {
  id: number;
  academy: number;
  coach: PendingStaffApprovalCoachSummary;
  schedule: PendingStaffApprovalScheduleSummary;
  invoice_number: string;
  amount: string;
  currency: string;
  period_description: string;
  period_type: CoachPaySchemePeriodType;
  status: StaffInvoiceStatus;
  issued_date?: string | null;
  due_date?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingStaffApprovalsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PendingStaffApprovalInvoice[];
}

export interface BulkIssuePendingStaffApprovalsRequest {
  invoice_ids: number[];
}

export interface BulkIssuePendingStaffApprovalsResponse {
  issued_count: number;
  invoice_ids: number[];
}
