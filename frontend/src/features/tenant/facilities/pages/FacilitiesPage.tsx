import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit, Plus, Trash2, Wrench } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { useLocations } from '@/features/tenant/settings/hooks/hooks';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import {
  useAddRentInvoicePayment,
  useAdjustInventoryQuantity,
  useBillLineItems,
  useBills,
  useCreateBill,
  useCreateBillLineItem,
  useCreateInventoryItem,
  useCreateRentConfig,
  useCreateRentInvoice,
  useDeleteBill,
  useDeleteBillLineItem,
  useDeleteInventoryItem,
  useDeleteRentConfig,
  useDeleteRentInvoice,
  useInventoryItems,
  useMarkBillPaid,
  useMarkRentInvoicePaid,
  useRentConfigs,
  useRentInvoices,
  useRentReceipts,
  useUpdateBill,
  useUpdateBillLineItem,
  useUpdateInventoryItem,
  useUpdateRentConfig,
  useUpdateRentInvoice,
} from '../hooks/hooks';
import type {
  Bill,
  BillStatus,
  FacilityRentConfig,
  InventoryItem,
  PaymentMethod,
  RentInvoice,
  RentInvoiceStatus,
  RentPeriodType,
} from '../types';

type Notice = {
  type: 'success' | 'error';
  message: string;
};

type DeleteTarget =
  | { kind: 'rentConfig'; id: number; label: string }
  | { kind: 'rentInvoice'; id: number; label: string }
  | { kind: 'bill'; id: number; label: string }
  | { kind: 'billLineItem'; id: number; label: string }
  | { kind: 'inventory'; id: number; label: string };

