/**
 * TypeScript types for Tenant Overview feature
 */

export interface AttendanceSummary {
  present: number;
  absent: number;
}

export interface Counts {
  students: number;
  coaches: number;
  admins: number;
  classes: number;
  enrollments: number;
}

export interface Usage {
  students_count: number;
  coaches_count: number;
  admins_count: number;
  classes_count: number;
  storage_used_bytes: number;
  storage_used_gb: number;
}

export interface Quota {
  max_students: number;
  max_coaches: number;
  max_admins: number;
  max_classes: number;
  storage_bytes_limit: number;
}

export interface FinanceSummary {
  unpaid_invoices: number;
  overdue_invoices: number;
  total_due: number;
  collected_last_30_days?: number;
}

export interface Alert {
  type: string;
  message: string;
  severity: string;
}

export interface Activity {
  new_students_30d: number;
  new_enrollments_30d: number;
}

export interface Overview {
  role: 'ADMIN' | 'COACH' | 'PARENT';
  counts: Counts;
  today_classes: any[];
  attendance_summary?: AttendanceSummary;
  finance_summary?: FinanceSummary;
  alerts: Alert[];
  usage?: Usage | null;
  quota?: Quota | null;
  activity?: Activity | null;
}
