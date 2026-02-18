/**
 * Student Detail Page
 * View student details
 */
import { useState } from 'react';
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
import { Edit, Trash2 } from 'lucide-react';
import { useStudent, useDeleteStudent } from '../hooks/hooks';
import { useEnrollments } from '@/features/tenant/classes/hooks/hooks';
import { useAttendance } from '@/features/tenant/attendance/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { DeleteStudentDialog } from '../components/DeleteStudentDialog';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

export const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: student, isLoading, error } = useStudent(id);
  const deleteStudent = useDeleteStudent();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { formatDateTime } = useAcademyFormat();
  const { data: enrollmentsData } = useEnrollments({
    student: id ? parseInt(id) : undefined,
    page_size: 50,
  });
  const { data: attendanceData } = useAttendance({
    student: id ? parseInt(id) : undefined,
    page_size: 50,
  });

  const formatGender = (gender?: string) => {
    if (!gender) return '—';
    const genderMap: Record<string, string> = {
      MALE: 'Male',
      FEMALE: 'Female',
      OTHER: 'Other',
      PREFER_NOT_TO_SAY: 'Prefer not to say',
    };
    return genderMap[gender] || gender;
  };

  const formatEnrollmentStatus = (status?: string) => {
    if (!status) return '—';
    const statusMap: Record<string, string> = {
      ENROLLED: 'Enrolled',
      COMPLETED: 'Completed',
      DROPPED: 'Dropped',
    };
    return statusMap[status] || status;
  };

  // Calculate attendance statistics
  const attendanceStats = attendanceData?.results
    ? {
        total: attendanceData.results.length,
        present: attendanceData.results.filter((a) => a.status === 'PRESENT').length,
        absent: attendanceData.results.filter((a) => a.status === 'ABSENT').length,
        rate:
          attendanceData.results.length > 0
            ? Math.round(
                (attendanceData.results.filter((a) => a.status === 'PRESENT').length /
                  attendanceData.results.length) *
                  100
              )
            : 0,
      }
    : null;

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteStudent.mutateAsync(id);
      navigate('/dashboard/students');
    } catch (error) {
      // Error handling is done by the mutation
      console.error('Failed to delete student:', error);
    }
  };

  const studentName = student?.full_name || (student ? `${student.first_name} ${student.last_name}` : '');

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading student..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Student not found')}
          onRetry={() => window.location.reload()}
          title="Failed to load student"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/students')}>
          ← Back to Students
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/dashboard/students/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Student
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={deleteStudent.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Student
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <p className="text-lg font-medium">
                {student.full_name || `${student.first_name} ${student.last_name}`}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Age</Label>
              <p className="text-lg font-medium">{student.age || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date of Birth</Label>
              <p className="text-lg font-medium">{formatDateTime(student.date_of_birth)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Gender</Label>
              <p className="text-lg font-medium">{formatGender(student.gender)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-2">
                {student.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Emirates ID</Label>
              <p className="text-lg font-medium">{student.emirates_id || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Parent/Guardian</Label>
              <p className="text-lg font-medium">
                {student.parent_detail?.full_name || 'N/A'}
                {student.parent_detail?.email && (
                  <span className="text-muted-foreground ml-2">
                    ({student.parent_detail.email})
                  </span>
                )}
              </p>
              {student.parent_detail?.phone && (
                <p className="text-sm text-muted-foreground mt-1">
                  Phone: {student.parent_detail.phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        {(student.emergency_contact_name ||
          student.emergency_contact_phone ||
          student.emergency_contact_relationship) && (
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="text-lg font-medium">
                  {student.emergency_contact_name || '—'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="text-lg font-medium">
                  {student.emergency_contact_phone || '—'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Relationship</Label>
                <p className="text-lg font-medium">
                  {student.emergency_contact_relationship || '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medical Information */}
        {(student.allergies || student.medical_notes) && (
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.allergies && (
                <div>
                  <Label className="text-muted-foreground">Allergies</Label>
                  <p className="mt-2 whitespace-pre-wrap">{student.allergies}</p>
                </div>
              )}
              {student.medical_notes && (
                <div>
                  <Label className="text-muted-foreground">Medical Notes</Label>
                  <p className="mt-2 whitespace-pre-wrap">{student.medical_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
            <CardDescription>
              {enrollmentsData?.count || 0} enrollment
              {enrollmentsData?.count !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentsData?.results && enrollmentsData.results.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollmentsData.results.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">
                          {enrollment.class_detail?.name || `Class #${enrollment.class_obj}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              enrollment.status === 'ENROLLED'
                                ? 'default'
                                : enrollment.status === 'COMPLETED'
                                  ? 'success'
                                  : 'secondary'
                            }
                          >
                            {formatEnrollmentStatus(enrollment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(enrollment.enrolled_at)}</TableCell>
                        <TableCell>{enrollment.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No enrollments found</p>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
            <CardDescription>
              {attendanceStats
                ? `${attendanceStats.total} record${attendanceStats.total !== 1 ? 's' : ''} - ${attendanceStats.rate}% attendance rate`
                : 'No attendance records'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceStats && attendanceStats.total > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Total Records</Label>
                    <p className="text-2xl font-bold">{attendanceStats.total}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Present</Label>
                    <p className="text-2xl font-bold text-green-600">
                      {attendanceStats.present}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Absent</Label>
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                  </div>
                </div>

                {attendanceData?.results && attendanceData.results.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">
                      Recent Attendance Records
                    </Label>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceData.results.slice(0, 10).map((attendance) => (
                            <TableRow key={attendance.id}>
                              <TableCell>{formatDateTime(attendance.date)}</TableCell>
                              <TableCell>
                                {attendance.class_detail?.name ||
                                  `Class #${attendance.class_obj}`}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    attendance.status === 'PRESENT' ? 'default' : 'destructive'
                                  }
                                >
                                  {attendance.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No attendance records found</p>
            )}
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Created: {formatDateTime(student.created_at)}</p>
            <p>Last Updated: {formatDateTime(student.updated_at)}</p>
          </CardContent>
        </Card>
      </div>

      <DeleteStudentDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        studentName={studentName}
        isLoading={deleteStudent.isPending}
      />
    </div>
  );
};
