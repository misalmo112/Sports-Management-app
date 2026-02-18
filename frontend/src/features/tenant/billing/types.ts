/**
 * TypeScript types for Tenant Billing feature
 */

export interface BillingItem {
  id: number;
  academy: number;
  name: string;
  description?: string;
  price: string; // Decimal as string
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingItemsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BillingItem[];
}

export interface CreateBillingItemRequest {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  is_active?: boolean;
}

export interface UpdateBillingItemRequest {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  is_active?: boolean;
}

export interface InvoiceItem {
  id: number;
  invoice: number;
  item?: number;
  item_detail?: {
    id: number;
    name: string;
    price: string;
    currency: string;
  };
  student?: number;
  student_name?: string;
  description: string;
  quantity: number;
  unit_price: string; // Decimal as string
  line_total: string; // Decimal as string
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  academy: number;
  parent: number;
  parent_name?: string;
  parent_email?: string;
  parent_detail?: {
    id: number;
    full_name: string;
    email: string;
  };
  invoice_number: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: string; // Decimal as string
  discount_type?: 'PERCENTAGE' | 'FIXED';
  discount_value?: string; // Decimal as string
  discount_amount: string; // Decimal as string
  tax_amount: string; // Decimal as string
  total: string; // Decimal as string
  paid_amount?: string; // Decimal as string
  remaining_balance?: string; // Decimal as string
  due_date?: string;
  issued_date?: string;
  parent_invoice?: number;
  sport?: number;
  sport_name?: string;
  sport_detail?: {
    id: number;
    name: string;
  };
  location?: number;
  location_name?: string;
  location_detail?: {
    id: number;
    name: string;
  };
  notes?: string;
  items?: InvoiceItem[];
  receipts?: Receipt[];
  created_at: string;
  updated_at: string;
}

export interface InvoicesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invoice[];
}

export interface CreateInvoiceRequest {
  parent_id: number;
  due_date?: string;
  issued_date?: string;
  discount_type?: 'PERCENTAGE' | 'FIXED';
  discount_value?: number;
  tax_amount?: number;
  sport?: number;
  location?: number;
  notes?: string;
  items: Array<{
    item_id?: number;
    student_id?: number;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface UpdateInvoiceRequest {
  status?: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  due_date?: string;
  issued_date?: string;
  discount_type?: 'PERCENTAGE' | 'FIXED';
  discount_value?: number;
  tax_amount?: number;
  sport?: number;
  location?: number;
  notes?: string;
}

export interface Receipt {
  id: number;
  academy: number;
  invoice: number;
  invoice_number: string;
  invoice_total: string; // Decimal as string
  receipt_number: string;
  amount: string; // Decimal as string
  payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'OTHER';
  payment_date: string;
  sport?: number;
  sport_name?: string;
  sport_detail?: {
    id: number;
    name: string;
  };
  location?: number;
  location_name?: string;
  location_detail?: {
    id: number;
    name: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Receipt[];
}

export interface CreateReceiptRequest {
  invoice: number;
  amount: number;
  payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'OTHER';
  payment_date: string;
  sport?: number;
  location?: number;
  notes?: string;
}

export interface UpdateReceiptRequest {
  amount?: number;
  payment_method?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'OTHER';
  payment_date?: string;
  sport?: number;
  location?: number;
  notes?: string;
}
