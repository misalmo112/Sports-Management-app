import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { useUpdateRentInvoice } from '@/features/tenant/facilities/hooks/hooks';
import type { PendingRentInvoice, RentPayScheduleBillingType } from '../types';
import { useBulkIssueRentApprovals, usePendingRentApprovals } from '../hooks/hooks';

type Notice = { type: 'success' | 'error'; message: string };

type RentPendingApprovalsTabProps = {
  onCountChange?: (count: number) => void;
};

function parseSessionTooltip(periodDescription: string): string | null {
  const m = periodDescription.match(/\((\d+)\s*sessions\s*×\s*([\d.]+)\s*([A-Z]{3})/i);
  if (!m) return null;
  return `Variable: ${m[1]} sessions × ${m[2]} ${m[3]}/session`;
}

export function RentPendingApprovalsTab({ onCountChange }: RentPendingApprovalsTabProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [billingTypeFilter, setBillingTypeFilter] = useState<'ALL' | RentPayScheduleBillingType>('ALL');

  const { data, isLoading, error, refetch } = usePendingRentApprovals({ page_size: 200 });
  const { mutateAsync: bulkIssue, isPending: isBulkIssuePending } = useBulkIssueRentApprovals();
  const updateRentInvoice = useUpdateRentInvoice();

  const [pendingInvoices, setPendingInvoices] = useState<PendingRentInvoice[]>(data?.results ?? []);

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
    return pendingInvoices.filter((inv) => {
      if (billingTypeFilter === 'ALL') return true;
      return inv.schedule.billing_type === billingTypeFilter;
    });
  }, [billingTypeFilter, pendingInvoices]);

  useEffect(() => {
    const visible = new Set(filteredInvoices.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [filteredInvoices]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedSet.has(inv.id));

  const handleBulkIssue = async () => {
    if (selectedIds.length === 0) {
      setNotice({ type: 'error', message: 'Select at least one invoice to issue.' });
      return;
    }
    try {
      const res = await bulkIssue({ invoice_ids: selectedIds });
      const issued = new Set(res.invoice_ids);
      setPendingInvoices((prev) => prev.filter((inv) => !issued.has(inv.id)));
      setSelectedIds([]);
      setBulkConfirmOpen(false);
      setNotice({ type: 'success', message: `${res.issued_count} rent invoice(s) issued.` });
      await refetch();
      qc.invalidateQueries({ queryKey: ['rent-pending-approvals', 'count'] });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleDiscard = async (invoiceId: number) => {
    try {
      await updateRentInvoice.mutateAsync({ id: invoiceId, data: { status: 'CANCELLED' } });
      setPendingInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      setSelectedIds((prev) => prev.filter((id) => id !== invoiceId));
      qc.invalidateQueries({ queryKey: ['rent-pending-approvals', 'count'] });
      qc.invalidateQueries({ queryKey: ['rent-pending-approvals', 'list'] });
      setNotice({ type: 'success', message: 'Invoice discarded.' });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Pending rent approvals</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{pendingInvoices.length} pending</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={billingTypeFilter} onValueChange={(v) => setBillingTypeFilter(v as typeof billingTypeFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="SESSION">Per session</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" disabled={selectedIds.length === 0} onClick={() => setBulkConfirmOpen(true)}>
            Issue selected
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice ? (
          <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} title="Failed to load pending invoices" />
        ) : isLoading ? (
          <LoadingState message="Loading pending rent invoices…" />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState title="No pending approvals" description="Draft rent invoices from schedules will appear here." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(filteredInvoices.map((i) => i.id));
                        else setSelectedIds([]);
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => {
                  const tip = inv.schedule.billing_type === 'SESSION' ? parseSessionTooltip(inv.period_description) : null;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedSet.has(inv.id)}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setSelectedIds((prev) => (on ? [...prev, inv.id] : prev.filter((x) => x !== inv.id)));
                          }}
                          aria-label={`Select ${inv.invoice_number}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{inv.location.name}</TableCell>
                      <TableCell className="max-w-[240px] truncate" title={inv.period_description}>
                        {inv.period_description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{inv.schedule.billing_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right" title={tip ?? undefined}>
                        {formatCurrency(inv.amount, inv.currency)}
                      </TableCell>
                      <TableCell>{inv.due_date ? formatDateTime(inv.due_date) : '—'}</TableCell>
                      <TableCell>{formatDateTime(inv.created_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard/management/facilities')}>
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Discard this draft rent invoice?')) void handleDiscard(inv.id);
                          }}
                          disabled={updateRentInvoice.isPending}
                        >
                          Discard
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue selected invoices?</DialogTitle>
            <DialogDescription>
              This will move {selectedIds.length} draft rent invoice(s) to pending and stamp today&apos;s issue date.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={isBulkIssuePending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleBulkIssue()} disabled={isBulkIssuePending}>
              {isBulkIssuePending ? 'Issuing…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
