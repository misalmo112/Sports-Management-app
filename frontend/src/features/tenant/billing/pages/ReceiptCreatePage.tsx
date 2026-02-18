/**
 * Receipt Create Page
 * Create a new receipt
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
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
import { AlertCircle } from 'lucide-react';
import { useCreateReceipt } from '../hooks/hooks';
import { useInvoices } from '../hooks/hooks';
import { useInvoice } from '../hooks/hooks';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { CreateReceiptRequest } from '../types';

export const ReceiptCreatePage = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useAcademyFormat();
  const [searchParams] = useSearchParams();
  const invoiceIdFromQuery = searchParams.get('invoice');

  const [formData, setFormData] = useState<CreateReceiptRequest>({
    invoice: invoiceIdFromQuery ? parseInt(invoiceIdFromQuery) : 0,
    amount: 0,
    payment_method: 'CASH',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const createReceipt = useCreateReceipt();
  const { data: invoicesData } = useInvoices({ page_size: 100 });
  const { data: selectedInvoice } = useInvoice(
    formData.invoice > 0 ? formData.invoice.toString() : undefined
  );

  useEffect(() => {
    if (invoiceIdFromQuery) {
      setFormData((prev) => ({
        ...prev,
        invoice: parseInt(invoiceIdFromQuery),
      }));
    }
  }, [invoiceIdFromQuery]);

  const remainingBalance = selectedInvoice?.remaining_balance
    ? parseFloat(selectedInvoice.remaining_balance)
    : selectedInvoice?.total
      ? parseFloat(selectedInvoice.total)
      : 0;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoice || formData.invoice <= 0) {
      newErrors.invoice = 'Invoice is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0';
    } else if (formData.amount > remainingBalance) {
      newErrors.amount = `Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`;
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateReceiptRequest = {
        invoice: formData.invoice,
        amount: formData.amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
      };

      if (formData.notes?.trim()) {
        submitData.notes = formData.notes.trim();
      }

      await createReceipt.mutateAsync(submitData);
      
      // Navigate to invoice detail if we came from there, otherwise to receipts list
      if (invoiceIdFromQuery) {
        navigate(`/dashboard/finance/invoices/${formData.invoice}`);
      } else {
        navigate('/dashboard/finance/receipts');
      }
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create receipt'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => {
            if (invoiceIdFromQuery) {
              navigate(`/dashboard/finance/invoices/${invoiceIdFromQuery}`);
            } else {
              navigate('/dashboard/finance/receipts');
            }
          }}
        >
          ← Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Receipt</CardTitle>
          <CardDescription>Record a payment receipt for an invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="invoice">
                Invoice <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.invoice > 0 ? formData.invoice.toString() : ''}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    invoice: value ? parseInt(value) : 0,
                    amount: 0, // Reset amount when invoice changes
                  }));
                  if (errors.invoice) setErrors((prev) => clearFieldError(prev, 'invoice'));
                  if (clientErrors.invoice)
                    setClientErrors((prev) => ({ ...prev, invoice: '' }));
                }}
                disabled={createReceipt.isPending || !!invoiceIdFromQuery}
              >
                <SelectTrigger id="invoice">
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoicesData?.results.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id.toString()}>
                      {invoice.invoice_number} - {invoice.parent_name} (
                      {formatCurrency(invoice.total)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(errors.invoice || clientErrors.invoice) && (
                <p className="text-sm text-destructive">
                  {errors.invoice?.[0] || clientErrors.invoice}
                </p>
              )}
              {selectedInvoice && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice Total:</span>
                      <span className="font-medium">{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                    {selectedInvoice.paid_amount && parseFloat(selectedInvoice.paid_amount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid:</span>
                        <span>{formatCurrency(selectedInvoice.paid_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>Remaining Balance:</span>
                      <span className="text-destructive">
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingBalance}
                  value={formData.amount || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      amount: isNaN(value) ? 0 : value,
                    }));
                    if (errors.amount) setErrors((prev) => clearFieldError(prev, 'amount'));
                    if (clientErrors.amount)
                      setClientErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  placeholder="0.00"
                  required
                  disabled={createReceipt.isPending}
                />
                {(errors.amount || clientErrors.amount) && (
                  <p className="text-sm text-destructive">
                    {errors.amount?.[0] || clientErrors.amount}
                  </p>
                )}
                {selectedInvoice && remainingBalance > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Maximum: {formatCurrency(remainingBalance)}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment_method">
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      payment_method: value as CreateReceiptRequest['payment_method'],
                    }));
                    if (errors.payment_method)
                      setErrors((prev) => clearFieldError(prev, 'payment_method'));
                  }}
                  disabled={createReceipt.isPending}
                >
                  <SelectTrigger id="payment_method">
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
                {errors.payment_method && (
                  <p className="text-sm text-destructive">{errors.payment_method[0]}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment_date">
                Payment Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, payment_date: e.target.value }));
                  if (errors.payment_date)
                    setErrors((prev) => clearFieldError(prev, 'payment_date'));
                  if (clientErrors.payment_date)
                    setClientErrors((prev) => ({ ...prev, payment_date: '' }));
                }}
                required
                disabled={createReceipt.isPending}
              />
              {(errors.payment_date || clientErrors.payment_date) && (
                <p className="text-sm text-destructive">
                  {errors.payment_date?.[0] || clientErrors.payment_date}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, notes: e.target.value }));
                  if (errors.notes) setErrors((prev) => clearFieldError(prev, 'notes'));
                }}
                rows={3}
                placeholder="Optional notes about this payment..."
                disabled={createReceipt.isPending}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes[0]}</p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (invoiceIdFromQuery) {
                    navigate(`/dashboard/finance/invoices/${invoiceIdFromQuery}`);
                  } else {
                    navigate('/dashboard/finance/receipts');
                  }
                }}
                disabled={createReceipt.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createReceipt.isPending}>
                {createReceipt.isPending ? 'Creating...' : 'Create Receipt'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
