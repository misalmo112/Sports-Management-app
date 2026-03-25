/**
 * Invoice Detail Page
 * View invoice details
 */
import { useParams, useNavigate } from 'react-router-dom';
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
import { Badge } from '@/shared/components/ui/badge';
import { Receipt, ArrowLeft, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { useInvoice, useUpdateInvoice, useDeleteInvoice } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { UpdateInvoiceRequest } from '../types';
import { useState } from 'react';

const formatStatus = (status: string) => {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    DRAFT: { label: 'Draft', variant: 'secondary' },
    SENT: { label: 'Sent', variant: 'outline' },
    PARTIALLY_PAID: { label: 'Partially Paid', variant: 'outline' },
    PAID: { label: 'Paid', variant: 'default' },
    OVERDUE: { label: 'Overdue', variant: 'destructive' },
    CANCELLED: { label: 'Cancelled', variant: 'secondary' },
  };
  return statusMap[status] || { label: status, variant: 'secondary' };
};

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

export const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateInvoiceRequest>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: invoice, isLoading, error, refetch } = useInvoice(id);
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading invoice..." />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Invoice not found')}
          onRetry={() => refetch()}
          title="Failed to load invoice"
        />
      </div>
    );
  }

  const statusInfo = formatStatus(invoice.status);
  const invoiceCurrency = invoice.currency;

  const handleEditClick = () => {
    setEditFormData({
      due_date: invoice.due_date || undefined,
      issued_date: invoice.issued_date || undefined,
      notes: invoice.notes || undefined,
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors({});

    if (!id) return;

    try {
      await updateInvoice.mutateAsync({ id, data: editFormData });
      setIsEditModalOpen(false);
      setEditFormData({});
      setSuccessMessage('Invoice updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      refetch();
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update invoice'],
        });
      }
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;

    try {
      await deleteInvoice.mutateAsync(id);
      setIsDeleteDialogOpen(false);
      setSuccessMessage('Invoice deleted successfully');
      setTimeout(() => {
        setSuccessMessage(null);
        navigate('/dashboard/finance/invoices');
      }, 1000);
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to delete invoice'],
      });
    }
  };

  const canEdit = invoice.status === 'DRAFT' || invoice.status === 'SENT';
  const canDelete = invoice.status === 'DRAFT';

  return (
    <div className="container mx-auto py-8">
      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/finance/invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={handleEditClick}
              disabled={updateInvoice.isPending || deleteInvoice.isPending}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={updateInvoice.isPending || deleteInvoice.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button
            onClick={() =>
              navigate(`/dashboard/finance/receipts/new?invoice=${invoice.id}`)
            }
            disabled={invoice.status === 'CANCELLED' || invoice.status === 'PAID'}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Record Receipt
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Invoice Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{invoice.invoice_number}</CardTitle>
                <CardDescription className="mt-2">
                  Created: {formatDateTime(invoice.created_at)}
                </CardDescription>
              </div>
              <Badge variant={statusInfo.variant} className="text-lg px-4 py-2">
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Parent</h3>
                <p className="font-medium">{invoice.parent_name || '—'}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.parent_email || '—'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Dates</h3>
                <p className="text-sm">
                  <span className="text-muted-foreground">Issued:</span>{' '}
                  {invoice.issued_date ? formatDateTime(invoice.issued_date) : '—'}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Due:</span>{' '}
                  {invoice.due_date ? formatDateTime(invoice.due_date) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        {invoice.items && invoice.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.student_name || '—'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price, invoiceCurrency)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.line_total, invoiceCurrency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal, invoiceCurrency)}</span>
              </div>
              {parseFloat(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Discount{' '}
                    {invoice.discount_type === 'PERCENTAGE'
                      ? `(${invoice.discount_value}%)`
                      : '(Fixed)'}
                    :
                  </span>
                  <span>-{formatCurrency(invoice.discount_amount, invoiceCurrency)}</span>
                </div>
              )}
              {parseFloat(invoice.tax_amount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax:</span>
                  <span>+{formatCurrency(invoice.tax_amount, invoiceCurrency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total, invoiceCurrency)}</span>
              </div>
              {invoice.paid_amount && parseFloat(invoice.paid_amount) > 0 && (
                <div className="flex justify-between text-muted-foreground pt-2">
                  <span>Paid:</span>
                  <span>{formatCurrency(invoice.paid_amount, invoiceCurrency)}</span>
                </div>
              )}
              {invoice.remaining_balance && parseFloat(invoice.remaining_balance) > 0 && (
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Remaining Balance:</span>
                  <span className="text-destructive">
                    {formatCurrency(invoice.remaining_balance, invoiceCurrency)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receipts */}
        {invoice.receipts && invoice.receipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>Payment receipts for this invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt Number</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">
                          {receipt.receipt_number}
                        </TableCell>
                        <TableCell>{receipt.sport_detail?.name || 'â€”'}</TableCell>
                        <TableCell>{receipt.location_detail?.name || 'â€”'}</TableCell>
                        <TableCell>{formatPaymentMethod(receipt.payment_method)}</TableCell>
                        <TableCell>
                          {formatDateTime(receipt.payment_date)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(receipt.amount, invoiceCurrency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Invoice Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details. Note: Only DRAFT and SENT invoices can be edited.
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
                <Label htmlFor="issued_date">Issued Date</Label>
                <Input
                  id="issued_date"
                  type="date"
                  value={editFormData.issued_date || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, issued_date: e.target.value || undefined }));
                    if (editErrors.issued_date) setEditErrors((prev) => clearFieldError(prev, 'issued_date'));
                  }}
                  disabled={updateInvoice.isPending}
                />
                {editErrors.issued_date && (
                  <p className="text-sm text-destructive">{editErrors.issued_date[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={editFormData.due_date || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, due_date: e.target.value || undefined }));
                    if (editErrors.due_date) setEditErrors((prev) => clearFieldError(prev, 'due_date'));
                  }}
                  disabled={updateInvoice.isPending}
                />
                {editErrors.due_date && (
                  <p className="text-sm text-destructive">{editErrors.due_date[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editFormData.notes || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, notes: e.target.value || undefined }));
                    if (editErrors.notes) setEditErrors((prev) => clearFieldError(prev, 'notes'));
                  }}
                  rows={4}
                  placeholder="Optional notes..."
                  disabled={updateInvoice.isPending}
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
                  setEditFormData({});
                  setEditErrors({});
                }}
                disabled={updateInvoice.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateInvoice.isPending}>
                {updateInvoice.isPending ? 'Updating...' : 'Update Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice "{invoice.invoice_number}"? This action cannot be undone.
              Only DRAFT invoices can be deleted.
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
                setEditErrors({});
              }}
              disabled={deleteInvoice.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteInvoice.isPending || !canDelete}
            >
              {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
