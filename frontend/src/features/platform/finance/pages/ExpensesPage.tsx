import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Receipt } from 'lucide-react';

import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
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
import { useCreateExpense } from '../hooks/useCreateExpense';
import { useOperationalExpenses } from '../hooks/useOperationalExpenses';
import { useUpdateExpense } from '../hooks/useUpdateExpense';
import type { OperationalExpense, OperationalExpenseCreate, ValidationErrors } from '../types';
import {
  BILLING_CYCLE_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  extractFinanceValidationErrors,
  formatBillingCycle,
  formatCurrency,
  formatDate,
  formatExpenseCategory,
} from '../utils';

interface ExpenseFormState {
  category: string;
  vendor_name: string;
  description: string;
  amount: string;
  currency: string;
  billing_cycle: string;
  due_date: string;
  notes: string;
}

const PAGE_SIZE = 20;

const createInitialExpenseForm = (): ExpenseFormState => ({
  category: 'CLOUD',
  vendor_name: '',
  description: '',
  amount: '',
  currency: 'USD',
  billing_cycle: 'MONTHLY',
  due_date: '',
  notes: '',
});

const createExpensePayload = (form: ExpenseFormState): OperationalExpenseCreate => ({
  category: form.category,
  vendor_name: form.vendor_name,
  description: form.description,
  amount: form.amount,
  currency: form.currency || 'USD',
  billing_cycle: form.billing_cycle,
  due_date: form.due_date || null,
  paid_date: null,
  is_paid: false,
  notes: form.notes,
});

