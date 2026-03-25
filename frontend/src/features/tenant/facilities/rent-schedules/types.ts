export type RentPayScheduleBillingType = 'SESSION' | 'MONTHLY' | 'DAILY';
export type RentPayScheduleRunStatus = 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
export type RentPayScheduleTriggerSource = 'SCHEDULED' | 'MANUAL';

export interface RentPaySchedule {
  id: number;
  academy: number;
  location: number;
  location_name: string;
  billing_type: RentPayScheduleBillingType;
  amount: string;
  currency: string;
  sessions_per_invoice?: number | null;
  billing_day?: number | null;
  due_date_offset_days: number;
  cycle_start_date: string;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentPaySchedulesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RentPaySchedule[];
}

export interface CreateRentPayScheduleRequest {
  location: number;
  billing_type: RentPayScheduleBillingType;
  amount: number | string;
  currency?: string;
  sessions_per_invoice?: number | null;
  billing_day?: number | null;
  due_date_offset_days?: number;
  cycle_start_date: string;
  is_active?: boolean;
}

export interface UpdateRentPayScheduleRequest extends Partial<CreateRentPayScheduleRequest> {}

export interface RentPayScheduleFormData {
  location?: number;
  billing_type: RentPayScheduleBillingType;
  amount?: number | null;
  currency?: string;
  sessions_per_invoice?: number | null;
  billing_day?: number | null;
  due_date_offset_days?: number;
  cycle_start_date?: string;
  is_active?: boolean;
}

export interface RentPayScheduleRun {
  id: number;
  schedule: number;
  run_at: string;
  invoices_created: number;
  status: RentPayScheduleRunStatus;
  triggered_by: RentPayScheduleTriggerSource;
  error_detail: string;
}

export interface RentPayScheduleRunsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RentPayScheduleRun[];
}

export interface ManualRunResponse {
  invoices_created: number;
  status: RentPayScheduleRunStatus;
  run_at: string;
}

export interface PendingRentInvoiceScheduleSummary {
  id: number;
  billing_type: RentPayScheduleBillingType;
  location_name: string;
}

export interface PendingRentInvoice {
  id: number;
  invoice_number: string;
  location: { id: number; name: string };
  amount: string;
  currency: string;
  period_description: string;
  issued_date: string;
  due_date: string | null;
  status: string;
  created_at: string;
  schedule: PendingRentInvoiceScheduleSummary;
}

export interface PendingRentApprovalsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PendingRentInvoice[];
}

export interface BulkIssueRentApprovalsRequest {
  invoice_ids: number[];
}

export interface BulkIssueRentApprovalsResponse {
  issued_count: number;
  invoice_ids: number[];
}
