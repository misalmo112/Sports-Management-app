import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { Edit, Play, Power, Trash2 } from 'lucide-react';
import { RentPendingApprovalsTab } from '../components/RentPendingApprovalsTab';
import { RentRunHistoryDrawer } from '../components/RentRunHistoryDrawer';
import type { RentPaySchedule } from '../types';
import {
  useDeleteRentPaySchedule,
  useRentPaySchedules,
  useRunRentPaySchedule,
  useToggleRentPayScheduleActive,
} from '../hooks/hooks';

type Notice = { type: 'success' | 'error'; message: string };
type ConfirmTarget = { id: number; label: string };

const BILLING_TYPE_LABEL: Record<RentPaySchedule['billing_type'], string> = {
  SESSION: 'Per Session',
  MONTHLY: 'Monthly',
  DAILY: 'Daily',
};

export function RentPaySchedulesPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'pending-approvals'>('schedules');
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: schedulesData, isLoading, error, refetch } = useRentPaySchedules({ page, page_size: pageSize });
  const schedules = schedulesData?.results ?? [];

  const deleteSchedule = useDeleteRentPaySchedule();
  const toggleActive = useToggleRentPayScheduleActive();
  const runNow = useRunRentPaySchedule();

  const [runConfirmTarget, setRunConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyScheduleId, setHistoryScheduleId] = useState<number | null>(null);
  const [historyLocationName, setHistoryLocationName] = useState<string | undefined>();
  const [historyBillingLabel, setHistoryBillingLabel] = useState<string | undefined>();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const getScheduleLabel = (s: RentPaySchedule) => `${s.location_name} • ${BILLING_TYPE_LABEL[s.billing_type]}`;

  const getCycleConfigLabel = (s: RentPaySchedule) => {
    if (s.billing_type === 'SESSION') {
      return `Every ${s.sessions_per_invoice ?? '—'} sessions`;
    }
    if (s.billing_type === 'MONTHLY') {
      return `Day ${s.billing_day ?? '—'} of month`;
    }
    return 'Every day';
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rent pay schedules</h1>
          <p className="text-muted-foreground mt-2">Automate facility rent invoices by location.</p>
        </div>
        <Button onClick={() => navigate('/dashboard/operations/rent-schedules/new')} disabled={isLoading}>
          + New Schedule
        </Button>
      </div>

      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="pending-approvals">
            Pending Approvals
            {pendingCount > 0 ? (
              <Badge variant="destructive" className="ml-2">
                {pendingCount > 99 ? '99+' : pendingCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Schedules</CardTitle>
              <CardDescription>Draft rent invoices are created when automation runs.</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <ErrorState error={error} onRetry={() => refetch()} title="Failed to load schedules" />
              ) : isLoading ? (
                <LoadingState message="Loading rent schedules…" />
              ) : schedules.length === 0 ? (
                <EmptyState
                  title="No schedules"
                  description="Create a rent pay schedule for a location."
                  actionLabel="+ New Schedule"
                  onAction={() => navigate('/dashboard/operations/rent-schedules/new')}
                />
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead>Cycle config</TableHead>
                          <TableHead>Next run</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.location_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{BILLING_TYPE_LABEL[s.billing_type]}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(s.amount, s.currency)}</TableCell>
                            <TableCell>{getCycleConfigLabel(s)}</TableCell>
                            <TableCell>{s.next_run_at ? formatDateTime(s.next_run_at) : '—'}</TableCell>
                            <TableCell>
                              <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Paused'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/dashboard/operations/rent-schedules/${s.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await toggleActive.mutateAsync(s.id);
                                      setNotice({
                                        type: 'success',
                                        message: `Schedule ${s.is_active ? 'paused' : 'activated'}.`,
                                      });
                                    } catch (err) {
                                      setNotice({ type: 'error', message: formatErrorMessage(err) });
                                    }
                                  }}
                                >
                                  <Power className="h-4 w-4 mr-1" />
                                  {s.is_active ? 'Pause' : 'Resume'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRunConfirmTarget({ id: s.id, label: getScheduleLabel(s) })}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Run Now
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setHistoryScheduleId(s.id);
                                    setHistoryLocationName(s.location_name);
                                    setHistoryBillingLabel(`${BILLING_TYPE_LABEL[s.billing_type]} schedule`);
                                    setHistoryOpen(true);
                                  }}
                                >
                                  History
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteConfirmTarget({ id: s.id, label: getScheduleLabel(s) })}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {schedulesData && schedulesData.count > pageSize ? (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, schedulesData.count)} of{' '}
                        {schedulesData.count}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!schedulesData.previous}>
                          Previous
                        </Button>
                        <div className="text-sm text-muted-foreground px-2">
                          Page {page} of {Math.ceil(schedulesData.count / pageSize)}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!schedulesData.next}>
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-approvals">
          <RentPendingApprovalsTab onCountChange={setPendingCount} />
        </TabsContent>
      </Tabs>

      <RentRunHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        scheduleId={historyScheduleId}
        locationName={historyLocationName}
        billingTypeLabel={historyBillingLabel}
      />

      <Dialog open={!!runConfirmTarget} onOpenChange={(open) => !open && setRunConfirmTarget(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Run schedule now?</DialogTitle>
            <DialogDescription>Executes automation for this schedule and may create draft rent invoices.</DialogDescription>
          </DialogHeader>
          {runConfirmTarget ? <div className="font-medium">{runConfirmTarget.label}</div> : null}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setRunConfirmTarget(null)} disabled={runNow.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!runConfirmTarget) return;
                try {
                  const res = await runNow.mutateAsync(runConfirmTarget.id);
                  if (res.status === 'FAILED') {
                    setNotice({ type: 'error', message: 'Run failed — check history for details.' });
                  } else {
                    const ok = res.status === 'SUCCEEDED';
                    const none = res.invoices_created === 0;
                    setNotice({
                      type: 'success',
                      message:
                        ok && none
                          ? 'Nothing due — no new invoices for this run.'
                          : `${res.invoices_created} invoice(s) generated.`,
                    });
                  }
                  setRunConfirmTarget(null);
                } catch (err) {
                  setNotice({ type: 'error', message: formatErrorMessage(err) });
                }
              }}
              disabled={runNow.isPending || !runConfirmTarget}
            >
              {runNow.isPending ? 'Running…' : 'Run Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmTarget} onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Delete schedule?</DialogTitle>
            <DialogDescription>This removes the rent pay schedule. Existing invoices are not deleted.</DialogDescription>
          </DialogHeader>
          {deleteConfirmTarget ? <div className="font-medium">{deleteConfirmTarget.label}</div> : null}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmTarget(null)} disabled={deleteSchedule.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!deleteConfirmTarget) return;
                try {
                  await deleteSchedule.mutateAsync(deleteConfirmTarget.id);
                  setNotice({ type: 'success', message: 'Schedule deleted.' });
                  setDeleteConfirmTarget(null);
                } catch (err) {
                  setNotice({ type: 'error', message: formatErrorMessage(err) });
                }
              }}
              disabled={deleteSchedule.isPending || !deleteConfirmTarget}
            >
              {deleteSchedule.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
