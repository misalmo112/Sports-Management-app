import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import type { PendingStaffApprovalInvoice, StaffPayScheduleBillingType } from '../types';
import { useBulkIssuePendingStaffApprovals, useCancelStaffInvoice, usePendingStaffApprovals } from '../hooks/hooks';

type Notice = { type: 'success' | 'error'; message: string };

type StaffPendingApprovalsTabProps = {
  onCountChange?: (count: number) => void;
};

export function StaffPendingApprovalsTab({ onCountChange }: StaffPendingApprovalsTabProps) {
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [billingTypeFilter, setBillingTypeFilter] = useState<'ALL' | StaffPayScheduleBillingType>('ALL');

  const { data, isLoading, error, refetch } = usePendingStaffApprovals({ page_size: 200 });
  const { mutateAsync: bulkIssue, isPending: isBulkIssuePending } = useBulkIssuePendingStaffApprovals();
  const cancelInvoiceMutation = useCancelStaffInvoice();

  const [pendingInvoices, setPendingInvoices] = useState<PendingStaffApprovalInvoice[]>(data?.results ?? []);

  useEffect(() => {
    setPendingInvoices(data?.results ?? []);
  }, [data]);

  useEffect(() => {
    onCountChange?.(pendingInvoices.length);
  }, [onCountChange, pendingInvoices.length]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const filteredInvoices = useMemo(() => {
    const query = search.toLowerCase().trim();
    return pendingInvoices.filter((inv) => {
      const matchType = billingTypeFilter === 'ALL' || inv.schedule.billing_type === billingTypeFilter;
      if (!matchType) return false;
      if (!query) return true;
      return (
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.coach.full_name.toLowerCase().includes(query) ||
        inv.period_description.toLowerCase().includes(query)
      );
    });
  }, [billingTypeFilter, pendingInvoices, search]);

  useEffect(() => {
    const visibleIds = new Set(filteredInvoices.map((inv) => inv.id));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredInvoices]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected = filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedSet.has(inv.id));

  const handleBulkIssue = async () => {
    if (selectedIds.length === 0) {
      setNotice({ type: 'error', message: 'Select at least one invoice to issue.' });
      return;
    }
    try {
      const res = await bulkIssue({ invoice_ids: selectedIds });
      const issuedSet = new Set(res.invoice_ids);
      setPendingInvoices((prev) => prev.filter((inv) => !issuedSet.has(inv.id)));
      setSelectedIds([]);
      setBulkConfirmOpen(false);
      setNotice({ type: 'success', message: `Issued ${res.issued_count} invoice(s).` });
      await refetch();
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleDiscard = async (invoiceId: number) => {
    try {
      await cancelInvoiceMutation.mutateAsync(invoiceId);
      setPendingInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      setSelectedIds((prev) => prev.filter((id) => id !== invoiceId));
      setNotice({ type: 'success', message: 'Invoice discarded.' });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-6">
      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Select draft staff invoices and issue them in bulk.</p>
            </div>
            <Button onClick={() => setBulkConfirmOpen(true)} disabled={selectedIds.length === 0 || isBulkIssuePending}>
              {isBulkIssuePending ? 'Issuing...' : `Issue Selected (${selectedIds.length})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Input
              placeholder="Search invoice #, coach, period..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:flex-1"
            />
            <Select value={billingTypeFilter} onValueChange={(v) => setBillingTypeFilter(v as typeof billingTypeFilter)}>
              <SelectTrigger className="md:w-[220px]">
                <SelectValue placeholder="Filter by billing type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="SESSION">Per Session</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.length > 0 ? (
              <Button variant="outline" onClick={() => setSelectedIds([])} disabled={isBulkIssuePending}>
                Clear
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <LoadingState message="Loading pending staff approvals..." />
          ) : error ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Failed to load pending approvals" />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState title="No pending approvals" description="Run staff pay schedules to generate draft staff invoices." />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (!checked) {
                              setSelectedIds((prev) => prev.filter((id) => !filteredInvoices.some((inv) => inv.id === id)));
                              return;
                            }
                            const next = new Set<number>(selectedIds);
                            filteredInvoices.forEach((inv) => next.add(inv.id));
                            setSelectedIds(Array.from(next));
                          }}
                          aria-label="Select all visible"
                        />
                        <span>Invoice</span>
                      </div>
                    </TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Billing Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const checked = selectedSet.has(inv.id);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (isChecked) next.add(inv.id);
                                  else next.delete(inv.id);
                                  return Array.from(next);
                                });
                              }}
                              aria-label={`Select invoice ${inv.invoice_number}`}
                            />
                            <span className="font-medium">{inv.invoice_number}</span>
                          </div>
                        </TableCell>
                        <TableCell>{inv.coach.full_name}</TableCell>
                        <TableCell>{inv.schedule.billing_type}</TableCell>
                        <TableCell>{inv.period_description}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(inv.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => navigate(`/dashboard/management/staff`)}
                              disabled={cancelInvoiceMutation.isPending || isBulkIssuePending}
                            >
                              Open Staff
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDiscard(inv.id)}
                              disabled={cancelInvoiceMutation.isPending || isBulkIssuePending}
                            >
                              Discard
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Issue pending staff invoices</DialogTitle>
            <DialogDescription>
              This sets selected draft staff invoices to <b>PENDING</b> and stamps issued date.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedIds.length}</span>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={isBulkIssuePending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleBulkIssue} disabled={isBulkIssuePending || selectedIds.length === 0}>
              {isBulkIssuePending ? 'Issuing...' : 'Issue Invoices'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
