/**
 * Parent Invoice Detail Page
 * View invoice details for parent's children
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useInvoice } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { ArrowLeft, Calendar, DollarSign, FileText } from 'lucide-react';

export const ParentInvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading, error, refetch } = useInvoice(id);
  const { formatCurrency, formatDateTime } = useAcademyFormat();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'default';
      case 'OVERDUE':
        return 'destructive';
      case 'PARTIALLY_PAID':
        return 'secondary';
      case 'SENT':
        return 'outline';
      case 'DRAFT':
        return 'secondary';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: 'Draft',
      SENT: 'Sent',
      PARTIALLY_PAID: 'Partially Paid',
      PAID: 'Paid',
      OVERDUE: 'Overdue',
      CANCELLED: 'Cancelled',
    };
    return statusMap[status] || status;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard/parent/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </div>
        <LoadingState message="Loading invoice details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard/parent/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </div>
        <ErrorState error={error} onRetry={refetch} title="Failed to load invoice" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard/parent/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">Invoice not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/parent/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Invoice Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Invoice #{invoice.invoice_number}</CardTitle>
                <CardDescription className="mt-2">
                  {invoice.parent_detail?.full_name || 'Parent'}
                </CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-sm">
                {getStatusLabel(invoice.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground">Issue Date</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {formatDateTime(invoice.issued_date || invoice.created_at)}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {invoice.due_date ? formatDateTime(invoice.due_date) : '—'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Subtotal</Label>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{formatCurrency(invoice.subtotal)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Total</Label>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-lg">{formatCurrency(invoice.total)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
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
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          {item.student_name || (item.student ? `Student #${item.student}` : '—')}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Subtotal</Label>
                <p className="font-medium">{formatCurrency(invoice.subtotal)}</p>
              </div>
              {invoice.discount_amount && parseFloat(invoice.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">
                    Discount
                    {invoice.discount_type === 'PERCENTAGE' && invoice.discount_value
                      ? ` (${invoice.discount_value}%)`
                      : ''}
                  </Label>
                  <p className="font-medium text-green-600">
                    -{formatCurrency(invoice.discount_amount)}
                  </p>
                </div>
              )}
              {invoice.tax_amount && parseFloat(invoice.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Tax</Label>
                  <p className="font-medium">{formatCurrency(invoice.tax_amount)}</p>
                </div>
              )}
              <div className="flex justify-between border-t pt-3">
                <Label className="text-lg font-semibold">Total</Label>
                <p className="text-lg font-bold">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
