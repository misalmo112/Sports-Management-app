/**
 * Normalize billing, rent, staff, and paid-bill data into a unified receipt list.
 */
import type { Receipt, UnifiedReceipt } from '../types';
import type { RentReceipt } from '@/features/tenant/facilities/types';
import type { Bill } from '@/features/tenant/facilities/types';
import type { StaffReceipt } from '@/features/tenant/coaches/services/api';

const PAGE_SIZE = 500;

export function normalizeUnifiedReceipts(
  billingResults: Receipt[],
  rentResults: RentReceipt[],
  staffResults: StaffReceipt[],
  paidBills: Bill[]
): UnifiedReceipt[] {
  const items: UnifiedReceipt[] = [];

  for (const r of billingResults) {
    items.push({
      classification: 'student_fee',
      id: `billing-${r.id}`,
      sourceId: r.id,
      ref_number: r.receipt_number,
      amount: r.amount,
      date: r.payment_date,
      payer_or_name: r.parent_name ?? '',
      extra: r.invoice_number,
      linkTo: `/dashboard/finance/invoices/${r.invoice}`,
      raw: r,
    });
  }

  for (const r of rentResults) {
    items.push({
      classification: 'rent',
      id: `rent-${r.id}`,
      sourceId: r.id,
      ref_number: r.receipt_number,
      amount: r.amount,
      date: r.payment_date,
      payer_or_name: r.rent_invoice_detail?.location_name ?? '—',
      extra: r.rent_invoice_detail?.invoice_number,
      linkTo: '/dashboard/management/facilities',
    });
  }

  for (const r of staffResults) {
    items.push({
      classification: 'staff_salary',
      id: `staff-${r.id}`,
      sourceId: r.id,
      ref_number: r.receipt_number,
      amount: r.amount,
      date: r.payment_date,
      payer_or_name: r.coach_name ?? '—',
      extra: r.staff_invoice_detail?.invoice_number,
      linkTo: '/dashboard/management/staff',
    });
  }

  for (const b of paidBills) {
    const ref = b.bill_number && String(b.bill_number).trim() ? String(b.bill_number) : `Bill #${b.id}`;
    items.push({
      classification: 'bill',
      id: `bill-${b.id}`,
      sourceId: b.id,
      ref_number: ref,
      amount: b.total_amount,
      date: b.updated_at,
      payer_or_name: b.vendor_name ?? '—',
      extra: b.currency,
      linkTo: '/dashboard/management/facilities',
    });
  }

  items.sort((a, b) => {
    const dA = new Date(a.date).getTime();
    const dB = new Date(b.date).getTime();
    return dB - dA;
  });

  return items;
}

export function filterUnifiedReceipts(
  items: UnifiedReceipt[],
  searchQuery: string,
  classificationFilter: 'ALL' | import('../types').ReceiptClassification
): UnifiedReceipt[] {
  let out = items;

  if (classificationFilter !== 'ALL') {
    out = out.filter((r) => r.classification === classificationFilter);
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    out = out.filter((r) => {
      const pay = (r.payer_or_name ?? '').toLowerCase();
      const ref = (r.ref_number ?? '').toLowerCase();
      const extra = (r.extra ?? '').toLowerCase();
      const raw = r.raw;
      const parent = (raw?.parent_name ?? '').toLowerCase();
      const students = (raw?.student_names ?? '').toLowerCase();
      return (
        pay.includes(q) ||
        ref.includes(q) ||
        extra.includes(q) ||
        parent.includes(q) ||
        students.includes(q)
      );
    });
  }

  return out;
}

export { PAGE_SIZE };
