import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronLeft, ChevronRight, CreditCard, Download, Pencil } from 'lucide-react';

import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Textarea } from '@/shared/components/ui/textarea';
import { clearFieldError, formatErrorMessage } from '@/shared/utils/errorUtils';

import { usePlatformCurrencies } from '@/features/platform/masters/hooks/usePlatformCurrencies';
import { useCreatePayment } from '../hooks/useCreatePayment';
import { usePlatformPayments } from '../hooks/usePlatformPayments';
import { exportPayments, getAcademyOptions, updatePlatformPayment } from '../services/financeApi';
import type { PlatformPayment, PlatformPaymentCreate, ValidationErrors } from '../types';
import {
  PAYMENT_METHOD_OPTIONS,
  extractFinanceValidationErrors,
  formatCurrency,
  formatDate,
  formatPaymentMethod,
} from '../utils';

interface PaymentFormState {
  academy: string;
  subscription: string;
  amount: string;
  currency: string;
  payment_method: string;
  payment_date: string;
  invoice_ref: string;
  notes: string;
}

const PAGE_SIZE = 20;
const TODAY = new Date();
const DEFAULT_EXPORT_YEAR = TODAY.getFullYear();
const DEFAULT_EXPORT_MONTH = TODAY.getMonth() + 1;
const EXPORT_YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => DEFAULT_EXPORT_YEAR - index);
const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const createInitialFormState = (): PaymentFormState => ({
  academy: '',
  subscription: '',
  amount: '',
  currency: 'USD',
  payment_method: 'BANK_TRANSFER',
  payment_date: new Date().toISOString().split('T')[0],
  invoice_ref: '',
  notes: '',
});

const createPayload = (form: PaymentFormState): PlatformPaymentCreate => ({
  academy: form.academy,
  subscription: Number(form.subscription),
  amount: form.amount,
  currency: form.currency || 'USD',
  payment_method: form.payment_method,
  payment_date: form.payment_date,
  invoice_ref: form.invoice_ref || undefined,
  notes: form.notes || undefined,
});

