/**
 * Parent Children Page
 * View parent's children (students) with classes and attendance summary
 */
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useStudents } from '../hooks/hooks';
import { useEnrollments } from '@/features/tenant/classes/hooks/hooks';
import { useAttendance } from '@/features/tenant/attendance/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { User, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import type { Student } from '../types';
import type { Enrollment } from '@/features/tenant/classes/types';

export const ParentChildrenPage = () => {
  const { data: studentsData, isLoading: studentsLoading, error: studentsError, refetch: refetchStudents } = useStudents({
    is_active: true,
  });

  // Fetch enrollments for all children
  const { data: enrollmentsData } = useEnrollments({
    status: 'ENROLLED',
  });

  // Fetch attendance for all children
  const { data: attendanceData } = useAttendance({});

  // Group enrollments by student
  const enrollmentsByStudent = useMemo(() => {
    const grouped: Record<number, Enrollment[]> = {};
    if (enrollmentsData?.results) {
      enrollmentsData.results.forEach((enrollment) => {
        if (!grouped[enrollment.student]) {
          grouped[enrollment.student] = [];
        }
        grouped[enrollment.student].push(enrollment);
      });
    }
    return grouped;
  }, [enrollmentsData]);

  // Calculate attendance summary for each child
  const attendanceSummaryByStudent = useMemo(() => {
    const summary: Record<number, { present: number; absent: number }> = {};
    if (attendanceData?.results) {
      attendanceData.results.forEach((attendance) => {
        if (!summary[attendance.student]) {
          summary[attendance.student] = { present: 0, absent: 0 };
        }
        if (attendance.status === 'PRESENT') {
          summary[attendance.student].present += 1;
        } else if (attendance.status === 'ABSENT') {
          summary[attendance.student].absent += 1;
        }
      });
    }
    return summary;
  }, [attendanceData]);

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

  if (studentsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Children</h1>
          <p className="text-muted-foreground mt-2">View your children's information</p>
        </div>
        <LoadingState message="Loading children..." />
      </div>
    );
  }

  if (studentsError) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Children</h1>
          <p className="text-muted-foreground mt-2">View your children's information</p>
        </div>
        <ErrorState error={studentsError} onRetry={refetchStudents} title="Failed to load children" />
      </div>
    );
  }

  if (!studentsData?.results || studentsData.results.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Children</h1>
          <p className="text-muted-foreground mt-2">View your children's information</p>
        </div>
        <EmptyState
          title="No children found"
          description="You don't have any children enrolled in the academy yet."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Children</h1>
        <p className="text-muted-foreground mt-2">View your children's information, classes, and attendance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studentsData.results.map((child: Student) => {
          const enrollments = enrollmentsByStudent[child.id] || [];
          const attendanceSummary = attendanceSummaryByStudent[child.id] || { present: 0, absent: 0 };

          return (
            <Card key={child.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {child.full_name || `${child.first_name} ${child.last_name}`}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {child.age ? `Age ${child.age}` : formatGender(child.gender)}
                      </CardDescription>
                    </div>
                  </div>
                  {child.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Classes Enrolled */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Classes</span>
                  </div>
                  {enrollments.length > 0 ? (
                    <div className="space-y-1">
                      {enrollments.slice(0, 3).map((enrollment) => (
                        <div key={enrollment.id} className="text-sm text-muted-foreground">
                          {enrollment.class_detail?.name || `Class #${enrollment.class_obj}`}
                        </div>
                      ))}
                      {enrollments.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{enrollments.length - 3} more class{enrollments.length - 3 !== 1 ? 'es' : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No classes enrolled</p>
                  )}
                </div>

                {/* Attendance Summary */}
                {(attendanceSummary.present > 0 || attendanceSummary.absent > 0) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Attendance</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-muted-foreground">
                          {attendanceSummary.present} present
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-600" />
                        <span className="text-muted-foreground">
                          {attendanceSummary.absent} absent
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
