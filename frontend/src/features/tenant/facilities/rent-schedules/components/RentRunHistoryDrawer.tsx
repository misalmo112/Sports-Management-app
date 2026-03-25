import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { RentPayScheduleRun, RentPayScheduleRunStatus } from '../types';
import { useRentPayScheduleRuns } from '../hooks/hooks';

type RentRunHistoryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number | null;
  locationName?: string;
  billingTypeLabel?: string;
};

const statusVariant = (status: RentPayScheduleRunStatus): 'success' | 'warning' | 'destructive' | 'secondary' => {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'FAILED') return 'destructive';
  return 'secondary';
};

export function RentRunHistoryDrawer({
  open,
  onOpenChange,
  scheduleId,
  locationName,
  billingTypeLabel,
}: RentRunHistoryDrawerProps) {
  const { formatDateTime } = useAcademyFormat();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, error, refetch } = useRentPayScheduleRuns(scheduleId ?? undefined, {
    page,
    page_size: pageSize,
    enabled: open,
  });

  const runs: RentPayScheduleRun[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results ?? [];
  }, [data]);

  const count = Array.isArray(data) ? data.length : (data?.count ?? 0);
  const hasNext = !Array.isArray(data) && Boolean(data?.next);
  const hasPrevious = !Array.isArray(data) && Boolean(data?.previous);
  const totalPages = count ? Math.ceil(count / pageSize) : 1;

  useEffect(() => {
    if (!open) return;
    setExpandedIds(new Set());
    setPage(1);
  }, [open, scheduleId]);

  const headerSubtitle =
    locationName && billingTypeLabel ? `${locationName} — ${billingTypeLabel}` : scheduleId ? `Schedule #${scheduleId}` : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-full w-full p-0 sm:max-w-[900px] max-w-none rounded-none">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Rent schedule run history</h2>
              <p className="text-sm text-muted-foreground mt-1">{headerSubtitle}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => refetch()} disabled={!scheduleId || isLoading}>
              Refresh
            </Button>
          </div>

          <div className="p-6 overflow-y-auto">
            {isLoading ? (
              <LoadingState message="Loading run history…" />
            ) : error ? (
              <ErrorState error={error} onRetry={() => refetch()} title="Failed to load run history" />
            ) : runs.length === 0 ? (
              <EmptyState title="No runs yet" description="Runs appear after scheduled or manual executions." />
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run at</TableHead>
                        <TableHead>Triggered by</TableHead>
                        <TableHead className="text-right">Invoices</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => {
                        const expandable = run.status === 'FAILED' || run.status === 'PARTIAL';
                        const expanded = expandedIds.has(run.id);
                        return (
                          <TableRow key={run.id}>
                            <TableCell className="font-medium">{formatDateTime(run.run_at)}</TableCell>
                            <TableCell>{run.triggered_by === 'MANUAL' ? 'Manual' : 'Scheduled'}</TableCell>
                            <TableCell className="text-right">{run.invoices_created}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {expandable ? (
                                <div className="space-y-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setExpandedIds((prev) => {
                                        const n = new Set(prev);
                                        if (n.has(run.id)) n.delete(run.id);
                                        else n.add(run.id);
                                        return n;
                                      })
                                    }
                                  >
                                    {expanded ? 'Hide' : 'Show'} error detail
                                  </Button>
                                  {expanded ? (
                                    <pre className="text-xs whitespace-pre-wrap break-words bg-muted/30 rounded-md p-3 border">
                                      {run.error_detail || '—'}
                                    </pre>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {!Array.isArray(data) && count > pageSize ? (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, count)} of {count}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!hasPrevious}>
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground px-2">
                        Page {page} of {totalPages}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasNext}>
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