const RENT_STATUS_OPTIONS: Array<'ALL' | RentInvoiceStatus> = ['ALL', 'DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
const BILL_STATUS_OPTIONS: Array<'ALL' | BillStatus> = ['ALL', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CHECK', 'CARD', 'BANK_TRANSFER', 'OTHER'];

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const getRentStatusVariant = (status: RentInvoiceStatus) => {
  if (status === 'PAID') return 'success';
  if (status === 'OVERDUE') return 'warning';
  if (status === 'CANCELLED') return 'destructive';
  if (status === 'DRAFT') return 'outline';
  return 'secondary';
};

const getBillStatusVariant = (status: BillStatus) => {
  if (status === 'PAID') return 'success';
  if (status === 'OVERDUE') return 'warning';
  if (status === 'CANCELLED') return 'destructive';
  return 'secondary';
};

export const FacilitiesPage = () => {
  const { formatCurrency, formatDateTime, currency } = useAcademyFormat();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [rentStatus, setRentStatus] = useState<'ALL' | RentInvoiceStatus>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [billStatus, setBillStatus] = useState<'ALL' | BillStatus>('ALL');
  const [billSearch, setBillSearch] = useState('');

  const [rentConfigForm, setRentConfigForm] = useState({
    location: '',
    amount: '',
    period_type: 'MONTH' as RentPeriodType,
    is_active: true,
  });

  const [rentInvoiceForm, setRentInvoiceForm] = useState({
    location: '',
    period_description: '',
    amount: '',
    due_date: '',
    notes: '',
    status: 'PENDING' as RentInvoiceStatus,
  });

  const [billForm, setBillForm] = useState({
    vendor_name: '',
    bill_number: '',
    bill_date: todayDate(),
    due_date: '',
    notes: '',
    status: 'PENDING' as BillStatus,
  });

  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    description: '',
    quantity: '0',
    unit: 'pcs',
    reorder_level: '',
  });

  const [editingRentConfig, setEditingRentConfig] = useState<FacilityRentConfig | null>(null);
  const [editingRentInvoice, setEditingRentInvoice] = useState<RentInvoice | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);

  const [paymentTarget, setPaymentTarget] = useState<RentInvoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'CARD' as PaymentMethod,
    payment_date: todayDate(),
    notes: '',
  });

  const [batchRentPaymentOpen, setBatchRentPaymentOpen] = useState(false);
  const [batchRentRows, setBatchRentRows] = useState<Array<{ rent_invoice_id: string; amount: string; notes: string }>>([
    { rent_invoice_id: '', amount: '', notes: '' },
  ]);
  const [batchRentShared, setBatchRentShared] = useState({
    payment_method: 'CARD' as PaymentMethod,
    payment_date: todayDate(),
  });
  const [batchRentSubmitting, setBatchRentSubmitting] = useState(false);
  const [batchRentProgress, setBatchRentProgress] = useState<{ current: number; total: number } | null>(null);

  const [adjustInventoryTarget, setAdjustInventoryTarget] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');

  const [selectedBillForLines, setSelectedBillForLines] = useState<Bill | null>(null);
  const [editingLineItemId, setEditingLineItemId] = useState<number | null>(null);
  const [lineItemForm, setLineItemForm] = useState({
    description: '',
    quantity: '1',
    unit_price: '0',
    inventory_item: 'NONE',
  });

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const { data: locationsData } = useLocations({ page_size: 200 });
  const {
    data: rentConfigsData,
    isLoading: rentConfigsLoading,
    error: rentConfigsError,
    refetch: refetchRentConfigs,
  } = useRentConfigs({ page_size: 200 });
  const {
    data: rentInvoicesData,
    isLoading: rentInvoicesLoading,
    error: rentInvoicesError,
    refetch: refetchRentInvoices,
  } = useRentInvoices({
    page_size: 200,
    status: rentStatus === 'ALL' ? undefined : rentStatus,
    location: locationFilter === 'ALL' ? undefined : Number(locationFilter),
  });
  const { data: rentReceiptsData, isLoading: rentReceiptsLoading, refetch: refetchRentReceipts } = useRentReceipts({
    page_size: 200,
  });
  const {
    data: billsData,
    isLoading: billsLoading,
    error: billsError,
    refetch: refetchBills,
  } = useBills({
    page_size: 200,
    status: billStatus === 'ALL' ? undefined : billStatus,
    search: billSearch || undefined,
  });
  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventoryItems({ page_size: 200 });

  const {
    data: billLineItemsData,
    isLoading: billLineItemsLoading,
    error: billLineItemsError,
    refetch: refetchBillLineItems,
  } = useBillLineItems({ bill: selectedBillForLines?.id, page_size: 200 }, { enabled: !!selectedBillForLines });

  const createRentConfig = useCreateRentConfig();
  const updateRentConfig = useUpdateRentConfig();
  const deleteRentConfig = useDeleteRentConfig();

  const createRentInvoice = useCreateRentInvoice();
  const updateRentInvoice = useUpdateRentInvoice();
  const deleteRentInvoice = useDeleteRentInvoice();
  const addRentPayment = useAddRentInvoicePayment();
  const markRentInvoicePaid = useMarkRentInvoicePaid();

  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const markBillPaid = useMarkBillPaid();

  const createBillLineItem = useCreateBillLineItem();
  const updateBillLineItem = useUpdateBillLineItem();
  const deleteBillLineItem = useDeleteBillLineItem();

  const createInventoryItem = useCreateInventoryItem();
  const updateInventoryItem = useUpdateInventoryItem();
  const adjustInventoryQuantity = useAdjustInventoryQuantity();
  const deleteInventoryItem = useDeleteInventoryItem();

  const locations = locationsData?.results || [];
  const rentConfigs = rentConfigsData?.results || [];
  const rentInvoices = rentInvoicesData?.results || [];
  const rentReceipts = rentReceiptsData?.results || [];
  const bills = billsData?.results || [];
  const inventoryItems = inventoryData?.results || [];
  const billLineItems = billLineItemsData?.results || [];

  const locationById = useMemo(() => {
    const map = new Map<number, string>();
    locations.forEach((loc) => map.set(loc.id, loc.name));
    return map;
  }, [locations]);

  const rentInvoicedTotal = useMemo(
    () => rentInvoices.reduce((sum, invoice) => sum + asNumber(invoice.amount), 0),
    [rentInvoices]
  );
  const rentPaidTotal = useMemo(
    () => rentInvoices.reduce((sum, invoice) => sum + asNumber(invoice.paid_amount), 0),
    [rentInvoices]
  );
  const billsTotal = useMemo(
    () => bills.reduce((sum, bill) => sum + asNumber(bill.total_amount), 0),
    [bills]
  );
  const lowStockCount = useMemo(
    () => inventoryItems.filter((item) => item.reorder_level !== undefined && item.reorder_level !== null && item.quantity <= item.reorder_level).length,
    [inventoryItems]
  );

  const hasError = rentConfigsError || rentInvoicesError || billsError || inventoryError;

  const refetchAll = () => {
    void refetchRentConfigs();
    void refetchRentInvoices();
    void refetchRentReceipts();
    void refetchBills();
    void refetchInventory();
    if (selectedBillForLines) {
      void refetchBillLineItems();
    }
  };

  const showSuccess = (message: string) => setNotice({ type: 'success', message });
  const showError = (error: unknown, fallback: string) => {
    const message = formatErrorMessage(error);
    setNotice({ type: 'error', message: message || fallback });
  };

  const handleCreateRentConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = asNumber(rentConfigForm.amount);
    if (!rentConfigForm.location || amount <= 0) {
      setNotice({ type: 'error', message: 'Select a location and enter a valid rent amount.' });
      return;
    }

    try {
      await createRentConfig.mutateAsync({
        location: Number(rentConfigForm.location),
        amount,
        currency,
        period_type: rentConfigForm.period_type,
        is_active: rentConfigForm.is_active,
      });
      setRentConfigForm({ location: '', amount: '', period_type: 'MONTH', is_active: true });
      showSuccess('Rent config created.');
    } catch (error) {
      showError(error, 'Failed to create rent config.');
    }
  };

  const handleUpdateRentConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRentConfig) return;

    const amount = asNumber(rentConfigForm.amount);
    if (!rentConfigForm.location || amount <= 0) {
      setNotice({ type: 'error', message: 'Select a location and enter a valid rent amount.' });
      return;
    }

    try {
      await updateRentConfig.mutateAsync({
        id: editingRentConfig.id,
        data: {
          location: Number(rentConfigForm.location),
          amount,
          period_type: rentConfigForm.period_type,
          is_active: rentConfigForm.is_active,
        },
      });
      setEditingRentConfig(null);
      setRentConfigForm({ location: '', amount: '', period_type: 'MONTH', is_active: true });
      showSuccess('Rent config updated.');
    } catch (error) {
      showError(error, 'Failed to update rent config.');
    }
  };

  const handleCreateRentInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = asNumber(rentInvoiceForm.amount);

    if (!rentInvoiceForm.location || !rentInvoiceForm.period_description.trim() || amount <= 0) {
      setNotice({ type: 'error', message: 'Location, period and amount are required for rent invoice.' });
      return;
    }

    try {
      await createRentInvoice.mutateAsync({
        location: Number(rentInvoiceForm.location),
        period_description: rentInvoiceForm.period_description.trim(),
        amount,
        currency,
        due_date: rentInvoiceForm.due_date || undefined,
        notes: rentInvoiceForm.notes.trim() || undefined,
        status: rentInvoiceForm.status,
      });

      setRentInvoiceForm({
        location: '',
        period_description: '',
        amount: '',
        due_date: '',
        notes: '',
        status: 'PENDING',
      });
      showSuccess('Rent invoice created.');
    } catch (error) {
      showError(error, 'Failed to create rent invoice.');
    }
  };

  const handleUpdateRentInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRentInvoice) return;

    const amount = asNumber(rentInvoiceForm.amount);
    if (!rentInvoiceForm.location || !rentInvoiceForm.period_description.trim() || amount <= 0) {
      setNotice({ type: 'error', message: 'Location, period and amount are required for rent invoice.' });
      return;
    }

    try {
      await updateRentInvoice.mutateAsync({
        id: editingRentInvoice.id,
        data: {
          location: Number(rentInvoiceForm.location),
          period_description: rentInvoiceForm.period_description.trim(),
          amount,
          due_date: rentInvoiceForm.due_date || undefined,
          notes: rentInvoiceForm.notes.trim() || undefined,
          status: rentInvoiceForm.status,
        },
      });
      setEditingRentInvoice(null);
      showSuccess('Rent invoice updated.');
    } catch (error) {
      showError(error, 'Failed to update rent invoice.');
    }
  };
  const openPaymentDialog = (invoice: RentInvoice) => {
    setPaymentTarget(invoice);
    setPaymentForm({
      amount: String(asNumber(invoice.remaining_amount)),
      payment_method: 'CARD',
      payment_date: todayDate(),
      notes: '',
    });
  };

  const handleAddPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentTarget) return;

    const amount = asNumber(paymentForm.amount);
    if (amount <= 0) {
      setNotice({ type: 'error', message: 'Payment amount must be greater than zero.' });
      return;
    }

    try {
      await addRentPayment.mutateAsync({
        id: paymentTarget.id,
        data: {
          amount,
          payment_method: paymentForm.payment_method,
          payment_date: paymentForm.payment_date || undefined,
          notes: paymentForm.notes.trim() || undefined,
        },
      });
      setPaymentTarget(null);
      showSuccess('Payment added to rent invoice.');
    } catch (error) {
      showError(error, 'Failed to add rent payment.');
    }
  };

  const handleBatchRentPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = batchRentRows.filter((r) => r.rent_invoice_id && asNumber(r.amount) > 0);
    if (validRows.length === 0) {
      setNotice({ type: 'error', message: 'Add at least one row with an invoice and amount greater than zero.' });
      return;
    }
    setBatchRentSubmitting(true);
    setBatchRentProgress({ current: 0, total: validRows.length });
    const failed: { index: number; error: string }[] = [];
    let succeeded = 0;
    for (let i = 0; i < validRows.length; i++) {
      setBatchRentProgress({ current: i + 1, total: validRows.length });
      try {
        await addRentPayment.mutateAsync({
          id: Number(validRows[i].rent_invoice_id),
          data: {
            amount: asNumber(validRows[i].amount),
            payment_method: batchRentShared.payment_method,
            payment_date: batchRentShared.payment_date || undefined,
            notes: validRows[i].notes.trim() || undefined,
          },
        });
        succeeded += 1;
      } catch (err) {
        failed.push({ index: i + 1, error: formatErrorMessage(err) });
      }
    }
    setBatchRentSubmitting(false);
    setBatchRentProgress(null);
    if (failed.length === 0) {
      setNotice({ type: 'success', message: `${succeeded} payment(s) recorded.` });
      setBatchRentPaymentOpen(false);
      setBatchRentRows([{ rent_invoice_id: '', amount: '', notes: '' }]);
      setBatchRentShared({ payment_method: 'CARD', payment_date: todayDate() });
      void refetchRentInvoices();
      void refetchRentReceipts();
    } else {
      const detail = failed.map((f) => `Row ${f.index}: ${f.error}`).join('. ');
      setNotice({
        type: 'error',
        message: `${succeeded} of ${validRows.length} recorded. ${detail}`,
      });
    }
  };

  const handleMarkRentInvoicePaid = async (invoice: RentInvoice) => {
    try {
      await markRentInvoicePaid.mutateAsync({ id: invoice.id, data: {} });
      showSuccess(`Rent invoice ${invoice.invoice_number} marked as paid.`);
    } catch (error) {
      showError(error, 'Failed to mark rent invoice as paid.');
    }
  };

  const handleCancelRentInvoice = async (invoice: RentInvoice) => {
    try {
      await updateRentInvoice.mutateAsync({ id: invoice.id, data: { status: 'CANCELLED' } });
      showSuccess(`Rent invoice ${invoice.invoice_number} cancelled.`);
    } catch (error) {
      showError(error, 'Failed to cancel rent invoice.');
    }
  };

  const handleCreateBill = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!billForm.vendor_name.trim()) {
      setNotice({ type: 'error', message: 'Vendor name is required.' });
      return;
    }

    try {
      await createBill.mutateAsync({
        vendor_name: billForm.vendor_name.trim(),
        bill_number: billForm.bill_number.trim() || undefined,
        bill_date: billForm.bill_date,
        due_date: billForm.due_date || undefined,
        notes: billForm.notes.trim() || undefined,
        status: billForm.status,
        currency,
      });

      setBillForm({
        vendor_name: '',
        bill_number: '',
        bill_date: todayDate(),
        due_date: '',
        notes: '',
        status: 'PENDING',
      });
      showSuccess('Bill created. Add line items from Manage Lines.');
    } catch (error) {
      showError(error, 'Failed to create bill.');
    }
  };

  const handleUpdateBill = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBill) return;

    if (!billForm.vendor_name.trim()) {
      setNotice({ type: 'error', message: 'Vendor name is required.' });
      return;
    }

    try {
      await updateBill.mutateAsync({
        id: editingBill.id,
        data: {
          vendor_name: billForm.vendor_name.trim(),
          bill_number: billForm.bill_number.trim() || undefined,
          bill_date: billForm.bill_date,
          due_date: billForm.due_date || undefined,
          notes: billForm.notes.trim() || undefined,
          status: billForm.status,
        },
      });
      setEditingBill(null);
      showSuccess('Bill updated.');
    } catch (error) {
      showError(error, 'Failed to update bill.');
    }
  };

  const handleMarkBillPaid = async (bill: Bill) => {
    try {
      await markBillPaid.mutateAsync(bill.id);
      showSuccess('Bill marked as paid.');
    } catch (error) {
      showError(error, 'Failed to mark bill as paid.');
    }
  };

  const handleCancelBill = async (bill: Bill) => {
    try {
      await updateBill.mutateAsync({ id: bill.id, data: { status: 'CANCELLED' } });
      showSuccess('Bill cancelled.');
    } catch (error) {
      showError(error, 'Failed to cancel bill.');
    }
  };

  const resetLineItemForm = () => {
    setEditingLineItemId(null);
    setLineItemForm({ description: '', quantity: '1', unit_price: '0', inventory_item: 'NONE' });
  };

  const openBillLineManager = (bill: Bill) => {
    setSelectedBillForLines(bill);
    resetLineItemForm();
  };

  const handleBillLineSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedBillForLines) return;

    const quantity = asNumber(lineItemForm.quantity);
    const unitPrice = asNumber(lineItemForm.unit_price);

    if (!lineItemForm.description.trim() || quantity <= 0 || unitPrice < 0) {
      setNotice({ type: 'error', message: 'Line item requires description, quantity > 0 and non-negative unit price.' });
      return;
    }

    const inventoryItem = lineItemForm.inventory_item === 'NONE' ? null : Number(lineItemForm.inventory_item);

    try {
      if (editingLineItemId) {
        await updateBillLineItem.mutateAsync({
          id: editingLineItemId,
          data: {
            bill: selectedBillForLines.id,
            description: lineItemForm.description.trim(),
            quantity,
            unit_price: unitPrice,
            inventory_item: inventoryItem,
          },
        });
        showSuccess('Bill line item updated.');
      } else {
        await createBillLineItem.mutateAsync({
          bill: selectedBillForLines.id,
          description: lineItemForm.description.trim(),
          quantity,
          unit_price: unitPrice,
          inventory_item: inventoryItem,
        });
        showSuccess('Bill line item created.');
      }
      resetLineItemForm();
    } catch (error) {
      showError(error, 'Failed to save bill line item.');
    }
  };

  const handleCreateInventoryItem = async (event: React.FormEvent) => {
    event.preventDefault();

    const quantity = Math.max(0, asNumber(inventoryForm.quantity));
    const reorderLevel = inventoryForm.reorder_level.trim() === '' ? undefined : Math.max(0, asNumber(inventoryForm.reorder_level));

    if (!inventoryForm.name.trim()) {
      setNotice({ type: 'error', message: 'Inventory name is required.' });
      return;
    }

    try {
      await createInventoryItem.mutateAsync({
        name: inventoryForm.name.trim(),
        description: inventoryForm.description.trim() || undefined,
        quantity,
        unit: inventoryForm.unit.trim() || undefined,
        reorder_level: reorderLevel,
      });
      setInventoryForm({ name: '', description: '', quantity: '0', unit: 'pcs', reorder_level: '' });
      showSuccess('Inventory item created.');
    } catch (error) {
      showError(error, 'Failed to create inventory item.');
    }
  };

  const handleUpdateInventory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingInventory) return;

    const quantity = Math.max(0, asNumber(inventoryForm.quantity));
    const reorderLevel = inventoryForm.reorder_level.trim() === '' ? undefined : Math.max(0, asNumber(inventoryForm.reorder_level));

    if (!inventoryForm.name.trim()) {
      setNotice({ type: 'error', message: 'Inventory name is required.' });
      return;
    }

    try {
      await updateInventoryItem.mutateAsync({
        id: editingInventory.id,
        data: {
          name: inventoryForm.name.trim(),
          description: inventoryForm.description.trim() || undefined,
          quantity,
          unit: inventoryForm.unit.trim() || undefined,
          reorder_level: reorderLevel,
        },
      });
      setEditingInventory(null);
      showSuccess('Inventory item updated.');
    } catch (error) {
      showError(error, 'Failed to update inventory item.');
    }
  };

  const handleAdjustInventory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustInventoryTarget) return;

    const delta = asNumber(adjustDelta);
    if (delta === 0) {
      setNotice({ type: 'error', message: 'Adjustment delta cannot be zero.' });
      return;
    }

    try {
      await adjustInventoryQuantity.mutateAsync({ id: adjustInventoryTarget.id, data: { delta } });
      setAdjustInventoryTarget(null);
      setAdjustDelta('');
      showSuccess('Inventory quantity adjusted.');
    } catch (error) {
      showError(error, 'Failed to adjust inventory quantity.');
    }
  };
  const openRentConfigEdit = (config: FacilityRentConfig) => {
    setEditingRentConfig(config);
    setRentConfigForm({
      location: String(config.location),
      amount: String(config.amount),
      period_type: config.period_type,
      is_active: config.is_active,
    });
  };

  const openRentInvoiceEdit = (invoice: RentInvoice) => {
    setEditingRentInvoice(invoice);
    setRentInvoiceForm({
      location: String(invoice.location),
      period_description: invoice.period_description,
      amount: String(invoice.amount),
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
      status: invoice.status,
    });
  };

  const openBillEdit = (bill: Bill) => {
    setEditingBill(bill);
    setBillForm({
      vendor_name: bill.vendor_name,
      bill_number: bill.bill_number || '',
      bill_date: bill.bill_date,
      due_date: bill.due_date || '',
      notes: bill.notes || '',
      status: bill.status,
    });
  };

  const openInventoryEdit = (item: InventoryItem) => {
    setEditingInventory(item);
    setInventoryForm({
      name: item.name,
      description: item.description || '',
      quantity: String(item.quantity),
      unit: item.unit || '',
      reorder_level: item.reorder_level !== undefined && item.reorder_level !== null ? String(item.reorder_level) : '',
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.kind === 'rentConfig') {
        await deleteRentConfig.mutateAsync(deleteTarget.id);
        showSuccess('Rent config deleted.');
      } else if (deleteTarget.kind === 'rentInvoice') {
        await deleteRentInvoice.mutateAsync(deleteTarget.id);
        showSuccess('Rent invoice deleted.');
      } else if (deleteTarget.kind === 'bill') {
        await deleteBill.mutateAsync(deleteTarget.id);
        showSuccess('Bill deleted.');
      } else if (deleteTarget.kind === 'billLineItem') {
        await deleteBillLineItem.mutateAsync(deleteTarget.id);
        showSuccess('Bill line item deleted.');
        resetLineItemForm();
      } else {
        await deleteInventoryItem.mutateAsync(deleteTarget.id);
        showSuccess('Inventory item deleted.');
      }
      setDeleteTarget(null);
    } catch (error) {
      showError(error, 'Delete action failed.');
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facilities</h1>
          <p className="mt-2 text-muted-foreground">Manage rent, bills, and inventory from one page.</p>
        </div>
        <Button variant="outline" onClick={refetchAll}>Refresh Data</Button>
      </div>

      {notice && (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          {notice.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rent Invoiced</CardDescription>
            <CardTitle>{formatCurrency(rentInvoicedTotal, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rent Paid</CardDescription>
            <CardTitle>{formatCurrency(rentPaidTotal, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bills Total</CardDescription>
            <CardTitle>{formatCurrency(billsTotal, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low Stock Items</CardDescription>
            <CardTitle>{lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {hasError && (
        <ErrorState
          error={hasError as Error}
          onRetry={refetchAll}
          title="Failed to load facilities data"
        />
      )}

      <Tabs defaultValue="rent" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rent">Rent</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="rent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rent Configurations</CardTitle>
              <CardDescription>Set default rent amounts per location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-3 md:grid-cols-5" onSubmit={handleCreateRentConfig}>
                <div className="md:col-span-2">
                  <Label className="mb-1 block">Location</Label>
                  <Select value={rentConfigForm.location} onValueChange={(value) => setRentConfigForm((prev) => ({ ...prev, location: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>{location.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block">Amount</Label>
                  <Input type="number" min="0" step="0.01" value={rentConfigForm.amount} onChange={(event) => setRentConfigForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Period</Label>
                  <Select value={rentConfigForm.period_type} onValueChange={(value) => setRentConfigForm((prev) => ({ ...prev, period_type: value as RentPeriodType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAY">Per day</SelectItem>
                      <SelectItem value="MONTH">Per month</SelectItem>
                      <SelectItem value="SESSION">Per session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={createRentConfig.isPending}>{createRentConfig.isPending ? 'Saving...' : 'Add Config'}</Button>
                </div>
              </form>

              {rentConfigsLoading ? (
                <LoadingState message="Loading rent configurations..." />
              ) : rentConfigs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell>{config.location_detail?.name || locationById.get(config.location) || '-'}</TableCell>
                          <TableCell>{config.period_type}</TableCell>
                          <TableCell>{formatCurrency(config.amount, config.currency)}</TableCell>
                          <TableCell><Badge variant={config.is_active ? 'success' : 'secondary'}>{config.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setRentInvoiceForm((prev) => ({ ...prev, location: String(config.location), amount: String(config.amount), period_description: prev.period_description || `${config.period_type} rent` }));
                                showSuccess('Rent invoice form prefilled from config.');
                              }}>Use For Invoice</Button>
                              <Button variant="outline" size="sm" onClick={() => openRentConfigEdit(config)}><Edit className="mr-1 h-4 w-4" /> Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ kind: 'rentConfig', id: config.id, label: `${config.location_detail?.name || 'location'} ${config.period_type}` })}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No rent configurations" description="Add a default rent config for one or more locations." />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Rent Invoices</CardTitle>
                  <CardDescription>Create invoices and track paid/unpaid status.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setBatchRentPaymentOpen(true)} disabled={rentInvoices.length === 0}>
                  Add multiple payments
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-3 md:grid-cols-6" onSubmit={handleCreateRentInvoice}>
                <div className="md:col-span-2">
                  <Label className="mb-1 block">Location</Label>
                  <Select value={rentInvoiceForm.location} onValueChange={(value) => setRentInvoiceForm((prev) => ({ ...prev, location: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>{location.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block">Amount</Label>
                  <Input type="number" min="0" step="0.01" value={rentInvoiceForm.amount} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Due Date</Label>
                  <Input type="date" value={rentInvoiceForm.due_date} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, due_date: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Status</Label>
                  <Select value={rentInvoiceForm.status} onValueChange={(value) => setRentInvoiceForm((prev) => ({ ...prev, status: value as RentInvoiceStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={createRentInvoice.isPending}>{createRentInvoice.isPending ? 'Creating...' : 'Create Invoice'}</Button>
                </div>
                <div className="md:col-span-4">
                  <Label className="mb-1 block">Period Description</Label>
                  <Input placeholder="January 2026" value={rentInvoiceForm.period_description} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, period_description: event.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-1 block">Notes</Label>
                  <Input placeholder="Optional note" value={rentInvoiceForm.notes} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, notes: event.target.value }))} />
                </div>
              </form>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">Status Filter</Label>
                  <Select value={rentStatus} onValueChange={(value) => setRentStatus(value as 'ALL' | RentInvoiceStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RENT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block">Location Filter</Label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>{location.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {rentInvoicesLoading ? (
                <LoadingState message="Loading rent invoices..." />
              ) : rentInvoices.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell><div className="font-medium">{invoice.invoice_number}</div><div className="text-xs text-muted-foreground">Due: {invoice.due_date ? formatDateTime(invoice.due_date) : '-'}</div></TableCell>
                          <TableCell>{invoice.location_detail?.name || locationById.get(invoice.location) || '-'}</TableCell>
                          <TableCell>{invoice.period_description}</TableCell>
                          <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                          <TableCell>{formatCurrency(invoice.paid_amount, invoice.currency)}</TableCell>
                          <TableCell>{formatCurrency(invoice.remaining_amount, invoice.currency)}</TableCell>
                          <TableCell><Badge variant={getRentStatusVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openPaymentDialog(invoice)} disabled={invoice.status === 'CANCELLED'}>Add Payment</Button>
                              <Button variant="outline" size="sm" onClick={() => handleMarkRentInvoicePaid(invoice)} disabled={invoice.status === 'PAID' || invoice.status === 'CANCELLED' || markRentInvoicePaid.isPending}>Mark Paid</Button>
                              <Button variant="outline" size="sm" onClick={() => openRentInvoiceEdit(invoice)}><Edit className="mr-1 h-4 w-4" /> Edit</Button>
                              <Button variant="outline" size="sm" onClick={() => handleCancelRentInvoice(invoice)} disabled={invoice.status === 'CANCELLED' || updateRentInvoice.isPending}>Cancel</Button>
                              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ kind: 'rentInvoice', id: invoice.id, label: invoice.invoice_number })}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No rent invoices" description="Create your first rent invoice." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rent Receipts</CardTitle>
              <CardDescription>Payment receipts for rent invoices. A receipt is created automatically when you add a payment.</CardDescription>
            </CardHeader>
            <CardContent>
              {rentReceiptsLoading ? (
                <LoadingState message="Loading rent receipts..." />
              ) : rentReceipts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentReceipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                          <TableCell>{receipt.rent_invoice_detail?.invoice_number ?? receipt.rent_invoice}</TableCell>
                          <TableCell>{receipt.rent_invoice_detail?.location_name ?? '-'}</TableCell>
                          <TableCell>{formatCurrency(receipt.amount, currency)}</TableCell>
                          <TableCell>{receipt.payment_method}</TableCell>
                          <TableCell>{receipt.payment_date ? formatDateTime(receipt.payment_date) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No rent receipts" description="Receipts appear here when you add a payment to a rent invoice." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bills</CardTitle>
              <CardDescription>Create bills and manage line items linked to inventory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-3 md:grid-cols-6" onSubmit={handleCreateBill}>
                <div className="md:col-span-2">
                  <Label className="mb-1 block">Vendor</Label>
                  <Input placeholder="Vendor name" value={billForm.vendor_name} onChange={(event) => setBillForm((prev) => ({ ...prev, vendor_name: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Bill #</Label>
                  <Input placeholder="Optional" value={billForm.bill_number} onChange={(event) => setBillForm((prev) => ({ ...prev, bill_number: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Bill Date</Label>
                  <Input type="date" value={billForm.bill_date} onChange={(event) => setBillForm((prev) => ({ ...prev, bill_date: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Due Date</Label>
                  <Input type="date" value={billForm.due_date} onChange={(event) => setBillForm((prev) => ({ ...prev, due_date: event.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={createBill.isPending}><Plus className="mr-1 h-4 w-4" />{createBill.isPending ? 'Creating...' : 'Create Bill'}</Button>
                </div>
                <div>
                  <Label className="mb-1 block">Status</Label>
                  <Select value={billForm.status} onValueChange={(value) => setBillForm((prev) => ({ ...prev, status: value as BillStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-5">
                  <Label className="mb-1 block">Notes</Label>
                  <Input placeholder="Optional note" value={billForm.notes} onChange={(event) => setBillForm((prev) => ({ ...prev, notes: event.target.value }))} />
                </div>
              </form>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">Status Filter</Label>
                  <Select value={billStatus} onValueChange={(value) => setBillStatus(value as 'ALL' | BillStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BILL_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block">Vendor Filter</Label>
                  <Input placeholder="Search by vendor" value={billSearch} onChange={(event) => setBillSearch(event.target.value)} />
                </div>
              </div>

              {billsLoading ? (
                <LoadingState message="Loading bills..." />
              ) : bills.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Bill #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Line Items</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell>{bill.vendor_name}</TableCell>
                          <TableCell>{bill.bill_number || '-'}</TableCell>
                          <TableCell><div>{formatDateTime(bill.bill_date)}</div><div className="text-xs text-muted-foreground">Due: {bill.due_date ? formatDateTime(bill.due_date) : '-'}</div></TableCell>
                          <TableCell>{formatCurrency(bill.total_amount, bill.currency)}</TableCell>
                          <TableCell><Badge variant={getBillStatusVariant(bill.status)}>{bill.status}</Badge></TableCell>
                          <TableCell>{bill.line_items?.length || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openBillLineManager(bill)}><Wrench className="mr-1 h-4 w-4" /> Manage Lines</Button>
                              <Button variant="outline" size="sm" onClick={() => handleMarkBillPaid(bill)} disabled={bill.status === 'PAID' || bill.status === 'CANCELLED' || markBillPaid.isPending}>Mark Paid</Button>
                              <Button variant="outline" size="sm" onClick={() => openBillEdit(bill)}><Edit className="mr-1 h-4 w-4" /> Edit</Button>
                              <Button variant="outline" size="sm" onClick={() => handleCancelBill(bill)} disabled={bill.status === 'CANCELLED' || updateBill.isPending}>Cancel</Button>
                              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ kind: 'bill', id: bill.id, label: bill.bill_number || `Bill #${bill.id}` })}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No bills" description="Create a bill and add line items for academy costs." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>Add items, edit stock details, and adjust quantity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-3 md:grid-cols-6" onSubmit={handleCreateInventoryItem}>
                <div className="md:col-span-2">
                  <Label className="mb-1 block">Name</Label>
                  <Input placeholder="Balls" value={inventoryForm.name} onChange={(event) => setInventoryForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Quantity</Label>
                  <Input type="number" min="0" value={inventoryForm.quantity} onChange={(event) => setInventoryForm((prev) => ({ ...prev, quantity: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Unit</Label>
                  <Input placeholder="pcs" value={inventoryForm.unit} onChange={(event) => setInventoryForm((prev) => ({ ...prev, unit: event.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Reorder Level</Label>
                  <Input type="number" min="0" value={inventoryForm.reorder_level} onChange={(event) => setInventoryForm((prev) => ({ ...prev, reorder_level: event.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={createInventoryItem.isPending}>{createInventoryItem.isPending ? 'Adding...' : 'Add Item'}</Button>
                </div>
                <div className="md:col-span-6">
                  <Label className="mb-1 block">Description</Label>
                  <Input placeholder="Optional description" value={inventoryForm.description} onChange={(event) => setInventoryForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
              </form>

              {inventoryLoading ? (
                <LoadingState message="Loading inventory..." />
              ) : inventoryItems.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Reorder Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryItems.map((item) => {
                        const isLowStock = item.reorder_level !== undefined && item.reorder_level !== null && item.quantity <= item.reorder_level;
                        return (
                          <TableRow key={item.id}>
                            <TableCell><div className="font-medium">{item.name}</div>{item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit || '-'}</TableCell>
                            <TableCell>{item.reorder_level ?? '-'}</TableCell>
                            <TableCell><Badge variant={isLowStock ? 'warning' : 'success'}>{isLowStock ? 'Low stock' : 'Healthy'}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openInventoryEdit(item)}><Edit className="mr-1 h-4 w-4" /> Edit</Button>
                                <Button variant="outline" size="sm" onClick={() => { setAdjustInventoryTarget(item); setAdjustDelta(''); }}>Adjust Qty</Button>
                                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ kind: 'inventory', id: item.id, label: item.name })}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No inventory items" description="Create inventory items like balls, cones, and other materials." />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={!!editingRentConfig} onOpenChange={(open) => !open && setEditingRentConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rent Config</DialogTitle>
            <DialogDescription>Update amount, location, or period.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateRentConfig}>
            <div>
              <Label className="mb-1 block">Location</Label>
              <Select value={rentConfigForm.location} onValueChange={(value) => setRentConfigForm((prev) => ({ ...prev, location: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>{location.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Amount</Label>
                <Input type="number" min="0" step="0.01" value={rentConfigForm.amount} onChange={(event) => setRentConfigForm((prev) => ({ ...prev, amount: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Period</Label>
                <Select value={rentConfigForm.period_type} onValueChange={(value) => setRentConfigForm((prev) => ({ ...prev, period_type: value as RentPeriodType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAY">Per day</SelectItem>
                    <SelectItem value="MONTH">Per month</SelectItem>
                    <SelectItem value="SESSION">Per session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRentConfig(null)}>Cancel</Button>
              <Button type="submit" disabled={updateRentConfig.isPending}>{updateRentConfig.isPending ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRentInvoice} onOpenChange={(open) => !open && setEditingRentInvoice(null)}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Edit Rent Invoice</DialogTitle>
            <DialogDescription>Adjust fields or update status.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateRentInvoice}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block">Location</Label>
                <Select value={rentInvoiceForm.location} onValueChange={(value) => setRentInvoiceForm((prev) => ({ ...prev, location: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={String(location.id)}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Amount</Label>
                <Input type="number" min="0" step="0.01" value={rentInvoiceForm.amount} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, amount: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Due Date</Label>
                <Input type="date" value={rentInvoiceForm.due_date} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, due_date: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Status</Label>
                <Select value={rentInvoiceForm.status} onValueChange={(value) => setRentInvoiceForm((prev) => ({ ...prev, status: value as RentInvoiceStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Period Description</Label>
              <Input value={rentInvoiceForm.period_description} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, period_description: event.target.value }))} />
            </div>
            <div>
              <Label className="mb-1 block">Notes</Label>
              <Textarea rows={3} value={rentInvoiceForm.notes} onChange={(event) => setRentInvoiceForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRentInvoice(null)}>Cancel</Button>
              <Button type="submit" disabled={updateRentInvoice.isPending}>{updateRentInvoice.isPending ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentTarget} onOpenChange={(open) => !open && setPaymentTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Rent Payment</DialogTitle>
            <DialogDescription>{paymentTarget ? `Invoice ${paymentTarget.invoice_number} remaining ${formatCurrency(paymentTarget.remaining_amount, paymentTarget.currency)}.` : 'Add payment.'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddPayment}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block">Amount</Label>
                <Input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Payment Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, payment_method: value as PaymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Payment Date</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={(event) => setPaymentForm((prev) => ({ ...prev, payment_date: event.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Notes</Label>
              <Textarea rows={3} value={paymentForm.notes} onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={addRentPayment.isPending}>{addRentPayment.isPending ? 'Saving...' : 'Add Payment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={batchRentPaymentOpen} onOpenChange={(open) => !open && setBatchRentPaymentOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add multiple rent payments</DialogTitle>
            <DialogDescription>Record several rent payments at once. Shared payment method and date apply to all rows.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBatchRentPaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block">Payment method (all rows)</Label>
                <Select value={batchRentShared.payment_method} onValueChange={(v) => setBatchRentShared((p) => ({ ...p, payment_method: v as PaymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Payment date (all rows)</Label>
                <Input type="date" value={batchRentShared.payment_date} onChange={(e) => setBatchRentShared((p) => ({ ...p, payment_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Payments</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setBatchRentRows((rows) => [...rows, { rent_invoice_id: '', amount: '', notes: '' }])}>
                  <Plus className="mr-1 h-4 w-4" /> Add row
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchRentRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            value={row.rent_invoice_id || '__none__'}
                            onValueChange={(v) =>
                              setBatchRentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], rent_invoice_id: v === '__none__' ? '' : v };
                                return next;
                              })
                            }
                          >
                            <SelectTrigger className="min-w-[180px]"><SelectValue placeholder="Select invoice" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Select invoice</SelectItem>
                              {rentInvoices
                                .filter((inv) => inv.status !== 'CANCELLED')
                                .map((inv) => (
                                  <SelectItem key={inv.id} value={String(inv.id)}>
                                    {inv.invoice_number} – {inv.location_detail?.name ?? '-'} – {formatCurrency(inv.remaining_amount, inv.currency)} left
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={(e) =>
                              setBatchRentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], amount: e.target.value };
                                return next;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Notes"
                            value={row.notes}
                            onChange={(e) =>
                              setBatchRentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], notes: e.target.value };
                                return next;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {batchRentRows.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBatchRentRows((rows) => rows.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {batchRentProgress && (
              <p className="text-sm text-muted-foreground">
                Recording {batchRentProgress.current} of {batchRentProgress.total}…
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBatchRentPaymentOpen(false)} disabled={batchRentSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={batchRentSubmitting}>
                {batchRentSubmitting ? 'Submitting…' : 'Submit all'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingBill} onOpenChange={(open) => !open && setEditingBill(null)}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>Update vendor details, dates, and status.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateBill}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block">Vendor</Label>
                <Input value={billForm.vendor_name} onChange={(event) => setBillForm((prev) => ({ ...prev, vendor_name: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Bill #</Label>
                <Input value={billForm.bill_number} onChange={(event) => setBillForm((prev) => ({ ...prev, bill_number: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Bill Date</Label>
                <Input type="date" value={billForm.bill_date} onChange={(event) => setBillForm((prev) => ({ ...prev, bill_date: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Due Date</Label>
                <Input type="date" value={billForm.due_date} onChange={(event) => setBillForm((prev) => ({ ...prev, due_date: event.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Status</Label>
                <Select value={billForm.status} onValueChange={(value) => setBillForm((prev) => ({ ...prev, status: value as BillStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Notes</Label>
              <Textarea rows={3} value={billForm.notes} onChange={(event) => setBillForm((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingBill(null)}>Cancel</Button>
              <Button type="submit" disabled={updateBill.isPending}>{updateBill.isPending ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedBillForLines} onOpenChange={(open) => !open && setSelectedBillForLines(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Manage Bill Line Items</DialogTitle>
            <DialogDescription>
              {selectedBillForLines
                ? `Bill ${selectedBillForLines.bill_number || `#${selectedBillForLines.id}`} (${selectedBillForLines.vendor_name}).`
                : 'Manage line items.'}
            </DialogDescription>
          </DialogHeader>

          {billLineItemsError && (
            <ErrorState error={billLineItemsError as Error} onRetry={() => void refetchBillLineItems()} title="Failed to load line items" />
          )}

          <form className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-6" onSubmit={handleBillLineSubmit}>
            <div className="md:col-span-2">
              <Label className="mb-1 block">Description</Label>
              <Input value={lineItemForm.description} onChange={(event) => setLineItemForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Football balls" />
            </div>
            <div>
              <Label className="mb-1 block">Qty</Label>
              <Input type="number" min="1" value={lineItemForm.quantity} onChange={(event) => setLineItemForm((prev) => ({ ...prev, quantity: event.target.value }))} />
            </div>
            <div>
              <Label className="mb-1 block">Unit Price</Label>
              <Input type="number" min="0" step="0.01" value={lineItemForm.unit_price} onChange={(event) => setLineItemForm((prev) => ({ ...prev, unit_price: event.target.value }))} />
            </div>
            <div>
              <Label className="mb-1 block">Inventory Link</Label>
              <Select value={lineItemForm.inventory_item} onValueChange={(value) => setLineItemForm((prev) => ({ ...prev, inventory_item: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No link</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1" disabled={createBillLineItem.isPending || updateBillLineItem.isPending}>{editingLineItemId ? 'Update' : 'Add'}</Button>
              {editingLineItemId && <Button type="button" variant="outline" onClick={resetLineItemForm}>Reset</Button>}
            </div>
          </form>

          {billLineItemsLoading ? (
            <LoadingState message="Loading bill line items..." />
          ) : billLineItems.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billLineItems.map((lineItem) => (
                    <TableRow key={lineItem.id}>
                      <TableCell>{lineItem.description}</TableCell>
                      <TableCell>{lineItem.quantity}</TableCell>
                      <TableCell>{formatCurrency(lineItem.unit_price, selectedBillForLines?.currency || currency)}</TableCell>
                      <TableCell>{formatCurrency(lineItem.line_total, selectedBillForLines?.currency || currency)}</TableCell>
                      <TableCell>{lineItem.inventory_item_detail?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingLineItemId(lineItem.id);
                            setLineItemForm({
                              description: lineItem.description,
                              quantity: String(lineItem.quantity),
                              unit_price: String(lineItem.unit_price),
                              inventory_item: lineItem.inventory_item ? String(lineItem.inventory_item) : 'NONE',
                            });
                          }}><Edit className="mr-1 h-4 w-4" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ kind: 'billLineItem', id: lineItem.id, label: lineItem.description })}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No line items" description="Add at least one line item so the bill has a total amount." />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedBillForLines(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingInventory} onOpenChange={(open) => !open && setEditingInventory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update quantity and item details.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateInventory}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div><Label className="mb-1 block">Name</Label><Input value={inventoryForm.name} onChange={(event) => setInventoryForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
              <div><Label className="mb-1 block">Quantity</Label><Input type="number" min="0" value={inventoryForm.quantity} onChange={(event) => setInventoryForm((prev) => ({ ...prev, quantity: event.target.value }))} /></div>
              <div><Label className="mb-1 block">Unit</Label><Input value={inventoryForm.unit} onChange={(event) => setInventoryForm((prev) => ({ ...prev, unit: event.target.value }))} /></div>
              <div><Label className="mb-1 block">Reorder Level</Label><Input type="number" min="0" value={inventoryForm.reorder_level} onChange={(event) => setInventoryForm((prev) => ({ ...prev, reorder_level: event.target.value }))} /></div>
            </div>
            <div><Label className="mb-1 block">Description</Label><Textarea rows={3} value={inventoryForm.description} onChange={(event) => setInventoryForm((prev) => ({ ...prev, description: event.target.value }))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingInventory(null)}>Cancel</Button>
              <Button type="submit" disabled={updateInventoryItem.isPending}>{updateInventoryItem.isPending ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustInventoryTarget} onOpenChange={(open) => !open && setAdjustInventoryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory Quantity</DialogTitle>
            <DialogDescription>{adjustInventoryTarget ? `Current quantity for ${adjustInventoryTarget.name}: ${adjustInventoryTarget.quantity}. Use positive or negative value.` : 'Adjust inventory quantity.'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAdjustInventory}>
            <div>
              <Label className="mb-1 block">Delta</Label>
              <Input type="number" value={adjustDelta} onChange={(event) => setAdjustDelta(event.target.value)} placeholder="e.g. 5 or -2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustInventoryTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={adjustInventoryQuantity.isPending}>{adjustInventoryQuantity.isPending ? 'Applying...' : 'Apply Delta'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>{deleteTarget ? `Are you sure you want to delete "${deleteTarget.label}"? This action cannot be undone.` : 'Confirm delete action.'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteRentConfig.isPending || deleteRentInvoice.isPending || deleteBill.isPending || deleteBillLineItem.isPending || deleteInventoryItem.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

