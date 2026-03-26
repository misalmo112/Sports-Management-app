/**
 * Activity Log Page (Tenant - OWNER / ADMIN)
 * Displays the academy's audit trail with filters and a changes drawer.
 */
import { useState, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
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
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useTenantAuditLogs } from '../hooks/useTenantAuditLogs';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import type { TenantAuditLog } from '../types';

// ---------------------------------------------------------------------------
// Action badge colours
// ---------------------------------------------------------------------------

const ACTION_BADGE_CLASSES: Record<string, string> = {
  CREATE:     'bg-green-100 text-green-800 border-green-200',
  UPDATE:     'bg-blue-100 text-blue-800 border-blue-200',
  DELETE:     'bg-red-100 text-red-800 border-red-200',
  MARK_PAID:  'bg-purple-100 text-purple-800 border-purple-200',
  ENROLL:     'bg-teal-100 text-teal-800 border-teal-200',
  UNENROLL:   'bg-orange-100 text-orange-800 border-orange-200',
  INVITE:     'bg-indigo-100 text-indigo-800 border-indigo-200',
  EXPORT:     'bg-gray-100 text-gray-800 border-gray-200',
  LOGIN:      'bg-gray-100 text-gray-800 border-gray-200',
  LOGOUT:     'bg-gray-100 text-gray-800 border-gray-200',
  BULK_DELETE:'bg-red-100 text-red-800 border-red-200',
};

const actionBadgeClass = (action: string) =>
  ACTION_BADGE_CLASSES[action] ?? 'bg-gray-100 text-gray-800 border-gray-200';

// ---------------------------------------------------------------------------
// Date helper
// ---------------------------------------------------------------------------

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

// ---------------------------------------------------------------------------
// Changes drawer content
// ---------------------------------------------------------------------------

const ChangesDrawer = ({ log, onClose }: { log: TenantAuditLog; onClose: () => void }) => {
  const changes = log.changes_json ?? {};
  const before = changes.before as Record<string, string> | undefined;
  const after  = changes.after  as Record<string, string> | undefined;
  const created = changes.created as Record<string, string> | undefined;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={actionBadgeClass(log.action)}>{log.action_display}</Badge>
            <span>{log.resource_type_display} #{log.resource_id}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Timestamp</span>
          <span>{formatDate(log.created_at)}</span>
          <span className="text-muted-foreground">User</span>
          <span>{log.user_email ?? 'System'}</span>
          <span className="text-muted-foreground">IP Address</span>
          <span>{log.ip_address ?? '—'}</span>
          <span className="text-muted-foreground">User Agent</span>
          <span className="truncate" title={log.user_agent}>{log.user_agent || '—'}</span>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Changes</h3>
          {before && after ? (
            <table className="w-full text-sm border rounded">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-3 py-2">Field</th>
                  <th className="text-left px-3 py-2">Before</th>
                  <th className="text-left px-3 py-2">After</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys({ ...before, ...after }).map((field) => (
                  <tr key={field} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{field}</td>
                    <td className="px-3 py-2 text-red-700">{String(before[field] ?? '—')}</td>
                    <td className="px-3 py-2 text-green-700">{String(after[field] ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : created ? (
            <table className="w-full text-sm border rounded">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-3 py-2">Field</th>
                  <th className="text-left px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(created).map(([field, value]) => (
                  <tr key={field} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{field}</td>
                    <td className="px-3 py-2">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(changes, null, 2)}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export const ActivityLogPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('__all__');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<TenantAuditLog | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  const handleFilterChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
      (value: string) => {
        setter(value);
        setPage(1);
      },
    []
  );

  const { data, isLoading, error, refetch } = useTenantAuditLogs({
    search:        debouncedSearch || undefined,
    action:        actionFilter === '__all__'        ? undefined : actionFilter,
    resource_type: resourceTypeFilter === '__all__'  ? undefined : resourceTypeFilter,
    date_from:     dateFrom || undefined,
    date_to:       dateTo   || undefined,
    page,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground mt-1">Track all changes made within your academy</p>
      </div>

      {/* Filter bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or resource ID…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Action */}
            <Select value={actionFilter} onValueChange={handleFilterChange(setActionFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="ENROLL">Enroll</SelectItem>
                <SelectItem value="UNENROLL">Unenroll</SelectItem>
                <SelectItem value="MARK_PAID">Mark Paid</SelectItem>
                <SelectItem value="INVITE">Invite</SelectItem>
                <SelectItem value="EXPORT">Export</SelectItem>
                <SelectItem value="BULK_DELETE">Bulk Delete</SelectItem>
              </SelectContent>
            </Select>

            {/* Resource type */}
            <Select value={resourceTypeFilter} onValueChange={handleFilterChange(setResourceTypeFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Resources</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="COACH">Coach</SelectItem>
                <SelectItem value="CLASS">Class</SelectItem>
                <SelectItem value="ENROLLMENT">Enrollment</SelectItem>
                <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                <SelectItem value="INVOICE">Invoice</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="FACILITY">Facility</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-[190px] text-sm"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-[190px] text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            {data ? `${data.count} total entries` : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message="Failed to load activity log." onRetry={refetch} />
          ) : !data?.results.length ? (
            <EmptyState
              title="No activity recorded yet"
              description="Actions taken within your academy will appear here."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.results.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user_email ?? <span className="text-muted-foreground italic">System</span>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${actionBadgeClass(log.action)}`}
                          >
                            {log.action_display}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.resource_type_display}{' '}
                          <span className="text-muted-foreground">#{log.resource_id}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ip_address ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Changes drawer */}
      {selectedLog && (
        <ChangesDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
};
