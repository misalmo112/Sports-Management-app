/**
 * Receipts List Page
 * Lists all receipts
 */
import { useState } from 'react';
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
import { useReceipts, useUpdateReceipt, useDeleteReceipt } from '../hooks/hooks';
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
import { Input } from '@/shared/components/ui/input';
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
import type { UpdateReceiptRequest, Receipt } from '../types';

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

export const ReceiptsListPage = () => {
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const [searchParams] = useSearchParams();
  const invoiceFilter = searchParams.get('invoice');
  const [page, setPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateReceiptRequest>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useReceipts({
    invoice: invoiceFilter ? parseInt(invoiceFilter) : undefined,
    page,
    page_size: pageSize,
  });
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();

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
      refetch();
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
      refetch();
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

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
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
              : 'All receipts in the academy'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading receipts..." />
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
                        <TableCell>{receipt.sport_name || 'â€”'}</TableCell>
                        <TableCell>{receipt.location_name || 'â€”'}</TableCell>
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

              {/* Pagination */}
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