export const PaymentsPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [paymentDateAfter, setPaymentDateAfter] = useState('');
  const [paymentDateBefore, setPaymentDateBefore] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PlatformPayment | null>(null);
  const [createForm, setCreateForm] = useState<PaymentFormState>(createInitialFormState());
  const [editForm, setEditForm] = useState<PaymentFormState>(createInitialFormState());
  const [createErrors, setCreateErrors] = useState<ValidationErrors>({});
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});
  const [exportYear, setExportYear] = useState(String(DEFAULT_EXPORT_YEAR));
  const [exportMonth, setExportMonth] = useState(String(DEFAULT_EXPORT_MONTH));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      payment_date_after: paymentDateAfter || undefined,
      payment_date_before: paymentDateBefore || undefined,
      page,
    }),
    [paymentDateAfter, paymentDateBefore, page]
  );

  const { data, isLoading, error, refetch } = usePlatformPayments(params);
  const { data: currenciesData, isLoading: isLoadingCurrencies } = usePlatformCurrencies({
    is_active: true,
  });
  const currencies = currenciesData?.results ?? [];
  const { data: academies = [] } = useQuery({
    queryKey: ['platform-academy-options'],
    queryFn: getAcademyOptions,
    staleTime: 60000,
  });
  const createPayment = useCreatePayment();
  const updatePayment = useMutation({
    mutationFn: ({ id, data: payload }: { id: number; data: Partial<PlatformPaymentCreate> }) =>
      updatePlatformPayment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 0;

  const handleCreateFieldChange = (field: keyof PaymentFormState, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (createErrors[field]) {
      setCreateErrors((prev) => clearFieldError(prev, field));
    }
  };

  const handleEditFieldChange = (field: keyof PaymentFormState, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => clearFieldError(prev, field));
    }
  };

  const openEditDialog = (payment: PlatformPayment) => {
    setSelectedPayment(payment);
    setEditErrors({});
    setEditForm({
      academy: payment.academy,
      subscription: String(payment.subscription),
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      invoice_ref: payment.invoice_ref || '',
      notes: payment.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateForm(createInitialFormState());
    setCreateErrors({});
  };

  const resetEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedPayment(null);
    setEditForm(createInitialFormState());
    setEditErrors({});
  };

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateErrors({});

    try {
      await createPayment.mutateAsync(createPayload(createForm));
      resetCreateDialog();
      refetch();
    } catch (submissionError) {
      const fieldErrors = extractFinanceValidationErrors(submissionError);
      if (fieldErrors) {
        setCreateErrors(fieldErrors);
      } else {
        setCreateErrors({ non_field_errors: [formatErrorMessage(submissionError)] });
      }
    }
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPayment) {
      return;
    }

    setEditErrors({});

    try {
      await updatePayment.mutateAsync({
        id: selectedPayment.id,
        data: createPayload(editForm),
      });
      resetEditDialog();
      refetch();
    } catch (submissionError) {
      const fieldErrors = extractFinanceValidationErrors(submissionError);
      if (fieldErrors) {
        setEditErrors(fieldErrors);
      } else {
        setEditErrors({ non_field_errors: [formatErrorMessage(submissionError)] });
      }
    }
  };

  const renderErrorAlert = (errors: ValidationErrors) => {
    if (!errors.non_field_errors) {
      return null;
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {errors.non_field_errors.map((message, index) => (
            <div key={`${message}-${index}`}>{message}</div>
          ))}
        </AlertDescription>
      </Alert>
    );
  };

  const renderPaymentForm = (
    formState: PaymentFormState,
    errors: ValidationErrors,
    onFieldChange: (field: keyof PaymentFormState, value: string) => void,
    isPending: boolean
  ) => (
    <div className="grid gap-4 py-4">
      {renderErrorAlert(errors)}

      <div className="grid gap-2">
        <Label>Academy</Label>
        <Select
          value={formState.academy || undefined}
          onValueChange={(value) => onFieldChange('academy', value)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select academy" />
          </SelectTrigger>
          <SelectContent>
            {academies.map((academy) => (
              <SelectItem key={academy.id} value={academy.id}>
                {academy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.academy && <p className="text-sm text-destructive">{errors.academy[0]}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payment-subscription">Subscription ID</Label>
        <Input
          id="payment-subscription"
          type="number"
          min="1"
          value={formState.subscription}
          onChange={(event) => onFieldChange('subscription', event.target.value)}
          disabled={isPending}
        />
        {errors.subscription && <p className="text-sm text-destructive">{errors.subscription[0]}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="payment-amount">Amount</Label>
          <Input
            id="payment-amount"
            type="number"
            step="0.01"
            min="0"
            value={formState.amount}
            onChange={(event) => onFieldChange('amount', event.target.value)}
            disabled={isPending}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount[0]}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="payment-currency">Currency</Label>
          <Select
            value={formState.currency || ''}
            onValueChange={(value) => onFieldChange('currency', value)}
            disabled={isPending}
          >
            <SelectTrigger id="payment-currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingCurrencies ? (
                <SelectItem value="__loading__" disabled>
                  Loading currencies...
                </SelectItem>
              ) : currencies.length === 0 ? (
                <SelectItem value="__empty__" disabled>
                  No currencies configured
                </SelectItem>
              ) : (
                currencies.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.name || c.code}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.currency && <p className="text-sm text-destructive">{errors.currency[0]}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Payment Method</Label>
          <Select
            value={formState.payment_method}
            onValueChange={(value) => onFieldChange('payment_method', value)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.payment_method && (
            <p className="text-sm text-destructive">{errors.payment_method[0]}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="payment-date">Payment Date</Label>
          <Input
            id="payment-date"
            type="date"
            value={formState.payment_date}
            onChange={(event) => onFieldChange('payment_date', event.target.value)}
            disabled={isPending}
          />
          {errors.payment_date && <p className="text-sm text-destructive">{errors.payment_date[0]}</p>}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payment-invoice-ref">Invoice Ref</Label>
        <Input
          id="payment-invoice-ref"
          value={formState.invoice_ref}
          onChange={(event) => onFieldChange('invoice_ref', event.target.value)}
          disabled={isPending}
        />
        {errors.invoice_ref && <p className="text-sm text-destructive">{errors.invoice_ref[0]}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payment-notes">Notes</Label>
        <Textarea
          id="payment-notes"
          value={formState.notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
          disabled={isPending}
          rows={4}
        />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes[0]}</p>}
      </div>
    </div>
  );

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const selectedYear = Number(exportYear);
      const selectedMonth = Number(exportMonth);
      const blob = await exportPayments(selectedYear, selectedMonth);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const paddedMonth = String(selectedMonth).padStart(2, '0');

      anchor.href = url;
      anchor.download = `payments_${selectedYear}_${paddedMonth}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (submissionError) {
      setExportError(formatErrorMessage(submissionError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="mt-2 text-muted-foreground">Revenue received from academies</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="payment-date-after">From</Label>
            <Input
              id="payment-date-after"
              type="date"
              value={paymentDateAfter}
              onChange={(event) => {
                setPaymentDateAfter(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-date-before">To</Label>
            <Input
              id="payment-date-before"
              type="date"
              value={paymentDateBefore}
              onChange={(event) => {
                setPaymentDateBefore(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Export Year</Label>
            <Select
              value={exportYear}
              onValueChange={(value) => {
                setExportYear(value);
                setExportError(null);
              }}
              disabled={exporting}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_YEAR_OPTIONS.map((yearOption) => (
                  <SelectItem key={yearOption} value={String(yearOption)}>
                    {yearOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Export Month</Label>
            <Select
              value={exportMonth}
              onValueChange={(value) => {
                setExportMonth(value);
                setExportError(null);
              }}
              disabled={exporting}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((monthOption) => (
                  <SelectItem key={monthOption.value} value={String(monthOption.value)}>
                    {monthOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Log Payment
          </Button>
        </div>
      </div>

      {exportError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <LoadingState message="Loading platform payments..." />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load platform payments"
          fullPage
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment Ledger</CardTitle>
            <CardDescription>Recorded payments across all academies</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.results.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Academy</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Invoice Ref</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.results.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                          <TableCell>{payment.academy_name}</TableCell>
                          <TableCell>{payment.plan_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>{payment.currency}</TableCell>
                          <TableCell>{formatPaymentMethod(payment.payment_method)}</TableCell>
                          <TableCell>{payment.invoice_ref || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(payment)}
                              disabled={updatePayment.isPending}
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {data.count > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, data.count)} of{' '}
                      {data.count} payments
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={!data.previous || page === 1}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={!data.next}
                      >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No payments found for the current filters.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && resetCreateDialog()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Log Payment</DialogTitle>
            <DialogDescription>Record a new platform payment from an academy.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            {renderPaymentForm(createForm, createErrors, handleCreateFieldChange, createPayment.isPending)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetCreateDialog} disabled={createPayment.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? 'Saving...' : 'Save Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && resetEditDialog()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>Update a recorded platform payment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            {renderPaymentForm(editForm, editErrors, handleEditFieldChange, updatePayment.isPending)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetEditDialog} disabled={updatePayment.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePayment.isPending}>
                {updatePayment.isPending ? 'Updating...' : 'Update Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
