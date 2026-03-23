import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Edit, Play, Power, Trash2 } from 'lucide-react';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { useBillingItems } from '@/features/tenant/billing/hooks/hooks';
import type { InvoiceSchedule, InvoiceScheduleBillingType } from '../types';
import {
  useDeleteInvoiceSchedule,
  useInvoiceSchedules,
  useRunInvoiceSchedule,
  useToggleInvoiceScheduleActive,
} from '../hooks/hooks';
import { PendingApprovalsTab } from '../components/PendingApprovalsTab';
import { RunHistoryDrawer } from '../components/RunHistoryDrawer';

type Notice = { type: 'success' | 'error'; message: string };

const BILLING_TYPE_LABELS: Record<InvoiceScheduleBillingType, string> = {
  MONTHLY: 'Monthly',
  SESSION_BASED: 'Session-based',
};

const getActiveVariant = (isActive: boolean): 'default' | 'secondary' => (isActive ? 'default' : 'secondary');

type ConfirmTarget = { id: number; label: string };

export function InvoiceSchedulesPage() {
  const navigate = useNavigate();
  const { formatDateTime } = useAcademyFormat();

  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const [activeTab, setActiveTab] = useState<'schedules' | 'pending-approvals'>('schedules');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: schedulesData, isLoading, error, refetch } = useInvoiceSchedules({
    page,
    page_size: pageSize,
  });

  const schedules = schedulesData?.results ?? [];

  const { data: classesData } = useClasses({ is_active: true, page_size: 200 });
  const { data: billingItemsData } = useBillingItems({ is_active: true, page_size: 200 });

  const classById = useMemo(() => new Map(classesData?.results?.map((c) => [c.id, c]) ?? []), [classesData]);
  const billingItemById = useMemo(
    () => new Map(billingItemsData?.results?.map((bi) => [bi.id, bi]) ?? []),
    [billingItemsData]
  );

  const getScheduleLabel = (s: InvoiceSchedule) => {
    const className = classById.get(s.class_obj)?.name ?? `Class #${s.class_obj}`;
    const itemName = billingItemById.get(s.billing_item)?.name ?? `Item #${s.billing_item}`;
    return `${className} • ${BILLING_TYPE_LABELS[s.billing_type]} • ${itemName}`;
  };

  const getCycleConfigLabel = (s: InvoiceSchedule) => {
    if (s.billing_type === 'SESSION_BASED') {
      return `Every ${s.sessions_per_cycle ?? '—'} sessions`;
    }
    // MONTHLY
    return `Day ${s.billing_day ?? '—'} of month`;
  };

  const deleteSchedule = useDeleteInvoiceSchedule();
  const toggleActive = useToggleInvoiceScheduleActive();
  const runNow = useRunInvoiceSchedule();

  const [runConfirmTarget, setRunConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ConfirmTarget | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyScheduleId, setHistoryScheduleId] = useState<number | null>(null);
  const [historyLabel, setHistoryLabel] = useState<string | undefined>(undefined);

  const openHistory = (s: InvoiceSchedule) => {
    setHistoryScheduleId(s.id);
    setHistoryLabel(getScheduleLabel(s));
    setHistoryOpen(true);
  };

  const handleToggleActive = async (s: InvoiceSchedule) => {
    try {
      await toggleActive.mutateAsync(s.id);
      setNotice({ type: 'success', message: `Schedule ${s.is_active ? 'deactivated' : 'activated'}.` });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleRunNowConfirm = async () => {
    if (!runConfirmTarget) return;
    try {
      const res = await runNow.mutateAsync(runConfirmTarget.id);
      setNotice({
        type: 'success',
        message:
          res.status === 'SUCCEEDED'
            ? `Run succeeded (${res.invoices_created} invoice(s) created).`
            : res.status === 'PARTIAL'
              ? `Run partially succeeded (${res.invoices_created} invoice(s) created). Review history for details.`
              : `Run failed. Review history for details.`,
      });
      setRunConfirmTarget(null);
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmTarget) return;
    try {
      await deleteSchedule.mutateAsync(deleteConfirmTarget.id);
      setNotice({ type: 'success', message: 'Schedule deleted.' });
      setDeleteConfirmTarget(null);
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  const getTotalPages = () => {
    if (!schedulesData?.count) return 0;
    return Math.ceil(schedulesData.count / pageSize);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Schedules</h1>
          <p className="text-muted-foreground mt-2">
            Manage invoice schedules and approve generated invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/dashboard/operations/invoice-schedules/new')} disabled={isLoading}>
            Create Schedule
          </Button>
        </div>
      </div>

      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="pending-approvals">Pending Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Schedules</CardTitle>
                  <CardDescription>Auto-generate draft invoices on a schedule.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error ? (
                <ErrorState error={error} onRetry={() => refetch()} title="Failed to load schedules" />
              ) : isLoading ? (
                <LoadingState message="Loading invoice schedules..." />
              ) : schedules.length === 0 ? (
                <EmptyState
                  title="No schedules found"
                  description="Create your first invoice schedule to start generating draft invoices."
                  actionLabel="Create Schedule"
                  onAction={() => navigate('/dashboard/operations/invoice-schedules/new')}
                />
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Billing Type</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Cycle Config</TableHead>
                          <TableHead>Next Run</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div className="font-medium">{classById.get(s.class_obj)?.name ?? `Class #${s.class_obj}`}</div>
                            </TableCell>
                            <TableCell>{BILLING_TYPE_LABELS[s.billing_type]}</TableCell>
                            <TableCell>
                              {billingItemById.get(s.billing_item)?.name ?? `Item #${s.billing_item}`}
                            </TableCell>
                            <TableCell>{getCycleConfigLabel(s)}</TableCell>
                            <TableCell>{s.next_run_at ? formatDateTime(s.next_run_at) : '—'}</TableCell>
                            <TableCell>
                              <Badge variant={getActiveVariant(s.is_active)}>{s.is_active ? 'Active' : 'Paused'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/dashboard/operations/invoice-schedules/${s.id}/edit`)}
                                  disabled={toggleActive.isPending || runNow.isPending || deleteSchedule.isPending}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleActive(s)}
                                  disabled={toggleActive.isPending}
                                >
                                  <Power className="h-4 w-4 mr-1" />
                                  {s.is_active ? 'Pause' : 'Resume'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRunConfirmTarget({ id: s.id, label: getScheduleLabel(s) });
                                  }}
                                  disabled={runNow.isPending}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Run Now
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openHistory(s)}
                                  disabled={runNow.isPending}
                                >
                                  History
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteConfirmTarget({ id: s.id, label: getScheduleLabel(s) })}
                                  disabled={deleteSchedule.isPending}
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

                  {/* Pagination */}
                  {schedulesData && schedulesData.count > pageSize ? (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, schedulesData.count)} of{' '}
                        {schedulesData.count}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={!schedulesData.previous || page === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm text-muted-foreground px-2">
                          Page {page} of {getTotalPages()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={!schedulesData.next}
                        >
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

        <TabsContent value="pending-approvals" className="space-y-6">
          <PendingApprovalsTab />
        </TabsContent>
      </Tabs>

      <RunHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        scheduleId={historyScheduleId}
        scheduleLabel={historyLabel}
      />

      <Dialog
        open={!!runConfirmTarget}
        onOpenChange={(open) => {
          if (!open) setRunConfirmTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Run schedule now?</DialogTitle>
            <DialogDescription>
              This will execute the schedule and generate draft invoices (if applicable). History will show the result.
            </DialogDescription>
          </DialogHeader>
          {runConfirmTarget ? (
            <div className="text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{runConfirmTarget.label}</div>
            </div>
          ) : null}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setRunConfirmTarget(null)} disabled={runNow.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRunNowConfirm} disabled={runNow.isPending || !runConfirmTarget}>
              {runNow.isPending ? 'Running...' : 'Run Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirmTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Delete schedule?</DialogTitle>
            <DialogDescription>
              This permanently deletes the schedule from the academy.
            </DialogDescription>
          </DialogHeader>
          {deleteConfirmTarget ? (
            <div className="text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{deleteConfirmTarget.label}</div>
            </div>
          ) : null}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmTarget(null)} disabled={deleteSchedule.isPending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={deleteSchedule.isPending || !deleteConfirmTarget}>
              {deleteSchedule.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

