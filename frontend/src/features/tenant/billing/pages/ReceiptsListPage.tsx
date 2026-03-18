/**
 * Receipts List Page
 * Lists all receipts (student fees, rent, staff salary, paid bills) with search and filter.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Plus, Eye, ChevronLeft, ChevronRight, Edit, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { useReceipts, useUpdateReceipt, useDeleteReceipt } from '../hooks/hooks';
import { useRentReceipts, useBills } from '@/features/tenant/facilities/hooks/hooks';
import { useStaffReceipts } from '@/features/tenant/coaches/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import {
  normalizeUnifiedReceipts,
  filterUnifiedReceipts,
  PAGE_SIZE as UNIFIED_PAGE_SIZE,
} from '../utils/normalizeUnifiedReceipts';
import type { UpdateReceiptRequest, Receipt, ReceiptClassification } from '../types';

const formatPaymentMethod = (method: string) => {
  const methodMap: Record<string, string> = {
    CASH: 'Cash',
    CARD: 'Card',
    BANK_TRANSFER: 'Bank Transfer',
    CHECK: 'Check',
    OTHER: 'Other',
  };
  return methodMap[method] || method;
};

const CLASSIFICATION_LABELS: Record<ReceiptClassification | 'ALL', string> = {
  ALL: 'All',
  student_fee: 'Student fees',
  rent: 'Rent',
  staff_salary: 'Staff salary',
  bill: 'Bills',
};

export const ReceiptsListPage = () => {
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const [searchParams] = useSearchParams();
  const invoiceFilter = searchParams.get('invoice');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | ReceiptClassification>('ALL');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateReceiptRequest>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pageSize = 20;

  const isUnifiedView = !invoiceFilter;

  const { data, isLoading, error, refetch } = useReceipts({
    invoice: invoiceFilter ? parseInt(invoiceFilter) : undefined,
    page: isUnifiedView ? 1 : page,
    page_size: isUnifiedView ? UNIFIED_PAGE_SIZE : pageSize,
  });
  const { data: rentData, isLoading: rentLoading, refetch: refetchRent } = useRentReceipts({
    page_size: UNIFIED_PAGE_SIZE,
  });
  const { data: staffData, isLoading: staffLoading, refetch: refetchStaff } = useStaffReceipts({
    page_size: UNIFIED_PAGE_SIZE,
  });
  const { data: billsData, isLoading: billsLoading, refetch: refetchBills } = useBills({
    status: 'PAID',
    page_size: UNIFIED_PAGE_SIZE,
  });

  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();

  const unifiedList = useMemo(() => {
    if (!isUnifiedView || !data?.results) return [];
    return normalizeUnifiedReceipts(
      data.results,
      rentData?.results ?? [],
      staffData?.results ?? [],
      billsData?.results ?? []
    );
  }, [isUnifiedView, data?.results, rentData?.results, staffData?.results, billsData?.results]);

  const filteredList = useMemo(
    () => filterUnifiedReceipts(unifiedList, searchQuery, classificationFilter),
    [unifiedList, searchQuery, classificationFilter]
  );

  const allLoading = isUnifiedView && (isLoading || rentLoading || staffLoading || billsLoading);
  const allError = isUnifiedView ? (error ?? null) : error;

  const refetchAll = () => {
    refetch();
    if (isUnifiedView) {
      refetchRent();
      refetchStaff();
      refetchBills();
    }
  };

  const handleNextPage = () => {
    if (data?.next) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (data?.previous) {
      setPage((prev) => Math.max(1, prev - 1));
    }
  };

  const getTotalPages = () => {
    if (!data?.count) return 0;
    return Math.ceil(data.count / pageSize);
  };

  const handleEditClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setEditFormData({
      amount: parseFloat(receipt.amount),
      payment_method: receipt.payment_method,
      payment_date: receipt.payment_date.split('T')[0],
      notes: receipt.notes || undefined,
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors({});

    if (!selectedReceipt) return;

    try {
      await updateReceipt.mutateAsync({ id: selectedReceipt.id, data: editFormData });
      setIsEditModalOpen(false);
      setSelectedReceipt(null);
      setEditFormData({});
      setSuccessMessage('Receipt updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      refetchAll();
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update receipt'],
        });
      }
    }
  };

  const handleDeleteClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReceipt) return;

    try {
      await deleteReceipt.mutateAsync(selectedReceipt.id);
      setIsDeleteDialogOpen(false);
      setSelectedReceipt(null);
      setSuccessMessage('Receipt deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      refetchAll();
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to delete receipt'],
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Receipts</h1>
          <p className="text-muted-foreground mt-2">Manage academy receipts</p>
        </div>
        <Button onClick={() => navigate('/dashboard/finance/receipts/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Receipt
        </Button>
      </div>

      {(allError ?? error) && (
        <ErrorState
          error={allError ?? error}
          onRetry={refetchAll}
          title="Failed to load receipts"
          className="mb-6"
        />
      )}

      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receipts List</CardTitle>
          <CardDescription>
            {invoiceFilter
              ? `Receipts for invoice ${invoiceFilter}`
              : 'All receipts (student fees, rent, staff salary, paid bills)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUnifiedView && (
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Input
                placeholder="Search by name, receipt #, bill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={classificationFilter}
                onValueChange={(v) => setClassificationFilter(v as 'ALL' | ReceiptClassification)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CLASSIFICATION_LABELS) as Array<keyof typeof CLASSIFICATION_LABELS>).map((k) => (
                    <SelectItem key={k} value={k}>
                      {CLASSIFICATION_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {allLoading || (!isUnifiedView && isLoading) ? (
            <LoadingState message="Loading receipts..." />
          ) : isUnifiedView ? (
            filteredList.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classification</TableHead>
                      <TableHead>Ref #</TableHead>
                      <TableHead>Payer / Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{CLASSIFICATION_LABELS[row.classification]}</TableCell>
                        <TableCell className="font-medium">{row.ref_number}</TableCell>
                        <TableCell>{row.payer_or_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell>{formatDateTime(row.date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {row.linkTo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(row.linkTo!)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                            {row.classification === 'student_fee' && row.raw && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(row.raw!)}
                                  disabled={updateReceipt.isPending || deleteReceipt.isPending}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(row.raw!)}
                                  disabled={updateReceipt.isPending || deleteReceipt.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="No receipts found"
                description={
                  searchQuery || classificationFilter !== 'ALL'
                    ? 'Try changing search or filter.'
                    : 'Get started by creating your first receipt or recording a payment.'
                }
                actionLabel="Create Receipt"
                onAction={() => navigate('/dashboard/finance/receipts/new')}
              />
            )
          ) : data?.results && data.results.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt Number</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.results.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">
                          {receipt.receipt_number}
                        </TableCell>
                        <TableCell>{receipt.invoice_number}</TableCell>
                        <TableCell>{receipt.sport_name || '—'}</TableCell>
                        <TableCell>{receipt.location_name || '—'}</TableCell>
                        <TableCell>{formatPaymentMethod(receipt.payment_method)}</TableCell>
                        <TableCell>
                          {formatDateTime(receipt.payment_date)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(receipt.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!receipt.invoice) return;
                                navigate(`/dashboard/finance/invoices/${receipt.invoice}`);
                              }}
                              disabled={!receipt.invoice}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Invoice
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(receipt)}
                              disabled={updateReceipt.isPending || deleteReceipt.isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(receipt)}
                              disabled={updateReceipt.isPending || deleteReceipt.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {data.count > pageSize && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, data.count)} of {data.count} receipts
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={!data.previous || page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {getTotalPages()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!data.next}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No receipts found"
              description="Get started by creating your first receipt."
              actionLabel="Create Receipt"
              onAction={() => navigate('/dashboard/finance/receipts/new')}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Receipt Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Receipt</DialogTitle>
            <DialogDescription>
              Update receipt details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              {editErrors.non_field_errors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {editErrors.non_field_errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="edit-amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.amount || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setEditFormData((prev) => ({ ...prev, amount: isNaN(value) ? 0 : value }));
                    if (editErrors.amount) setEditErrors((prev) => clearFieldError(prev, 'amount'));
                  }}
                  required
                  disabled={updateReceipt.isPending}
                />
                {editErrors.amount && (
                  <p className="text-sm text-destructive">{editErrors.amount[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-payment_method">Payment Method</Label>
                <Select
                  value={editFormData.payment_method || 'CASH'}
                  onValueChange={(value: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'OTHER') => {
                    setEditFormData((prev) => ({ ...prev, payment_method: value }));
                    if (editErrors.payment_method) setEditErrors((prev) => clearFieldError(prev, 'payment_method'));
                  }}
                  disabled={updateReceipt.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {editErrors.payment_method && (
                  <p className="text-sm text-destructive">{editErrors.payment_method[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-payment_date">Payment Date</Label>
                <Input
                  id="edit-payment_date"
                  type="date"
                  value={editFormData.payment_date || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, payment_date: e.target.value }));
                    if (editErrors.payment_date) setEditErrors((prev) => clearFieldError(prev, 'payment_date'));
                  }}
                  required
                  disabled={updateReceipt.isPending}
                />
                {editErrors.payment_date && (
                  <p className="text-sm text-destructive">{editErrors.payment_date[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editFormData.notes || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, notes: e.target.value || undefined }));
                    if (editErrors.notes) setEditErrors((prev) => clearFieldError(prev, 'notes'));
                  }}
                  rows={3}
                  placeholder="Optional notes..."
                  disabled={updateReceipt.isPending}
                />
                {editErrors.notes && (
                  <p className="text-sm text-destructive">{editErrors.notes[0]}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedReceipt(null);
                  setEditFormData({});
                  setEditErrors({});
                }}
                disabled={updateReceipt.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateReceipt.isPending}>
                {updateReceipt.isPending ? 'Updating...' : 'Update Receipt'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Receipt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete receipt "{selectedReceipt?.receipt_number}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {editErrors.non_field_errors && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {editErrors.non_field_errors.map((err, idx) => (
                  <div key={idx}>{err}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedReceipt(null);
                setEditErrors({});
              }}
              disabled={deleteReceipt.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteReceipt.isPending}
            >
              {deleteReceipt.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
