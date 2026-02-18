/**
 * TypeScript types for Tenant Overview feature
 */

export interface AttendanceSummary {
  present: number;
  absent: number;
}

export interface FinanceSummary {
  unpaid_invoices: number;
  overdue_invoices: number;
  total_due: number;
}

export interface Alert {
  type: string;
  message: string;
  severity: string;
}

export interface Overview {
  role: 'ADMIN' | 'COACH' | 'PARENT';
  today_classes: any[];
  attendance_summary?: AttendanceSummary;
  finance_summary?: FinanceSummary;
  alerts: Alert[];
}
