export interface ExpenseBreakdownItem {
  category: string;
  total: string;
}

export interface FinanceSummary {
  year: number;
  month: number;
  mrr: string;
  arr: string;
  active_subscriptions: number;
  churn_count: number;
  revenue: string;
  expenses: string;
  pl: string;
  expense_breakdown: ExpenseBreakdownItem[];
}

export interface PlatformPayment {
  id: number;
  subscription: number;
  academy: string;
  academy_name: string;
  plan_name: string;
  amount: string;
  currency: string;
  payment_method: string;
  payment_date: string;
  invoice_ref: string;
  notes: string;
  external_ref: string;
  synced_at: string | null;
  created_at: string;
}

export interface PlatformPaymentCreate {
  subscription: number;
  academy: string;
  amount: string;
  currency: string;
  payment_method: string;
  payment_date: string;
  invoice_ref?: string;
  notes?: string;
}

export interface OperationalExpense {
  id: number;
  category: string;
  vendor_name: string;
  description: string;
  amount: string;
  currency: string;
  billing_cycle: string;
  due_date: string | null;
  paid_date: string | null;
  is_paid: boolean;
  notes: string;
  created_at: string;
}

export type OperationalExpenseCreate = Omit<OperationalExpense, 'id' | 'created_at'>;

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AcademyOption {
  id: string;
  name: string;
}

export type ValidationErrors = Record<string, string[]>;
