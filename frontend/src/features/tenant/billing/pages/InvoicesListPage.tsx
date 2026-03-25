/**
 * Invoices List Page
 * Lists all invoices
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInvoices } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

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

export const InvoicesListPage = () => {
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useInvoices({
    status: statusFilter || undefined,
    page,
    page_size: pageSize,
  });

  const handleRowClick = (invoiceId: number) => {
    navigate(`/dashboard/finance/invoices/${invoiceId}`);
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

  // Filter by search term (client-side for now, can be moved to backend)
  const filteredResults = data?.results.filter((invoice) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.parent_name?.toLowerCase().includes(searchLower) ||
      invoice.parent_email?.toLowerCase().includes(searchLower) ||
      false
    );
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-2">Manage academy invoices</p>
        </div>
        <Button onClick={() => navigate('/dashboard/finance/invoices/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load invoices"
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices List</CardTitle>
          <CardDescription>All invoices in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, parent name, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingState message="Loading invoices..." />
          ) : filteredResults && filteredResults.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((invoice) => {
                      const statusInfo = formatStatus(invoice.status);
                      return (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(invoice.id)}
                        >
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.parent_name || '—'}</div>
                              <div className="text-sm text-muted-foreground">
                                {invoice.parent_email || '—'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                          <TableCell>
                            {formatCurrency(invoice.paid_amount || '0', invoice.currency)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(invoice.remaining_balance || invoice.total, invoice.currency)}
                          </TableCell>
                          <TableCell>
                            {invoice.due_date
                              ? formatDateTime(invoice.due_date)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(invoice.created_at)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/finance/invoices/${invoice.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.count > pageSize && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, data.count)} of {data.count} invoices
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
              title="No invoices found"
              description="Get started by creating your first invoice."
              actionLabel="Create Invoice"
              onAction={() => navigate('/dashboard/finance/invoices/new')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
