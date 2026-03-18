/**
 * Add Students Modal Component
 * Dialog for adding multiple students to a class
 */
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, XCircle } from 'lucide-react';
import { createEnrollment as createEnrollmentApi } from '../services/api';
import type { CreateEnrollmentRequest } from '../types';
import type { Student } from '@/features/tenant/students/types';
import { useStudents } from '@/features/tenant/students/hooks/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number | string;
  enrolledStudentIds?: number[];
  maxCapacity?: number;
  availableSpots?: number;
  onSuccess?: () => void;
}

export const AddStudentModal = ({
  open,
  onOpenChange,
  classId,
  enrolledStudentIds = [],
  maxCapacity,
  availableSpots,
  onSuccess,
}: AddStudentModalProps) => {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedStudentsById, setSelectedStudentsById] = useState<Record<number, Student>>({});

  const [studentSearch, setStudentSearch] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);

  const [enrollPhase, setEnrollPhase] = useState<'review' | 'enrolling' | 'results'>('review');
  const [batchResults, setBatchResults] = useState<{
    enrolled: number[];
    failed: Array<{ studentId: number; reason: string }>;
  } | null>(null);

  const deferredSearch = useDeferredValue(studentSearch.trim());
  const isSearching = deferredSearch.length > 0;
  const pageSize = isSearching ? 20 : showAllStudents ? 200 : 20;

  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
  } = useStudents({
    is_active: true,
    search: isSearching ? deferredSearch : undefined,
    page_size: pageSize,
  });

  // Reset wizard each time modal opens.
  const resetWizard = () => {
    setStep(1);
    setSelectedStudentIds([]);
    setSelectedStudentsById({});
    setStudentSearch('');
    setShowAllStudents(false);
    setEnrollPhase('review');
    setBatchResults(null);
  };

  const availableStudents = useMemo(
    () =>
      studentsData?.results.filter((student) => !enrolledStudentIds.includes(student.id)) || [],
    [studentsData?.results, enrolledStudentIds]
  );

  const filteredStudents = useMemo(() => {
    if (isSearching || showAllStudents) return availableStudents;
    return [];
  }, [availableStudents, isSearching, showAllStudents]);

  const shouldShowList = studentSearch.trim().length > 0 || showAllStudents;

  const addOrRemoveSelected = (student: Student) => {
    setSelectedStudentIds((prev) => {
      const exists = prev.includes(student.id);
      if (exists) return prev.filter((id) => id !== student.id);
      return [...prev, student.id];
    });
    setSelectedStudentsById((prev) => {
      const exists = prev[student.id] !== undefined;
      if (exists) {
        const { [student.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [student.id]: student };
    });
  };

  const removeSelectedById = (studentId: number) => {
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    setSelectedStudentsById((prev) => {
      if (!prev[studentId]) return prev;
      const { [studentId]: _, ...rest } = prev;
      return rest;
    });
  };

  const extractEnrollmentReason = (error: any) => {
    const data = error?.response?.data ?? error?.data;
    if (!data) return error?.message || 'Failed to enroll student';
    if (typeof data === 'string') return data;
    if (data?.detail) return data.detail;

    if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
      return data.non_field_errors.join(', ');
    }

    if (typeof data === 'object') {
      const firstArrayValue = Object.values(data).find(
        (v) => Array.isArray(v) && v.length > 0
      ) as string[] | undefined;
      if (firstArrayValue && firstArrayValue.length > 0) return firstArrayValue[0];
    }

    return error?.message || 'Failed to enroll student';
  };

  const selectedCount = selectedStudentIds.length;

  const handleClose = () => {
    if (enrollPhase !== 'enrolling') {
      resetWizard();
      onOpenChange(false);
    }
  };

  const enrollAll = async () => {
    if (selectedStudentIds.length === 0) return;

    const class_obj = typeof classId === 'string' ? parseInt(classId) : classId;

    setEnrollPhase('enrolling');
    setBatchResults({ enrolled: [], failed: [] });

    const enrolledIds: number[] = [];
    const failed: Array<{ studentId: number; reason: string }> = [];

    // Backend validates capacity/duplicates per enrollment, so we enroll sequentially for predictable UX.
    for (const studentId of selectedStudentIds) {
      try {
        const payload: CreateEnrollmentRequest = {
          student: studentId,
          class_obj,
        };
        await createEnrollmentApi(payload);
        enrolledIds.push(studentId);
      } catch (error: any) {
        failed.push({ studentId, reason: extractEnrollmentReason(error) });
      }
    }

    setBatchResults({ enrolled: enrolledIds, failed });
    queryClient.invalidateQueries({ queryKey: ['enrollments', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['classes', 'detail', classId] });
    onSuccess?.();
    setEnrollPhase('results');
  };

  const handleStepToReview = () => {
    setEnrollPhase('review');
    setBatchResults(null);
    setStep(2);
  };

  // Keep wizard state fresh when the modal is opened from the UI.
  useEffect(() => {
    if (open) resetWizard();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1100px] w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Students to Class</DialogTitle>
          <DialogDescription>
            Search, select multiple students, and review before enrolling.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="student">
                    Student <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="student-search"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      if (e.target.value.trim().length > 0) setShowAllStudents(false);
                    }}
                    placeholder="Search students (name/email)..."
                    disabled={isLoadingStudents || enrollPhase === 'enrolling'}
                  />
                </div>

                {shouldShowList ? (
                  <div className="rounded-md border bg-background">
                    <div className="max-h-[48vh] overflow-y-auto">
                      {isLoadingStudents || isFetchingStudents ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Loading students...</div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {studentSearch.trim().length > 0 ? 'No matching students' : 'No students available'}
                        </div>
                      ) : (
                        filteredStudents.map((student) => {
                          const isSelected = selectedStudentIds.includes(student.id);
                          return (
                            <button
                              key={student.id}
                              type="button"
                              className={`w-full text-left px-4 py-3 text-sm hover:bg-muted ${
                                isSelected ? 'bg-muted' : ''
                              }`}
                              onClick={() => addOrRemoveSelected(student)}
                              disabled={enrollPhase === 'enrolling'}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{student.full_name}</div>
                                  {student.email ? (
                                    <div className="text-xs text-muted-foreground truncate">{student.email}</div>
                                  ) : null}
                                </div>
                                {isSelected ? <Check className="mt-1 h-4 w-4" /> : null}
                              </div>
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
                      disabled={isLoadingStudents || enrollPhase === 'enrolling'}
                    >
                      show all students
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label>Selected</Label>
                  <Badge variant={selectedCount === 0 ? 'secondary' : 'default'}>
                    {selectedCount} student{selectedCount === 1 ? '' : 's'}
                  </Badge>
                </div>

                {selectedCount === 0 ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                    Click student rows to select them.
                  </div>
                ) : (
                  <div className="rounded-md border bg-background">
                    <div className="max-h-[48vh] overflow-y-auto">
                      {selectedStudentIds.map((studentId) => {
                        const student = selectedStudentsById[studentId];
                        return (
                          <div key={studentId} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{student?.full_name ?? `Student #${studentId}`}</div>
                              {student?.email ? (
                                <div className="text-xs text-muted-foreground truncate">{student.email}</div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => removeSelectedById(studentId)}
                              disabled={enrollPhase === 'enrolling'}
                              aria-label={`Remove ${student?.full_name ?? studentId}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudentIds([]);
                          setSelectedStudentsById({});
                        }}
                        disabled={enrollPhase === 'enrolling'}
                      >
                        Clear selection
                      </Button>
                    </div>
                  </div>
                )}

                {availableSpots !== undefined && maxCapacity !== undefined ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Capacity: {availableSpots} spot{availableSpots === 1 ? '' : 's'} remaining (of {maxCapacity}).
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              {enrollPhase === 'review' && (
                <div className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold">Review & Enroll</div>
                      <div className="text-sm text-muted-foreground">
                        You are about to enroll {selectedCount} student{selectedCount === 1 ? '' : 's'}.
                      </div>
                    </div>
                    <Badge variant="secondary">{selectedCount} selected</Badge>
                  </div>

                  {availableSpots !== undefined && selectedCount > availableSpots ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This class has {availableSpots} spot{availableSpots === 1 ? '' : 's'} remaining, so some enrollments may fail.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="rounded-md border bg-background">
                    <div className="max-h-[45vh] overflow-y-auto">
                      {selectedStudentIds.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-muted-foreground">No students selected.</div>
                      ) : (
                        selectedStudentIds.map((studentId) => {
                          const student = selectedStudentsById[studentId];
                          return (
                            <div key={studentId} className="flex items-center justify-between gap-3 px-3 py-2">
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {student?.full_name ?? `Student #${studentId}`}
                                </div>
                                {student?.email ? (
                                  <div className="text-xs text-muted-foreground truncate">{student.email}</div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => removeSelectedById(studentId)}
                                aria-label={`Unselect ${student?.full_name ?? studentId}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {enrollPhase === 'enrolling' && (
                <div className="rounded-md border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <div className="font-medium">Enrolling students...</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Submitting {selectedCount} request{selectedCount === 1 ? '' : 's'}.
                  </div>
                </div>
              )}

              {enrollPhase === 'results' && batchResults && (
                <div className="grid gap-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Enrolled {batchResults.enrolled.length} student{batchResults.enrolled.length === 1 ? '' : 's'} successfully. {batchResults.failed.length} failed.
                    </AlertDescription>
                  </Alert>

                  {batchResults.failed.length > 0 ? (
                    <div className="rounded-md border bg-background">
                      <div className="max-h-[35vh] overflow-y-auto">
                        {batchResults.failed.map((f) => {
                          const student = selectedStudentsById[f.studentId];
                          return (
                            <div key={f.studentId} className="px-3 py-2 border-b last:border-b-0">
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {student?.full_name ?? `Student #${f.studentId}`}
                                </div>
                                <div className="text-sm text-destructive">{f.reason}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button type="button" onClick={handleClose}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 1 && (
            <>
              <Button type="button" variant="outline" onClick={handleClose} disabled={enrollPhase === 'enrolling'}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selectedCount === 0 || enrollPhase === 'enrolling'}
                onClick={handleStepToReview}
              >
                Review {selectedCount} student{selectedCount === 1 ? '' : 's'}
              </Button>
            </>
          )}

          {step === 2 && enrollPhase === 'review' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={enrollAll}
                disabled={selectedStudentIds.length === 0}
              >
                {`Enroll ${selectedCount}`}
              </Button>
            </>
          )}

          {step === 2 && enrollPhase !== 'review' && (
            <Button type="button" variant="outline" onClick={handleClose} disabled={enrollPhase === 'enrolling'}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
