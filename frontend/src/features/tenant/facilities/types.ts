/**
 * TypeScript types for Tenant Facilities feature
 */

export type RentPeriodType = 'DAY' | 'MONTH' | 'SESSION';
export type RentInvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CHECK' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FacilityRentConfig {
  id: number;
  academy: string;
  location: number;
  location_detail?: {
    id: number;
    name: string;
  };
  amount: string;
  currency: string;
  period_type: RentPeriodType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFacilityRentConfigRequest {
  location: number;
  amount: number;
  currency?: string;
  period_type: RentPeriodType;
  is_active?: boolean;
}

export interface UpdateFacilityRentConfigRequest extends Partial<CreateFacilityRentConfigRequest> {}

export interface RentPayment {
  id: number;
  rent_invoice: number;
  amount: string;
  payment_date: string;
  payment_method: PaymentMethod;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RentInvoice {
  id: number;
  academy: string;
  location: number;
  location_detail?: {
    id: number;
    name: string;
  };
  invoice_number: string;
  amount: string;
  currency: string;
  period_description: string;
  issued_date: string;
  due_date?: string;
  status: RentInvoiceStatus;
  notes?: string;
  paid_amount: string;
  remaining_amount: string;
  payments?: RentPayment[];
  created_at: string;
  updated_at: string;
}

export interface CreateRentInvoiceRequest {
  location: number;
  amount: number;
  currency?: string;
  period_description: string;
  issued_date?: string;
  due_date?: string;
  status?: RentInvoiceStatus;
  notes?: string;
}

export interface UpdateRentInvoiceRequest extends Partial<CreateRentInvoiceRequest> {
  status?: RentInvoiceStatus;
}

export interface AddRentPaymentRequest {
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  notes?: string;
}

export interface MarkRentInvoicePaidRequest {
  payment_method?: PaymentMethod;
  payment_date?: string;
  notes?: string;
}

export interface RentReceipt {
  id: number;
  academy: string;
  rent_invoice: number;
  rent_invoice_detail?: {
    id: number;
    invoice_number: string;
    location_name: string;
  };
  rent_payment: number;
  receipt_number: string;
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  academy: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  reorder_level?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemRequest {
  name: string;
  description?: string;
  quantity?: number;
  unit?: string;
  reorder_level?: number;
}

export interface UpdateInventoryItemRequest extends Partial<CreateInventoryItemRequest> {}

export interface AdjustInventoryQuantityRequest {
  delta: number;
}

export interface BillLineItem {
  id: number;
  bill: number;
  description: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  inventory_item?: number;
  inventory_item_detail?: InventoryItem;
  created_at: string;
  updated_at: string;
}

export interface CreateBillLineItemRequest {
  bill: number;
  description: string;
  quantity: number;
  unit_price: number;
  inventory_item?: number | null;
}

export interface UpdateBillLineItemRequest extends Partial<CreateBillLineItemRequest> {}

export interface Bill {
  id: number;
  academy: string;
  vendor_name: string;
  bill_number?: string;
  total_amount: string;
  currency: string;
  bill_date: string;
  due_date?: string;
  status: BillStatus;
  notes?: string;
  line_items?: BillLineItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateBillRequest {
  vendor_name: string;
  bill_number?: string;
  currency?: string;
  bill_date: string;
  due_date?: string;
  status?: BillStatus;
  notes?: string;
}

export interface UpdateBillRequest extends Partial<CreateBillRequest> {
  status?: BillStatus;
}

