/**
 * Attendance Page
 * View and manage attendance records (student and coach)
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAttendance, useCoachAttendance } from '../hooks/hooks';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { useCoaches } from '@/features/tenant/coaches/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { X } from 'lucide-react';

export const AttendancePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'student' | 'coach'>('student');
  const [classFilter, setClassFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [coachFilter, setCoachFilter] = useState<string>('ALL');
  const [coachClassFilter, setCoachClassFilter] = useState<string>('');
  const [coachDateFilter, setCoachDateFilter] = useState<string>('');
  const [coachStatusFilter, setCoachStatusFilter] = useState<string>('');
  const { formatDateTime } = useAcademyFormat();

  const { data: classesData } = useClasses({ is_active: true });
  const { data: coachesData } = useCoaches({ is_active: true });

  const { data, isLoading, error, refetch } = useAttendance({
    class_obj: classFilter ? parseInt(classFilter) : undefined,
    date: dateFilter || undefined,
    status: statusFilter || undefined,
  });

  const coachIdForAttendance =
    coachFilter && coachFilter !== 'ALL' ? Number(coachFilter) : undefined;
  const {
    data: coachAttendanceData,
    isLoading: coachAttendanceLoading,
    error: coachAttendanceError,
    refetch: refetchCoachAttendance,
  } = useCoachAttendance({
    coach: coachIdForAttendance,
    class_obj: coachClassFilter ? parseInt(coachClassFilter) : undefined,
    date: coachDateFilter || undefined,
    status: coachStatusFilter || undefined,
    page_size: 100,
  });

  const classes = classesData?.results ?? [];
  const coaches = coachesData?.results ?? [];
  const coachAttendanceList = Array.isArray(coachAttendanceData?.results)
    ? coachAttendanceData.results
    : [];

  const clearFilters = () => {
    setClassFilter('');
    setDateFilter('');
    setStatusFilter('');
  };

  const clearCoachFilters = () => {
    setCoachFilter('ALL');
    setCoachClassFilter('');
    setCoachDateFilter('');
    setCoachStatusFilter('');
  };

  const hasActiveFilters = classFilter || dateFilter || statusFilter;
  const hasActiveCoachFilters =
    coachFilter !== 'ALL' || coachClassFilter || coachDateFilter || coachStatusFilter;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-2">Manage attendance records</p>
        </div>
        <Button onClick={() => navigate('/dashboard/attendance/mark')}>
          Mark Attendance
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>Student and coach attendance in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'student' | 'coach')}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student attendance</TabsTrigger>
              <TabsTrigger value="coach">Coach attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="space-y-6">
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class-filter">Class</Label>
                    <Select value={classFilter || 'all'} onValueChange={(value) => setClassFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger id="class-filter">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All classes</SelectItem>
                        {classes.map((classItem) => (
                          <SelectItem key={classItem.id} value={classItem.id.toString()}>
                            {classItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-filter">Date</Label>
                    <Input
                      id="date-filter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger id="status-filter">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="PRESENT">Present</SelectItem>
                        <SelectItem value="ABSENT">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters} className="w-full">
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {isLoading ? (
                <LoadingState message="Loading attendance records..." />
              ) : error ? (
                <ErrorState error={error} onRetry={refetch} />
              ) : data?.results && data.results.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Marked By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.results.map((attendance) => (
                        <TableRow key={attendance.id}>
                          <TableCell className="font-medium">
                            {attendance.student_detail?.full_name || `Student #${attendance.student}`}
                          </TableCell>
                          <TableCell>
                            {attendance.class_detail?.name || `Class #${attendance.class_obj}`}
                          </TableCell>
                          <TableCell>{formatDateTime(attendance.date)}</TableCell>
                          <TableCell>
                            <Badge variant={attendance.status === 'PRESENT' ? 'success' : 'destructive'}>
                              {attendance.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{attendance.notes || '—'}</TableCell>
                          <TableCell>{attendance.marked_by_name || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  title="No attendance records found"
                  description={
                    hasActiveFilters
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by marking attendance for a class.'
                  }
                  actionLabel={hasActiveFilters ? undefined : 'Mark Attendance'}
                  onAction={hasActiveFilters ? undefined : () => navigate('/dashboard/attendance/mark')}
                />
              )}
            </TabsContent>

            <TabsContent value="coach" className="space-y-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <Button variant="outline" onClick={() => navigate('/dashboard/attendance/coach')}>
                  Mark coach attendance
                </Button>
              </div>
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Coach</Label>
                    <Select value={coachFilter} onValueChange={setCoachFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All coaches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All coaches</SelectItem>
                        {coaches.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={coachClassFilter || 'all'} onValueChange={(v) => setCoachClassFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All classes</SelectItem>
                        {classes.map((classItem) => (
                          <SelectItem key={classItem.id} value={classItem.id.toString()}>
                            {classItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={coachDateFilter}
                      onChange={(e) => setCoachDateFilter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={coachStatusFilter || 'all'} onValueChange={(v) => setCoachStatusFilter(v === 'all' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="PRESENT">Present</SelectItem>
                        <SelectItem value="ABSENT">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    {hasActiveCoachFilters && (
                      <Button variant="outline" onClick={clearCoachFilters} className="w-full">
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {coachAttendanceError ? (
                <ErrorState
                  error={coachAttendanceError as Error}
                  onRetry={() => typeof refetchCoachAttendance === 'function' && refetchCoachAttendance()}
                  title="Failed to load coach attendance"
                />
              ) : coachAttendanceLoading ? (
                <LoadingState message="Loading coach attendance..." />
              ) : coachAttendanceList.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Coach</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coachAttendanceList.map((r) => (
                        <TableRow key={r?.id ?? Math.random()}>
                          <TableCell className="font-medium">
                            {'coach_name' in r && typeof (r as { coach_name?: string }).coach_name === 'string'
                              ? (r as { coach_name: string }).coach_name
                              : r?.coach != null
                                ? `Coach #${r.coach}`
                                : '—'}
                          </TableCell>
                          <TableCell>
                            {'class_name' in r && typeof (r as { class_name?: string }).class_name === 'string'
                              ? (r as { class_name: string }).class_name
                              : r?.class_obj != null
                                ? `Class #${r.class_obj}`
                                : '—'}
                          </TableCell>
                          <TableCell>{r?.date ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={r?.status === 'PRESENT' ? 'default' : 'secondary'}>
                              {r?.status ?? '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{r?.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  title="No coach attendance records found"
                  description={
                    hasActiveCoachFilters
                      ? 'Try adjusting your filters to see more results.'
                      : 'Mark coach attendance from the button above or from Staff.'
                  }
                  actionLabel={hasActiveCoachFilters ? undefined : 'Mark coach attendance'}
                  onAction={
                    hasActiveCoachFilters ? undefined : () => navigate('/dashboard/attendance/coach')
                  }
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
