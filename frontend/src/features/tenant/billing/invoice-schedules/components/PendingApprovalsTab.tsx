import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Input } from '@/shared/components/ui/input';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateInvoice } from '@/features/tenant/billing/hooks/hooks';
import type { PendingApprovalInvoice } from '../types';
import { useBulkIssuePendingApprovals, usePendingApprovals } from '../hooks/hooks';

type Notice = { type: 'success' | 'error'; message: string };

export function PendingApprovalsTab() {
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = usePendingApprovals({
    page_size: 200,
  });

  const [pendingInvoices, setPendingInvoices] = useState<PendingApprovalInvoice[]>(data?.results ?? []);

  const { mutateAsync: bulkIssue, isPending: isBulkIssuePending } = useBulkIssuePendingApprovals();
  const updateInvoice = useUpdateInvoice();

  useEffect(() => {
    setPendingInvoices(data?.results ?? []);
  }, [data]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const filteredInvoices = useMemo(() => {
    if (!search) return pendingInvoices;
    const q = search.toLowerCase();
    return pendingInvoices.filter((inv) => {
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.parent?.full_name?.toLowerCase().includes(q) ||
        inv.class_name.toLowerCase().includes(q)
      );
    });
  }, [pendingInvoices, search]);

  useEffect(() => {
    // Remove selections that aren't visible anymore (when search changes).
    const visibleIds = new Set(filteredInvoices.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredInvoices]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleOne = (id: number, nextChecked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (nextChecked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  };

  const allVisibleSelected =
    filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedSet.has(inv.id));

  const toggleAllVisible = (nextChecked: boolean) => {
    if (!nextChecked) {
      setSelectedIds((prev) => prev.filter((id) => !filteredInvoices.some((inv) => inv.id === id)));
      return;
    }
    const next = new Set<number>(selectedIds);
    for (const inv of filteredInvoices) next.add(inv.id);
    setSelectedIds(Array.from(next));
  };

  const handleBulkIssue = async () => {
    const invoiceIds = selectedIds;
    if (invoiceIds.length === 0) {
      setNotice({ type: 'error', message: 'Select at least one invoice to issue.' });
      return;
    }
    try {
      await bulkIssue({ invoice_ids: invoiceIds });
      const issuedIdSet = new Set(invoiceIds);
      setPendingInvoices((prev) => prev.filter((inv) => !issuedIdSet.has(inv.id)));
      setSelectedIds([]);
      setBulkConfirmOpen(false);
      setNotice({ type: 'success', message: `Issued ${invoiceIds.length} invoice(s).` });
      await refetch();
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleDiscard = async (invoiceId: number) => {
    try {
      await updateInvoice.mutateAsync({
        id: invoiceId,
        data: { status: 'CANCELLED' },
      });

      setPendingInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      setSelectedIds([]);
      setNotice({ type: 'success', message: 'Invoice discarded.' });

      // Keep sidebar badge and the list in sync.
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', 'count'] });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-6">
      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          {notice.type === 'error' ? <span className="font-semibold mr-2">Error</span> : <span className="font-semibold mr-2">Success</span>}
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Select draft invoices and issue them in bulk.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setBulkConfirmOpen(true)}
                disabled={selectedIds.length === 0 || isBulkIssuePending}
              >
                {isBulkIssuePending ? 'Issuing...' : `Issue Selected (${selectedIds.length})`}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search invoice #, parent, class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {selectedIds.length > 0 ? (
              <Button variant="outline" onClick={() => setSelectedIds([])} disabled={isBulkIssuePending}>
                Clear
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <LoadingState message="Loading pending approvals..." />
          ) : error ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Failed to load pending approvals" />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              title="No pending approvals"
              description="Run invoice schedules to generate draft invoices awaiting approval."
            />
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
                          onChange={(e) => toggleAllVisible(e.target.checked)}
                          aria-label="Select all visible"
                        />
                        <span>Parent name</span>
                      </div>
                    </TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Amount(total)</TableHead>
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
                              onChange={(e) => toggleOne(inv.id, e.target.checked)}
                              aria-label={`Select invoice ${inv.invoice_number}`}
                            />
                            <div className="flex flex-col">
                              <span>{inv.parent.full_name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{inv.students && inv.students.trim().length > 0 ? inv.students : '—'}</TableCell>
                        <TableCell>{inv.class_name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.total, inv.currency)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(inv.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0"
                              onClick={() => navigate(`/dashboard/finance/invoices/${inv.id}`)}
                              disabled={updateInvoice.isPending || isBulkIssuePending}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDiscard(inv.id)}
                              disabled={updateInvoice.isPending || isBulkIssuePending}
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
            <DialogTitle>Issue pending invoices</DialogTitle>
            <DialogDescription>
              This will mark selected draft invoices as <b>SENT</b> and set their issued date.
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

