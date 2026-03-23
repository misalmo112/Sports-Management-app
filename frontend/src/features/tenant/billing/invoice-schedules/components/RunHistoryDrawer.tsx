import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { InvoiceScheduleRun, InvoiceScheduleRunStatus } from '../types';
import { useInvoiceScheduleRuns } from '../hooks/hooks';

type RunHistoryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number | null;
  scheduleLabel?: string;
};

const getStatusBadgeVariant = (status: InvoiceScheduleRunStatus): 'success' | 'warning' | 'destructive' | 'secondary' => {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'FAILED') return 'destructive';
  return 'secondary';
};

const formatStatusLabel = (status: InvoiceScheduleRunStatus): string => {
  if (status === 'SUCCEEDED') return 'Succeeded';
  if (status === 'PARTIAL') return 'Partial';
  if (status === 'FAILED') return 'Failed';
  return status;
};

export function RunHistoryDrawer({
  open,
  onOpenChange,
  scheduleId,
  scheduleLabel,
}: RunHistoryDrawerProps) {
  const { formatDateTime } = useAcademyFormat();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, error, refetch } = useInvoiceScheduleRuns(scheduleId ?? undefined, open);

  const runs: InvoiceScheduleRun[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }, [data]);

  useEffect(() => {
    if (!open) return;
    setExpandedIds(new Set());
  }, [open, scheduleId]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-full w-full p-0 sm:max-w-[900px] max-w-none rounded-none"
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Run History</h2>
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
              <EmptyState
                title="No runs yet"
                description="Runs will appear here after executing a schedule."
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Invoices Created</TableHead>
                      <TableHead>Triggered By</TableHead>
                      <TableHead>Details</TableHead>
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
                            <Badge variant={getStatusBadgeVariant(run.status)}>{formatStatusLabel(run.status)}</Badge>
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
                                  onClick={() => toggleExpanded(run.id)}
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

