/**
 * Coach (Staff) Detail Page
 * View coach details and staff attendance.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Edit } from 'lucide-react';
import { useCoach } from '@/features/tenant/coaches/hooks/hooks';
import { useCoachAttendance } from '@/features/tenant/attendance/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

export const CoachDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatDateTime } = useAcademyFormat();

  const { data: coach, isLoading: coachLoading, error: coachError } = useCoach(id);
  const { data: attendanceData, isLoading: attendanceLoading } = useCoachAttendance({
    coach: id ? parseInt(id, 10) : undefined,
    page_size: 50,
  });

  const attendanceList = attendanceData?.results ?? [];
  const attendanceStats =
    attendanceList.length > 0
      ? {
          total: attendanceList.length,
          present: attendanceList.filter((a) => a.status === 'PRESENT').length,
          absent: attendanceList.filter((a) => a.status === 'ABSENT').length,
          late: attendanceList.filter((a) => a.status === 'LATE').length,
          rate:
            attendanceList.length > 0
              ? Math.round(
                  (attendanceList.filter((a) => a.status === 'PRESENT').length /
                    attendanceList.length) *
                    100
                )
              : 0,
        }
      : null;

  const handleEdit = () => {
    navigate('/dashboard/management/staff', {
      state: id ? { editCoachId: parseInt(id, 10) } : undefined,
    });
  };

  if (coachLoading || !id) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading coach..." />
      </div>
    );
  }

  if (coachError || !coach) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={(coachError as Error) || new Error('Coach not found')}
          onRetry={() => window.location.reload()}
          title="Failed to load coach"
        />
      </div>
    );
  }

  const coachName = coach.full_name || `${coach.first_name} ${coach.last_name}`;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/management/staff')}>
          Back to Staff
        </Button>
        <Button onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Coach
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Coach details</CardTitle>
            <CardDescription>Contact and role information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-lg font-medium">{coachName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{coach.email || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="text-lg font-medium">{coach.phone || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Specialization / role</Label>
              <p className="text-lg font-medium">{coach.specialization || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge variant={coach.is_active ? 'default' : 'secondary'}>
                  {coach.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Assigned classes</Label>
              <p className="text-lg font-medium">{coach.assigned_classes_count ?? 0}</p>
            </div>
            {coach.certifications && (
              <div className="sm:col-span-2">
                <Label className="text-muted-foreground">Certifications</Label>
                <p className="mt-1 whitespace-pre-wrap">{coach.certifications}</p>
              </div>
            )}
            {coach.bio && (
              <div className="sm:col-span-2">
                <Label className="text-muted-foreground">Bio</Label>
                <p className="mt-1 whitespace-pre-wrap">{coach.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff attendance</CardTitle>
            <CardDescription>
              {attendanceStats
                ? `${attendanceStats.total} record${attendanceStats.total !== 1 ? 's' : ''} — ${attendanceStats.rate}% present`
                : 'No attendance records'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceStats && attendanceStats.total > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <Label className="text-muted-foreground">Total</Label>
                    <p className="text-xl font-semibold">{attendanceStats.total}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Present</Label>
                    <p className="text-xl font-semibold text-green-600">
                      {attendanceStats.present}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Absent</Label>
                    <p className="text-xl font-semibold text-red-600">{attendanceStats.absent}</p>
                  </div>
                  {attendanceStats.late > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Late</Label>
                      <p className="text-xl font-semibold">{attendanceStats.late}</p>
                    </div>
                  )}
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceList.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{formatDateTime(r.date)}</TableCell>
                          <TableCell>
                            {'class_name' in r && typeof (r as { class_name?: string }).class_name === 'string'
                              ? (r as { class_name: string }).class_name
                              : r.class_detail?.name ?? `Class #${r.class_obj}`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                r.status === 'PRESENT'
                                  ? 'default'
                                  : r.status === 'LATE'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {r.notes || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : attendanceLoading ? (
              <LoadingState message="Loading attendance..." />
            ) : (
              <p className="text-muted-foreground">No attendance records for this coach yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
