import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils/testUtils';
import { FacilitiesPage } from '../FacilitiesPage';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return actual;
});

const mutation = vi.hoisted(() => () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }));

vi.mock('@/shared/hooks/useAcademyFormat', () => ({
  useAcademyFormat: () => ({
    currency: 'USD',
    formatCurrency: (v: string | number) => `$${Number(v).toFixed(2)}`,
    formatDateTime: (v?: string | number | Date | null) => (v ? String(v) : '-'),
  }),
}));

vi.mock('@/features/tenant/settings/hooks/hooks', () => ({
  useLocations: () => ({
    data: { results: [{ id: 1, name: 'Main Hall' }] },
  }),
}));

vi.mock('../../hooks/hooks', () => ({
  useRentConfigs: () => ({ data: { results: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useRentInvoices: () => ({ data: { results: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useRentReceipts: () => ({ data: { results: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useBills: () => ({ data: { results: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useBillLineItems: () => ({ data: { results: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useInventoryItems: () => ({ data: { results: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useCreateRentConfig: mutation,
  useUpdateRentConfig: mutation,
  useDeleteRentConfig: mutation,
  useCreateRentInvoice: mutation,
  useUpdateRentInvoice: mutation,
  useDeleteRentInvoice: mutation,
  useAddRentInvoicePayment: mutation,
  useMarkRentInvoicePaid: mutation,
  useCreateBill: mutation,
  useUpdateBill: mutation,
  useDeleteBill: mutation,
  useMarkBillPaid: mutation,
  useCreateBillLineItem: mutation,
  useUpdateBillLineItem: mutation,
  useDeleteBillLineItem: mutation,
  useCreateInventoryItem: mutation,
  useUpdateInventoryItem: mutation,
  useAdjustInventoryQuantity: mutation,
  useDeleteInventoryItem: mutation,
}));

describe('FacilitiesPage', () => {
  it('renders key management tabs', () => {
    render(<FacilitiesPage />);

    expect(screen.getByText('Facilities')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rent' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bills' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Inventory' })).toBeInTheDocument();
  });
});
