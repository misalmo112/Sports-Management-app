/**
 * Parent Attendance Page
 * View attendance records for parent's children
 */
import { useState, useMemo } from 'react';
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
import { useAttendance } from '../hooks/hooks';
import { useStudents } from '@/features/tenant/students/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { X, Calendar } from 'lucide-react';

export const ParentAttendancePage = () => {
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { formatDateTime } = useAcademyFormat();

  // Fetch children for filter dropdown
  const { data: studentsData } = useStudents({ is_active: true });

  // Fetch attendance with filters
  const { data, isLoading, error, refetch } = useAttendance({
    student: studentFilter ? parseInt(studentFilter) : undefined,
    date: dateFilter || undefined,
    status: statusFilter || undefined,
  });

  const clearFilters = () => {
    setStudentFilter('');
    setDateFilter('');
    setStatusFilter('');
  };

  const hasActiveFilters = studentFilter || dateFilter || statusFilter;

  // Group attendance by child for summary
  const attendanceByChild = useMemo(() => {
    const grouped: Record<number, { present: number; absent: number }> = {};
    if (data?.results) {
      data.results.forEach((attendance) => {
        if (!grouped[attendance.student]) {
          grouped[attendance.student] = { present: 0, absent: 0 };
        }
        if (attendance.status === 'PRESENT') {
          grouped[attendance.student].present += 1;
        } else if (attendance.status === 'ABSENT') {
          grouped[attendance.student].absent += 1;
        }
      });
    }
    return grouped;
  }, [data]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground mt-2">View your children's attendance records</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>Attendance records for your children</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-filter">Child</Label>
                <Select value={studentFilter || 'all'} onValueChange={(value) => setStudentFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger id="student-filter">
                    <SelectValue placeholder="All children" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All children</SelectItem>
                    {studentsData?.results.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.full_name || `${student.first_name} ${student.last_name}`}
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

          {/* Attendance Summary by Child */}
          {Object.keys(attendanceByChild).length > 0 && !hasActiveFilters && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium mb-3">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(attendanceByChild).map(([studentId, summary]) => {
                  const student = studentsData?.results.find(s => s.id === parseInt(studentId));
                  const studentName = student
                    ? (student.full_name || `${student.first_name} ${student.last_name}`)
                    : `Student #${studentId}`;
                  
                  return (
                    <div key={studentId} className="flex items-center justify-between p-2 bg-background rounded">
                      <span className="text-sm font-medium">{studentName}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600">{summary.present} present</span>
                        <span className="text-red-600">{summary.absent} absent</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    <TableHead>Child</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(attendance.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            attendance.status === 'PRESENT'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {attendance.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {attendance.notes || '—'}
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
                  : "No attendance records available for your children yet."
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
