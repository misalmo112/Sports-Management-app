/**
 * Add Student Modal Component
 * Dialog for adding students to a class
 */
import { useState, useDeferredValue, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useStudents } from '@/features/tenant/students/hooks/hooks';
import { useCreateEnrollment } from '../hooks/hooks';

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number | string;
  enrolledStudentIds?: number[];
  onSuccess?: () => void;
}

export const AddStudentModal = ({
  open,
  onOpenChange,
  classId,
  enrolledStudentIds = [],
  onSuccess,
}: AddStudentModalProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const deferredSearch = useDeferredValue(studentSearch.trim());
  const isSearching = deferredSearch.length > 0;
  const pageSize = isSearching ? 20 : showAllStudents ? 100 : 20;
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
  } = useStudents({
    is_active: true,
    search: isSearching ? deferredSearch : undefined,
    page_size: pageSize,
  });
  const createEnrollment = useCreateEnrollment();

  // Filter out already enrolled students
  const availableStudents = useMemo(
    () =>
      studentsData?.results.filter(
        (student) => !enrolledStudentIds.includes(student.id)
      ) || [],
    [studentsData?.results, enrolledStudentIds]
  );
  const filteredStudents = useMemo(() => {
    if (isSearching || showAllStudents) {
      return availableStudents;
    }
    return [];
  }, [availableStudents, isSearching, showAllStudents]);
  const shouldShowList = studentSearch.trim().length > 0 || showAllStudents;
  const selectedStudent =
    availableStudents.find((student) => student.id.toString() === selectedStudentId) || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!selectedStudentId) {
      setErrors({
        student: ['Please select a student'],
      });
      return;
    }

    try {
      await createEnrollment.mutateAsync({
        student: parseInt(selectedStudentId),
        class_obj: typeof classId === 'string' ? parseInt(classId) : classId,
        notes: notes || undefined,
      });

      // Reset form
      setSelectedStudentId('');
      setNotes('');
      setErrors({});

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (typeof errorData === 'object') {
          setErrors(errorData);
        } else {
          setErrors({
            non_field_errors: [errorData || 'Failed to enroll student'],
          });
        }
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to enroll student'],
        });
      }
    }
  };

  const handleClose = () => {
    if (!createEnrollment.isPending) {
      setSelectedStudentId('');
      setStudentSearch('');
      setShowAllStudents(false);
      setNotes('');
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Student to Class</DialogTitle>
          <DialogDescription>
            Select a student to enroll in this class.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {errors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="student">
                Student <span className="text-destructive">*</span>
              </Label>
              <Input
                id="student-search"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  if (e.target.value.trim().length > 0) {
                    setShowAllStudents(false);
                  }
                }}
                placeholder="Search students..."
                disabled={isLoadingStudents || createEnrollment.isPending}
              />
              {shouldShowList ? (
                <div className="rounded-md border bg-background">
                  <div className="max-h-56 overflow-y-auto">
                    {isLoadingStudents || isFetchingStudents ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Loading students...
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {studentSearch.trim().length > 0
                          ? 'No matching students'
                          : 'No students available'}
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = student.id.toString() === selectedStudentId;
                        return (
                          <button
                            key={student.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                              isSelected ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedStudentId(student.id.toString())}
                            disabled={createEnrollment.isPending}
                          >
                            <div className="font-medium">{student.full_name}</div>
                            {student.email && (
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {!isSearching && showAllStudents && studentsData?.count && studentsData.count > pageSize && (
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                      Showing {filteredStudents.length} of {studentsData.count} students. Start typing to narrow the list.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Type to search or{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setShowAllStudents(true)}
                    disabled={isLoadingStudents || createEnrollment.isPending}
                  >
                    show all students
                  </button>
                </div>
              )}
              {selectedStudent && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Selected: {selectedStudent.full_name}</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setSelectedStudentId('')}
                    disabled={createEnrollment.isPending}
                  >
                    Clear
                  </button>
                </div>
              )}
              {errors.student && (
                <p className="text-sm text-destructive">{errors.student[0]}</p>
              )}
              {errors.class_obj && (
                <p className="text-sm text-destructive">{errors.class_obj[0]}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about this enrollment..."
                disabled={createEnrollment.isPending}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes[0]}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createEnrollment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createEnrollment.isPending || !selectedStudentId}>
              {createEnrollment.isPending ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
