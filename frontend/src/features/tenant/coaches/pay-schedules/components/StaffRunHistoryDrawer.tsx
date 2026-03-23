import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { StaffPayScheduleRun, StaffPayScheduleRunStatus } from '../types';
import { useStaffPayScheduleRuns } from '../hooks/hooks';

type StaffRunHistoryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number | null;
  scheduleLabel?: string;
};

const getStatusBadgeVariant = (status: StaffPayScheduleRunStatus): 'success' | 'warning' | 'destructive' | 'secondary' => {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'FAILED') return 'destructive';
  return 'secondary';
};

export function StaffRunHistoryDrawer({ open, onOpenChange, scheduleId, scheduleLabel }: StaffRunHistoryDrawerProps) {
  const { formatDateTime } = useAcademyFormat();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, error, refetch } = useStaffPayScheduleRuns(scheduleId ?? undefined, {
    page,
    page_size: pageSize,
    enabled: open,
  });

  const runs: StaffPayScheduleRun[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results ?? [];
  }, [data]);

  const count = Array.isArray(data) ? data.length : data?.count ?? 0;
  const hasNext = !Array.isArray(data) && Boolean(data?.next);
  const hasPrevious = !Array.isArray(data) && Boolean(data?.previous);
  const totalPages = count ? Math.ceil(count / pageSize) : 1;

  useEffect(() => {
    if (!open) return;
    setExpandedIds(new Set());
    setPage(1);
  }, [open, scheduleId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-full w-full p-0 sm:max-w-[980px] max-w-none rounded-none">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Staff Run History</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {scheduleLabel ? scheduleLabel : scheduleId ? `Schedule #${scheduleId}` : '—'}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => refetch()} disabled={!scheduleId || isLoading}>
              Refresh
            </Button>
          </div>

          <div className="p-6 overflow-y-auto">
            {isLoading ? (
              <LoadingState message="Loading run history..." />
            ) : error ? (
              <ErrorState error={error} onRetry={() => refetch()} title="Failed to load run history" />
            ) : runs.length === 0 ? (
              <EmptyState title="No runs yet" description="Runs will appear here after executing this schedule." />
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Invoices Created</TableHead>
                        <TableHead>Triggered By</TableHead>
                        <TableHead>Error Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => {
                        const canExpand = run.status === 'FAILED' || run.status === 'PARTIAL';
                        const expanded = expandedIds.has(run.id);
                        return (
                          <TableRow key={run.id}>
                            <TableCell className="font-medium">{formatDateTime(run.run_at)}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(run.status)}>{run.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{run.invoices_created}</TableCell>
                            <TableCell>{run.triggered_by === 'MANUAL' ? 'Manual' : 'Scheduled'}</TableCell>
                            <TableCell>
                              {canExpand ? (
                                <div className="space-y-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setExpandedIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(run.id)) next.delete(run.id);
                                        else next.add(run.id);
                                        return next;
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
