export type InvoiceScheduleBillingType = 'MONTHLY' | 'SESSION_BASED';
export type InvoiceScheduleRunStatus = 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
export type InvoiceScheduleTriggerSource = 'SCHEDULED' | 'MANUAL';
export type StudentScheduleOverrideDiscountType = 'PERCENTAGE' | 'FIXED';
export type InvoiceCreationTiming = 'AUTO' | 'START_OF_PERIOD' | 'ON_COMPLETION';

export interface InvoiceSchedule {
  id: number;
  academy: number;
  class_obj: number;
  billing_item: number;
  billing_type: InvoiceScheduleBillingType;
  sessions_per_cycle?: number | null;
  bill_absent_sessions: boolean;
  billing_day?: number | null;
  invoice_creation_timing: InvoiceCreationTiming;
  cycle_start_date: string; // YYYY-MM-DD
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceSchedulesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InvoiceSchedule[];
}

export interface CreateInvoiceScheduleRequest {
  class_obj: number;
  billing_item: number;
  billing_type: InvoiceScheduleBillingType;
  sessions_per_cycle?: number | null;
  bill_absent_sessions?: boolean;
  billing_day?: number | null;
  cycle_start_date: string;
  invoice_creation_timing?: InvoiceCreationTiming;
  is_active?: boolean;
}

export interface UpdateInvoiceScheduleRequest extends Partial<CreateInvoiceScheduleRequest> {}

export interface InvoiceScheduleFormData {
  class_obj?: number;
  billing_item?: number;
  billing_type: InvoiceScheduleBillingType;
  sessions_per_cycle?: number | null;
  bill_absent_sessions?: boolean;
  billing_day?: number | null;
  invoice_creation_timing?: InvoiceCreationTiming;
  cycle_start_date?: string;
  is_active?: boolean;
}

export interface InvoiceScheduleRun {
  id: number;
  schedule: number;
  run_at: string;
  invoices_created: number;
  status: InvoiceScheduleRunStatus;
  triggered_by: InvoiceScheduleTriggerSource;
  error_detail: string;
}

export interface InvoiceScheduleRunsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InvoiceScheduleRun[];
}

export interface ManualRunResponse {
  invoices_created: number;
  status: InvoiceScheduleRunStatus;
  run_at: string;
}

export interface StudentScheduleOverride {
  id: number;
  schedule: number;
  student: number;
  discount_type: StudentScheduleOverrideDiscountType;
  discount_value: string; // Decimal as string
  reason: string;
  is_active: boolean;
  valid_from?: string | null; // YYYY-MM-DD
  valid_until?: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface CreateStudentScheduleOverrideRequest {
  student: number;
  discount_type: StudentScheduleOverrideDiscountType;
  discount_value: number | string;
  reason: string;
  is_active?: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface UpdateStudentScheduleOverrideRequest extends Partial<CreateStudentScheduleOverrideRequest> {}

export interface PendingApprovalInvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: string; // Decimal as string
  line_total: string; // Decimal as string
  student: number | null;
  student_name?: string | null;
}

export interface PendingApprovalInvoiceParentSummary {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

export interface PendingApprovalInvoice {
  id: number;
  invoice_number: string;
  status: 'DRAFT';
  due_date?: string | null;
  issued_date?: string | null;
  parent: PendingApprovalInvoiceParentSummary;
  schedule_id: number;
  class_id: number;
  class_name: string;
  total: string; // Decimal as string
  currency: string;
  students: string | null;
  billing_type: InvoiceScheduleBillingType;
  sport_detail?: { id: number; name: string } | null;
  location_detail?: { id: number; name: string } | null;
  items: PendingApprovalInvoiceItem[];
  created_at: string;
}

export interface PendingApprovalsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PendingApprovalInvoice[];
}

export interface BulkIssuePendingApprovalsRequest {
  invoice_ids: number[];
}

export interface BulkIssuePendingApprovalsResponse {
  invoices_issued: number;
}

