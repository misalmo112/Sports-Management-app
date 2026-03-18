/**
 * Enrollment Page
 * Manage enrollments for a class
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Plus, Trash2, Edit, CheckCircle2, AlertCircle } from 'lucide-react';
import { useClass } from '../hooks/hooks';
import { useEnrollments, useDeleteEnrollment, useUpdateEnrollment } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { AddStudentModal } from '../components/AddStudentModal';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { UpdateEnrollmentRequest, Enrollment } from '../types';

export const EnrollmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<{
    id: number | string;
    studentName: string;
  } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateEnrollmentRequest>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { formatDateTime } = useAcademyFormat();

  const { data: classData, isLoading: isLoadingClass, error: classError } = useClass(id);
  const {
    data: enrollmentsData,
    isLoading: isLoadingEnrollments,
    error: enrollmentsError,
    refetch: refetchEnrollments,
  } = useEnrollments({
    class_obj: id ? parseInt(id) : undefined,
    status: 'ENROLLED',
  });

  const deleteEnrollment = useDeleteEnrollment();
  const updateEnrollment = useUpdateEnrollment();

  const handleDeleteClick = (enrollment: { id: number | string; studentName: string }) => {
    setEnrollmentToDelete(enrollment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (enrollmentToDelete) {
      try {
        await deleteEnrollment.mutateAsync(enrollmentToDelete.id);
        setDeleteDialogOpen(false);
        setEnrollmentToDelete(null);
        setSuccessMessage('Enrollment removed successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        refetchEnrollments();
      } catch (error) {
        // Error handling is done by the mutation
      }
    }
  };

  const handleEditClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setEditFormData({
      notes: enrollment.notes || undefined,
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors({});

    if (!selectedEnrollment) return;

    try {
      await updateEnrollment.mutateAsync({
        id: selectedEnrollment.id,
        data: editFormData,
      });
      setIsEditModalOpen(false);
      setSelectedEnrollment(null);
      setEditFormData({});
      setSuccessMessage('Enrollment updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      refetchEnrollments();
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update enrollment'],
        });
      }
    }
  };

  const enrolledStudentIds =
    enrollmentsData?.results.map((enrollment) => enrollment.student) || [];

  if (isLoadingClass) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading class details..." />
      </div>
    );
  }

  if (classError) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={classError}
          onRetry={() => window.location.reload()}
          title="Failed to load class"
          fullPage
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/classes/${id}`)}>
          ← Back to Class
        </Button>
      </div>

      {classData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{classData.name}</CardTitle>
            <CardDescription>Manage student enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Capacity</div>
                <div className="text-lg font-semibold">
                  {classData.current_enrollment} / {classData.max_capacity}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Available Spots</div>
                <div className="text-lg font-semibold">{classData.available_spots}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div>
                  {classData.is_full ? (
                    <Badge variant="destructive">Full</Badge>
                  ) : (
                    <Badge variant="default">Available</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                {enrollmentsData?.results.length || 0} student(s) enrolled
              </CardDescription>
            </div>
            <Button
              onClick={() => setAddStudentModalOpen(true)}
              disabled={classData?.is_full || isLoadingEnrollments}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Students
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enrollmentsError && (
            <ErrorState
              error={enrollmentsError}
              onRetry={() => refetchEnrollments()}
              title="Failed to load enrollments"
              className="mb-4"
            />
          )}

          {isLoadingEnrollments ? (
            <LoadingState message="Loading enrollments..." />
          ) : enrollmentsData?.results && enrollmentsData.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Enrolled Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollmentsData.results.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.student_detail?.full_name || `Student #${enrollment.student}`}
                      </TableCell>
                      <TableCell>{formatDateTime(enrollment.enrolled_at)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {enrollment.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(enrollment)}
                            disabled={updateEnrollment.isPending || deleteEnrollment.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteClick({
                                id: enrollment.id,
                                studentName:
                                  enrollment.student_detail?.full_name ||
                                  `Student #${enrollment.student}`,
                              })
                            }
                            disabled={updateEnrollment.isPending || deleteEnrollment.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No enrollments"
              description={
                classData?.is_full
                  ? 'This class is at full capacity.'
                  : 'No students are enrolled in this class yet.'
              }
              actionLabel={classData?.is_full ? undefined : 'Add Students'}
              onAction={classData?.is_full ? undefined : () => setAddStudentModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <AddStudentModal
        open={addStudentModalOpen}
        onOpenChange={setAddStudentModalOpen}
        classId={id!}
        enrolledStudentIds={enrolledStudentIds}
        maxCapacity={classData?.max_capacity}
        availableSpots={classData?.available_spots}
        onSuccess={() => {
          refetchEnrollments();
        }}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Remove Enrollment"
        description={
          enrollmentToDelete
            ? `Are you sure you want to remove "${enrollmentToDelete.studentName}" from this class?`
            : undefined
        }
        isLoading={deleteEnrollment.isPending}
      />

      {/* Edit Enrollment Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Enrollment</DialogTitle>
            <DialogDescription>
              Update enrollment notes for {selectedEnrollment?.student_detail?.full_name || 'this student'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              {editErrors.non_field_errors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {editErrors.non_field_errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editFormData.notes || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, notes: e.target.value || undefined }));
                    if (editErrors.notes) setEditErrors((prev) => clearFieldError(prev, 'notes'));
                  }}
                  rows={4}
                  placeholder="Optional enrollment notes..."
                  disabled={updateEnrollment.isPending}
                />
                {editErrors.notes && (
                  <p className="text-sm text-destructive">{editErrors.notes[0]}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedEnrollment(null);
                  setEditFormData({});
                  setEditErrors({});
                }}
                disabled={updateEnrollment.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateEnrollment.isPending}>
                {updateEnrollment.isPending ? 'Updating...' : 'Update Enrollment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