export const ExpensesPage = () => {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [billingCycleFilter, setBillingCycleFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<OperationalExpense | null>(null);
  const [createForm, setCreateForm] = useState<ExpenseFormState>(createInitialExpenseForm());
  const [editForm, setEditForm] = useState<ExpenseFormState>(createInitialExpenseForm());
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [createErrors, setCreateErrors] = useState<ValidationErrors>({});
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});
  const [markPaidErrors, setMarkPaidErrors] = useState<ValidationErrors>({});

  const queryParams = useMemo(
    () => ({
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      billing_cycle: billingCycleFilter !== 'all' ? billingCycleFilter : undefined,
      is_paid: paidFilter === 'all' ? undefined : paidFilter === 'paid',
      page,
    }),
    [categoryFilter, billingCycleFilter, paidFilter, page]
  );

  const { data, isLoading, error, refetch } = useOperationalExpenses(queryParams);
  const { data: currenciesData, isLoading: isLoadingCurrencies } = usePlatformCurrencies({
    is_active: true,
  });
  const currencies = currenciesData?.results ?? [];
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 0;

  const resetCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateForm(createInitialExpenseForm());
    setCreateErrors({});
  };

  const resetEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedExpense(null);
    setEditForm(createInitialExpenseForm());
    setEditErrors({});
  };

  const resetMarkPaidDialog = () => {
    setIsMarkPaidDialogOpen(false);
    setSelectedExpense(null);
    setPaidDate(new Date().toISOString().split('T')[0]);
    setMarkPaidErrors({});
  };

  const handleCreateFieldChange = (field: keyof ExpenseFormState, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (createErrors[field]) {
      setCreateErrors((prev) => clearFieldError(prev, field));
    }
  };

  const handleEditFieldChange = (field: keyof ExpenseFormState, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => clearFieldError(prev, field));
    }
  };

  const openEditDialog = (expense: OperationalExpense) => {
    setSelectedExpense(expense);
    setEditErrors({});
    setEditForm({
      category: expense.category,
      vendor_name: expense.vendor_name,
      description: expense.description || '',
      amount: expense.amount,
      currency: expense.currency,
      billing_cycle: expense.billing_cycle,
      due_date: expense.due_date || '',
      notes: expense.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const openMarkPaidDialog = (expense: OperationalExpense) => {
    setSelectedExpense(expense);
    setPaidDate(new Date().toISOString().split('T')[0]);
    setMarkPaidErrors({});
    setIsMarkPaidDialogOpen(true);
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

  const renderExpenseForm = (
    formState: ExpenseFormState,
    errors: ValidationErrors,
    onFieldChange: (field: keyof ExpenseFormState, value: string) => void,
    isPending: boolean
  ) => (
    <div className="grid gap-4 py-4">
      {renderErrorAlert(errors)}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select
            value={formState.category}
            onValueChange={(value) => onFieldChange('category', value)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-sm text-destructive">{errors.category[0]}</p>}
        </div>
        <div className="grid gap-2">
          <Label>Billing Cycle</Label>
          <Select
            value={formState.billing_cycle}
            onValueChange={(value) => onFieldChange('billing_cycle', value)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select billing cycle" />
            </SelectTrigger>
            <SelectContent>
              {BILLING_CYCLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.billing_cycle && (
            <p className="text-sm text-destructive">{errors.billing_cycle[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-vendor-name">Vendor Name</Label>
        <Input
          id="expense-vendor-name"
          value={formState.vendor_name}
          onChange={(event) => onFieldChange('vendor_name', event.target.value)}
          disabled={isPending}
        />
        {errors.vendor_name && <p className="text-sm text-destructive">{errors.vendor_name[0]}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input
            id="expense-amount"
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
          <Label htmlFor="expense-currency">Currency</Label>
          <Select
            value={formState.currency || ''}
            onValueChange={(value) => onFieldChange('currency', value)}
            disabled={isPending}
          >
            <SelectTrigger id="expense-currency">
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

      <div className="grid gap-2">
        <Label htmlFor="expense-description">Description</Label>
        <Textarea
          id="expense-description"
          value={formState.description}
          onChange={(event) => onFieldChange('description', event.target.value)}
          disabled={isPending}
          rows={3}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description[0]}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-due-date">Due Date</Label>
        <Input
          id="expense-due-date"
          type="date"
          value={formState.due_date}
          onChange={(event) => onFieldChange('due_date', event.target.value)}
          disabled={isPending}
        />
        {errors.due_date && <p className="text-sm text-destructive">{errors.due_date[0]}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense-notes">Notes</Label>
        <Textarea
          id="expense-notes"
          value={formState.notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
          disabled={isPending}
          rows={4}
        />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes[0]}</p>}
      </div>
    </div>
  );

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateErrors({});

    try {
      await createExpense.mutateAsync(createExpensePayload(createForm));
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
    if (!selectedExpense) {
      return;
    }

    setEditErrors({});

    try {
      await updateExpense.mutateAsync({
        id: selectedExpense.id,
        data: {
          category: editForm.category,
          vendor_name: editForm.vendor_name,
          description: editForm.description,
          amount: editForm.amount,
          currency: editForm.currency || 'USD',
          billing_cycle: editForm.billing_cycle,
          due_date: editForm.due_date || null,
          notes: editForm.notes,
        },
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

  const handleMarkPaidSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedExpense) {
      return;
    }

    setMarkPaidErrors({});

    try {
      await updateExpense.mutateAsync({
        id: selectedExpense.id,
        data: {
          is_paid: true,
          paid_date: paidDate,
        },
      });
      resetMarkPaidDialog();
      refetch();
    } catch (submissionError) {
      const fieldErrors = extractFinanceValidationErrors(submissionError);
      if (fieldErrors) {
        setMarkPaidErrors(fieldErrors);
      } else {
        setMarkPaidErrors({ non_field_errors: [formatErrorMessage(submissionError)] });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="mt-2 text-muted-foreground">Platform operating costs</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={billingCycleFilter}
            onValueChange={(value) => {
              setBillingCycleFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Billing cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              {BILLING_CYCLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={paidFilter}
            onValueChange={(value) => {
              setPaidFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Receipt className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading operational expenses..." />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load operational expenses"
          fullPage
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expense Log</CardTitle>
            <CardDescription>Track paid and unpaid platform expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.results.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Cycle</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.results.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <Badge variant="outline">{formatExpenseCategory(expense.category)}</Badge>
                          </TableCell>
                          <TableCell>{expense.vendor_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(expense.amount, expense.currency)}
                          </TableCell>
                          <TableCell>{formatBillingCycle(expense.billing_cycle)}</TableCell>
                          <TableCell>{formatDate(expense.due_date)}</TableCell>
                          <TableCell>{formatDate(expense.paid_date)}</TableCell>
                          <TableCell>
                            <Badge variant={expense.is_paid ? 'default' : 'secondary'}>
                              {expense.is_paid ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openMarkPaidDialog(expense)}
                                disabled={expense.is_paid || updateExpense.isPending}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Mark as Paid
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(expense)}
                                disabled={updateExpense.isPending}
                              >
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                            </div>
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
                      {data.count} expenses
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
              <div className="text-sm text-muted-foreground">No expenses found for the current filters.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && resetCreateDialog()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Log a new platform operating cost.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            {renderExpenseForm(createForm, createErrors, handleCreateFieldChange, createExpense.isPending)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetCreateDialog} disabled={createExpense.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createExpense.isPending}>
                {createExpense.isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && resetEditDialog()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the selected operating expense.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            {renderExpenseForm(editForm, editErrors, handleEditFieldChange, updateExpense.isPending)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetEditDialog} disabled={updateExpense.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateExpense.isPending}>
                {updateExpense.isPending ? 'Updating...' : 'Update Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMarkPaidDialogOpen} onOpenChange={(open) => !open && resetMarkPaidDialog()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              {selectedExpense
                ? `Record the paid date for ${selectedExpense.vendor_name}.`
                : 'Record the payment date.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMarkPaidSubmit}>
            <div className="grid gap-4 py-4">
              {renderErrorAlert(markPaidErrors)}
              <div className="grid gap-2">
                <Label htmlFor="mark-paid-date">Paid Date</Label>
                <Input
                  id="mark-paid-date"
                  type="date"
                  value={paidDate}
                  onChange={(event) => {
                    setPaidDate(event.target.value);
                    if (markPaidErrors.paid_date) {
                      setMarkPaidErrors((prev) => clearFieldError(prev, 'paid_date'));
                    }
                  }}
                  disabled={updateExpense.isPending}
                />
                {markPaidErrors.paid_date && (
                  <p className="text-sm text-destructive">{markPaidErrors.paid_date[0]}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetMarkPaidDialog} disabled={updateExpense.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateExpense.isPending}>
                {updateExpense.isPending ? 'Saving...' : 'Mark Paid'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
