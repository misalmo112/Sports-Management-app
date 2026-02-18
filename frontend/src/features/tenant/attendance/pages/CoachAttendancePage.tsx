/**
 * Coach Attendance Page
 * View and mark student attendance for assigned classes
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
import { useAttendance } from '../hooks/hooks';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { X } from 'lucide-react';

export const CoachAttendancePage = () => {
  const navigate = useNavigate();
  const [classFilter, setClassFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { formatDateTime } = useAcademyFormat();

  // Fetch classes (already filtered by coach on backend)
  const { data: classesData } = useClasses({ is_active: true });

  // Fetch attendance (already filtered by coach's classes on backend)
  const { data, isLoading, error, refetch } = useAttendance({
    class_obj: classFilter ? parseInt(classFilter) : undefined,
    date: dateFilter || undefined,
    status: statusFilter || undefined,
  });

  const clearFilters = () => {
    setClassFilter('');
    setDateFilter('');
    setStatusFilter('');
  };

  const hasActiveFilters = classFilter || dateFilter || statusFilter;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-2">View and mark attendance for your classes</p>
        </div>
        <Button onClick={() => navigate('/dashboard/coach/attendance/mark')}>
          Mark Attendance
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>Student attendance for your assigned classes</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
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
                    {classesData?.results.map((classItem) => (
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
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
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
                        <Badge
                          variant={
                            attendance.status === 'PRESENT'
                              ? 'success'
                              : 'destructive'
                          }
                        >
                          {attendance.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {attendance.notes || '—'}
                      </TableCell>
                      <TableCell>
                        {attendance.marked_by_name || '—'}
                      </TableCell>
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
                  ? "Try adjusting your filters to see more results."
                  : "Get started by marking attendance for a class."
              }
              actionLabel={hasActiveFilters ? undefined : "Mark Attendance"}
              onAction={hasActiveFilters ? undefined : () => navigate('/dashboard/coach/attendance/mark')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
