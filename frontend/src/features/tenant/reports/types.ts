/**
 * TypeScript types for Tenant Reports feature
 */

export type ReportType =
  | 'attendance'
  | 'financial'
  | 'enrollment'
  | 'academy_financials'
  | 'finance_overview';

export interface AttendanceReport {
  type: 'attendance';
  date_from?: string | null;
  date_to?: string | null;
  summary: {
    total_records: number;
    present: number;
    absent: number;
    attendance_rate: number;
  };
  by_class: Array<{
    class_obj__name: string;
    class_obj_id: number;
    total: number;
    present: number;
    absent: number;
  }>;
  by_student: Array<{
    student__first_name: string;
    student__last_name: string;
    student_id: number;
    total: number;
    present: number;
    absent: number;
  }>;
}

export interface FinancialReport {
  type: 'financial';
  date_from?: string | null;
  date_to?: string | null;
  summary: {
    total_invoices: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
    total_receipts: number;
    total_collected: number;
  };
  invoices_by_status: Array<{
    status: string;
    count: number;
    total: number;
  }>;
}

export interface EnrollmentReport {
  type: 'enrollment';
  summary: {
    total_enrollments: number;
  };
  by_class: Array<{
    class_obj__name: string;
    class_obj_id: number;
    count: number;
  }>;
  by_student: Array<{
    student__first_name: string;
    student__last_name: string;
    student_id: number;
    count: number;
  }>;
}

export interface AcademyFinancialsReport {
  type: 'academy_financials';
  date_from?: string | null;
  date_to?: string | null;
  summary: {
    rent_invoiced: number;
    rent_paid: number;
    rent_unpaid: number;
    bills_total: number;
    bills_paid_total: number;
    bills_pending_total: number;
    bills_overdue_total: number;
    running_cost_invoiced_basis: number;
    running_cost_paid_basis: number;
    revenue_invoiced_total: number;
    revenue_collected_total: number;
    net_invoiced_basis: number;
    net_cash_basis: number;
    inventory_item_count: number;
    inventory_total_quantity: number;
  };
  rent_by_location: Array<{
    location_id: number;
    location_name: string;
    count: number;
    invoiced: number;
    paid: number;
    unpaid: number;
  }>;
  bills_by_status: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  inventory_summary: Array<{
    id: number;
    name: string;
    quantity: number;
    unit?: string;
    reorder_level?: number;
  }>;
}

export interface FinanceOverviewReport {
  type: 'finance_overview';
  date_from?: string | null;
  date_to?: string | null;
  net_cash_position?: number;
  student: {
    summary: {
      total_invoices: number;
      total_amount: number;
      paid_amount: number;
      unpaid_amount: number;
      overdue_count?: number;
      overdue_amount?: number;
      total_receipts: number;
      total_collected: number;
    };
    invoices_by_status: Array<{
      status: string;
      count: number;
      total: number;
    }>;
  };
  rent: {
    summary: {
      rent_invoiced: number;
      rent_paid: number;
      rent_unpaid: number;
      rent_overdue_count?: number;
      rent_overdue_amount?: number;
    };
    rent_by_location: Array<{
      location_id: number;
      location_name: string;
      count: number;
      invoiced: number;
      paid: number;
      unpaid: number;
    }>;
  };
  staff: {
    summary: {
      expected_total: number;
      paid_total: number;
      pending_total: number;
    };
    by_coach: Array<{
      coach_id: number;
      coach_name: string;
      expected: number;
      paid: number;
      pending: number;
    }>;
  };
  bills?: {
    summary: {
      bills_total: number;
      bills_paid_total: number;
      bills_pending_total: number;
      bills_overdue_total: number;
    };
    bills_by_status: Array<{
      status: string;
      count: number;
      total: number;
    }>;
  };
  cash_flow?: {
    by_day: Array<{
      date: string;
      in_total: number;
      out_rent: number;
      out_staff: number;
      out_bills: number;
      out_total: number;
      net: number;
    }>;
  };
}

export type Report =
  | AttendanceReport
  | FinancialReport
  | EnrollmentReport
  | AcademyFinancialsReport
  | FinanceOverviewReport;
