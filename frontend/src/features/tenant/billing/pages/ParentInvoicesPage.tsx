/**
 * Parent Invoices Page
 * View invoices for parent's children
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
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
import { Badge } from '@/shared/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { X, Eye, Calendar } from 'lucide-react';

export const ParentInvoicesPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const { formatCurrency, formatDateTime } = useAcademyFormat();

  // Fetch invoices (already filtered by parent in backend)
  const { data, isLoading, error, refetch } = useInvoices({
    status: statusFilter || undefined,
  });

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

  const clearFilters = () => {
    setStatusFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const hasActiveFilters = statusFilter || startDateFilter || endDateFilter;

  // Filter invoices by date range on frontend (since backend doesn't support date range filtering)
  const filteredInvoices = data?.results?.filter((invoice) => {
    if (startDateFilter) {
      const invoiceDate = new Date(invoice.created_at);
      const startDate = new Date(startDateFilter);
      if (invoiceDate < startDate) return false;
    }
    if (endDateFilter) {
      const invoiceDate = new Date(invoice.created_at);
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999); // Include entire end date
      if (invoiceDate > endDate) return false;
    }
    return true;
  });

  const handleRowClick = (invoiceId: number) => {
    navigate(`/dashboard/parent/invoices/${invoiceId}`);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-2">View invoices for your children</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>All invoices for your children</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date-filter">Start Date</Label>
                <Input
                  id="start-date-filter"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date-filter">End Date</Label>
                <Input
                  id="end-date-filter"
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <LoadingState message="Loading invoices..." />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(invoice.id)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(invoice.issued_date || invoice.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.due_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDateTime(invoice.due_date)}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRowClick(invoice.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No invoices found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "You don't have any invoices yet."
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
