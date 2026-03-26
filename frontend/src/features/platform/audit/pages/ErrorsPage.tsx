/**
 * Errors Page (Platform - SUPERADMIN)
 * Enhanced error dashboard with summary cards, filters, detail drawer, and resolve action.
 */
import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Search,
  X,
} from 'lucide-react';
import { usePlatformErrors } from '../hooks/usePlatformErrors';
import { useErrorLogSummary } from '../hooks/useErrorLogSummary';
import { useResolveErrorLog } from '../hooks/useResolveErrorLog';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import type { ErrorLog, ErrorLogSeverity } from '../types';

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEVERITY_BADGE_CLASSES: Record<ErrorLogSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-gray-100 text-gray-700 border-gray-200',
};

function SeverityBadge({ severity }: { severity: ErrorLogSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE_CLASSES[severity] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {severity}
    </span>
  );
}

function StatusDot({ resolved }: { resolved: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className={`h-2 w-2 rounded-full ${resolved ? 'bg-green-500' : 'bg-red-500'}`}
      />
      {resolved ? 'Resolved' : 'Open'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${year}, ${time}`;
  } catch {
    return dateString;
  }
}

// ---------------------------------------------------------------------------
// Inline toast
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error';

interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

let toastIdCounter = 0;

function useInlineToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, text: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ---------------------------------------------------------------------------
// Detail drawer (uses Dialog as Sheet substitute)
// ---------------------------------------------------------------------------

interface DetailDrawerProps {
  log: ErrorLog | null;
  open: boolean;
  onClose: () => void;
  onResolved: (id: number) => void;
  onResolveError: () => void;
}

function DetailDrawer({ log, open, onClose, onResolved, onResolveError }: DetailDrawerProps) {
  const { mutate: resolve, isPending } = useResolveErrorLog();
  const [showStacktrace, setShowStacktrace] = useState(false);

  const handleResolve = () => {
    if (!log) return;
    resolve(log.id, {
      onSuccess: () => {
        onResolved(log.id);
        onClose();
      },
      onError: () => {
        onResolveError();
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => undefined);
  };

  if (!log) return null;

  const severity = log.severity as ErrorLogSeverity;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={severity} />
            <span className="font-mono text-sm text-muted-foreground">{log.code}</span>
            <span className="text-muted-foreground">—</span>
            <span className="truncate max-w-xs text-sm font-normal">{log.path}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <MetaRow
            label="Request ID"
            value={log.request_id || '—'}
            copyable={!!log.request_id}
            onCopy={() => copyToClipboard(log.request_id)}
          />
          <MetaRow label="Academy" value={log.academy_name || '—'} />
          <MetaRow label="User Email" value={log.user_email || '—'} />
          <MetaRow label="Role" value={log.role || '—'} />
          <MetaRow label="Service" value={log.service || '—'} />
          <MetaRow label="Environment" value={log.environment || '—'} />
          <MetaRow label="Method" value={log.method || '—'} />
          <MetaRow label="Status Code" value={log.status_code ? String(log.status_code) : '—'} />
          <MetaRow label="First Seen" value={formatDate(log.created_at)} />
          <MetaRow label="Last Seen" value={formatDate(log.last_seen_at)} />
          <MetaRow label="Occurrences" value={String(log.occurrence_count ?? 1)} />
          <MetaRow label="Status">
            <StatusDot resolved={log.is_resolved} />
          </MetaRow>
        </div>

        {log.message && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Message
            </p>
            <p className="text-sm bg-muted rounded-md px-3 py-2">{log.message}</p>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stacktrace
            </p>
            <div className="flex items-center gap-2">
              {log.stacktrace && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => copyToClipboard(log.stacktrace ?? '')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowStacktrace((v) => !v)}
              >
                {showStacktrace ? 'Hide' : 'Show'} stacktrace
              </Button>
            </div>
          </div>
          {showStacktrace && (
            <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
              {log.stacktrace || '(no stacktrace)'}
            </pre>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!log.is_resolved && (
            <Button
              variant="destructive"
              onClick={handleResolve}
              disabled={isPending}
            >
              {isPending ? 'Resolving...' : 'Mark as Resolved'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MetaRowProps {
  label: string;
  value?: string;
  copyable?: boolean;
  onCopy?: () => void;
  children?: React.ReactNode;
}

function MetaRow({ label, value, copyable, onCopy, children }: MetaRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {children ?? (
          <span className="font-mono text-xs truncate">{value}</span>
        )}
        {copyable && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'false', label: 'Open' },
  { value: 'true', label: 'Resolved' },
];

export const ErrorsPage = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [isResolved, setIsResolved] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pageSize = 20;

  const { toasts, addToast, removeToast } = useInlineToast();

  const { data: summary } = useErrorLogSummary();

  const { data, isLoading, error, refetch } = usePlatformErrors({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: search || undefined,
    severity: severity || undefined,
    is_resolved: isResolved !== '' ? isResolved : undefined,
    page,
    page_size: pageSize,
  });

  const handleRowClick = (log: ErrorLog) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const handleResolved = (id: number) => {
    addToast('success', 'Error marked as resolved');
    // Optimistically update the row in the current list
    // The mutation hook also invalidates queries so a refetch will follow
    setSelectedLog(null);
  };

  const handleResolveError = () => {
    addToast('error', 'Failed to resolve error. Please try again.');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleNextPage = () => {
    if (data?.next) setPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (data?.previous) setPage((prev) => Math.max(1, prev - 1));
  };

  const getTotalPages = () => {
    if (!data?.count) return 0;
    return Math.ceil(data.count / pageSize);
  };

  return (
    <div className="container mx-auto py-8">
      {/* Inline toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium ${
                t.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{t.text}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Platform Errors</h1>
        <p className="text-muted-foreground mt-2">
          View and manage platform errors — auto-refreshing every 60 seconds
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Unresolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.critical_unresolved ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Unresolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary?.high_unresolved ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">High severity open errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total (Last 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_last_24h ?? '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">All severities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Affected Academy</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.most_affected_academy ? (
              <>
                <div className="text-lg font-bold truncate">
                  {summary.most_affected_academy.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.most_affected_academy.count} unresolved error(s)
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load platform errors"
          className="mb-6"
        />
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Error Filters</CardTitle>
          <CardDescription>Search and filter error logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Path, message, request ID, user, academy..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => { setSeverity(v === '_all' ? '' : v); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={isResolved}
                onValueChange={(v) => { setIsResolved(v === '_all' ? '' : v); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_from">Date From</Label>
              <Input
                id="date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_to">Date To</Label>
              <Input
                id="date_to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 text-2xl font-bold">
            Total Errors: {data?.count ?? 0}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
          <CardDescription>Click a row to view full details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading error logs..." />
          ) : data?.results && data.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Academy</TableHead>
                    <TableHead>Occurrences</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((log) => (
                    <ErrorRow
                      key={log.id}
                      log={log}
                      onClick={() => handleRowClick(log)}
                      onResolved={handleResolved}
                      onResolveError={handleResolveError}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No errors found"
              description="There are no error logs to display for the selected filters."
            />
          )}

          {data?.count && data.count > pageSize ? (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, data.count)} of {data.count} errors
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!data.previous || page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {getTotalPages()}
                </span>
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
          ) : null}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <DetailDrawer
        log={selectedLog}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onResolved={handleResolved}
        onResolveError={handleResolveError}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Row component (isolated to avoid re-render on unrelated state changes)
// ---------------------------------------------------------------------------

interface ErrorRowProps {
  log: ErrorLog;
  onClick: () => void;
  onResolved: (id: number) => void;
  onResolveError: () => void;
}

function ErrorRow({ log, onClick, onResolved, onResolveError }: ErrorRowProps) {
  const { mutate: resolve, isPending } = useResolveErrorLog();

  const handleResolveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    resolve(log.id, {
      onSuccess: () => onResolved(log.id),
      onError: () => onResolveError(),
    });
  };

  const formatLastSeen = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-GB', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `${day} ${month} ${year}, ${time}`;
    } catch {
      return dateString;
    }
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <TableCell>
        <SeverityBadge severity={log.severity as ErrorLogSeverity} />
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap">
        {new Date(log.created_at).toLocaleString()}
      </TableCell>
      <TableCell className="font-medium">{log.status_code || '—'}</TableCell>
      <TableCell className="font-mono text-xs">{log.code || '—'}</TableCell>
      <TableCell className="max-w-[220px] truncate text-sm">
        {log.method ? `${log.method} ` : ''}
        {log.path || '—'}
      </TableCell>
      <TableCell className="text-sm">{log.academy_name || '—'}</TableCell>
      <TableCell className="text-center font-medium">
        {log.occurrence_count ?? 1}
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap">
        {formatLastSeen(log.last_seen_at)}
      </TableCell>
      <TableCell>
        <StatusDot resolved={log.is_resolved} />
      </TableCell>
      <TableCell>
        {!log.is_resolved && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={handleResolveClick}
            disabled={isPending}
          >
            {isPending ? 'Resolving...' : 'Resolve'}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
