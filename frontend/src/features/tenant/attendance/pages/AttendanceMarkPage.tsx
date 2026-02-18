/**
 * Attendance Mark Page
 * Mark attendance for a class/session
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useMarkAttendance } from '../hooks/hooks';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { useEnrollments } from '@/features/tenant/classes/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { MarkAttendanceRequest } from '../types';

interface StudentAttendanceRecord {
  student_id: number;
  student_name: string;
  status: 'PRESENT' | 'ABSENT';
  notes: string;
  selected: boolean;
}

/**
 * Normalizes error response to ensure all values are arrays of strings
 * Handles Django REST Framework error structures including nested array errors
 */
function normalizeErrorResponse(errorData: any): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  
  if (!errorData || typeof errorData !== 'object') {
    return normalized;
  }
  
  // Handle DRF error structure: { errors: { field: ["error"] } }
  if (errorData.errors && typeof errorData.errors === 'object') {
    for (const [field, messages] of Object.entries(errorData.errors)) {
      if (Array.isArray(messages)) {
        normalized[field] = messages.map(msg => 
          typeof msg === 'string' ? msg : JSON.stringify(msg)
        );
      } else if (typeof messages === 'string') {
        normalized[field] = [messages];
      } else {
        normalized[field] = [JSON.stringify(messages)];
      }
    }
  }
  
  // Handle direct field errors: { field: ["error"] }
  for (const [key, value] of Object.entries(errorData)) {
    if (key === 'errors' || key === 'detail') continue; // Already handled
    
    // Special handling for attendance_records array errors
    if (key === 'attendance_records' && Array.isArray(value)) {
      const recordErrors: string[] = [];
      value.forEach((recordError: any, index: number) => {
        // Skip empty objects (records with no errors)
        if (recordError && typeof recordError === 'object' && Object.keys(recordError).length > 0) {
          // Extract field errors from the record
          const fieldErrors: string[] = [];
          let studentId: number | null = null;
          
          for (const [field, messages] of Object.entries(recordError)) {
            // Extract student_id if present for better error messages
            if (field === 'student_id' && typeof messages === 'object' && messages !== null) {
              // Try to extract student ID from error message or field context
              const errorObj = messages as any;
              if (Array.isArray(errorObj) && errorObj.length > 0) {
                const firstError = errorObj[0];
                // Try to extract ID from error message like "Student with id 1408..."
                const idMatch = typeof firstError === 'string' ? firstError.match(/id (\d+)/i) : null;
                if (idMatch) {
                  studentId = parseInt(idMatch[1], 10);
                }
              }
            }
            
            if (Array.isArray(messages)) {
              messages.forEach((msg: any) => {
                const errorText = typeof msg === 'string' ? msg : JSON.stringify(msg);
                // For student_id errors, don't add redundant "Student Id:" prefix
                if (field === 'student_id') {
                  fieldErrors.push(errorText);
                } else {
                  // Format field name nicely (status -> Status)
                  const fieldName = field
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  fieldErrors.push(`${fieldName}: ${errorText}`);
                }
              });
            } else if (typeof messages === 'string') {
              if (field === 'student_id') {
                fieldErrors.push(messages);
              } else {
                const fieldName = field
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                fieldErrors.push(`${fieldName}: ${messages}`);
              }
            } else {
              const fieldName = field
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              fieldErrors.push(`${fieldName}: ${JSON.stringify(messages)}`);
            }
          }
          if (fieldErrors.length > 0) {
            // Format error message with student ID if available
            const prefix = studentId 
              ? `Student ID ${studentId}: ` 
              : `Record ${index + 1}: `;
            recordErrors.push(prefix + fieldErrors.join(', '));
          }
        }
      });
      if (recordErrors.length > 0) {
        normalized[key] = recordErrors;
      }
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(msg => 
        typeof msg === 'string' ? msg : JSON.stringify(msg)
      );
    } else if (typeof value === 'string') {
      normalized[key] = [value];
    } else if (value && typeof value === 'object') {
      // Nested object - convert to string
      normalized[key] = [JSON.stringify(value)];
    }
  }
  
  // Handle detail field (common in DRF)
  if (errorData.detail && typeof errorData.detail === 'string') {
    normalized.non_field_errors = [errorData.detail];
  } else if (errorData.detail) {
    normalized.non_field_errors = [JSON.stringify(errorData.detail)];
  }
  
  return normalized;
}

export const AttendanceMarkPage = () => {
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch active classes
  const { data: classesData, isLoading: classesLoading } = useClasses({ is_active: true });

  // Fetch enrollments when class is selected
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useEnrollments(
    selectedClassId
      ? {
          class_obj: parseInt(selectedClassId),
          status: 'ENROLLED',
        }
      : undefined
  );

  // Mark attendance mutation
  const markAttendance = useMarkAttendance();

  // Initialize student records when enrollments are loaded
  useEffect(() => {
    if (enrollmentsData?.results) {
      const records: StudentAttendanceRecord[] = enrollmentsData.results.map((enrollment) => ({
        student_id: enrollment.student,
        student_name: enrollment.student_detail?.full_name || `Student #${enrollment.student}`,
        status: 'PRESENT' as const,
        notes: '',
        selected: true, // Default to selected
      }));
      setStudentRecords(records);
    } else {
      setStudentRecords([]);
    }
  }, [enrollmentsData]);

  // Handle class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setStudentRecords([]);
  };

  // Handle student selection toggle
  const toggleStudentSelection = (studentId: number) => {
    setStudentRecords((prev) =>
      prev.map((record) =>
        record.student_id === studentId
          ? { ...record, selected: !record.selected }
          : record
      )
    );
  };

  // Handle status change for a student
  const handleStatusChange = (studentId: number, status: 'PRESENT' | 'ABSENT') => {
    setStudentRecords((prev) =>
      prev.map((record) =>
        record.student_id === studentId ? { ...record, status } : record
      )
    );
  };

  // Handle notes change for a student
  const handleNotesChange = (studentId: number, notes: string) => {
    setStudentRecords((prev) =>
      prev.map((record) =>
        record.student_id === studentId ? { ...record, notes } : record
      )
    );
  };

  // Select all students
  const selectAll = () => {
    setStudentRecords((prev) => prev.map((record) => ({ ...record, selected: true })));
  };

  // Deselect all students
  const deselectAll = () => {
    setStudentRecords((prev) => prev.map((record) => ({ ...record, selected: false })));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitSuccess(false);

    // Validation
    if (!selectedClassId) {
      setFormErrors({ class_id: ['Please select a class'] });
      return;
    }

    if (!selectedDate) {
      setFormErrors({ date: ['Please select a date'] });
      return;
    }

    const selectedRecords = studentRecords.filter((record) => record.selected);
    if (selectedRecords.length === 0) {
      setFormErrors({
        attendance_records: ['Please select at least one student'],
      });
      return;
    }

    // Prepare request
    const request: MarkAttendanceRequest = {
      class_id: parseInt(selectedClassId),
      date: selectedDate,
      attendance_records: selectedRecords.map((record) => ({
        student_id: record.student_id,
        status: record.status,
        notes: record.notes || undefined,
      })),
    };

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:200',message:'Submitting mark attendance request',data:{request,selectedRecordsCount:selectedRecords.length,studentIds:selectedRecords.map(r=>r.student_id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    try {
      await markAttendance.mutateAsync(request);
      setSubmitSuccess(true);
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard/attendance');
      }, 2000);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:165',message:'Error caught in handleSubmit',data:{errorType:error?.constructor?.name,hasResponse:!!error?.response,responseData:error?.response?.data,responseDataStringified:JSON.stringify(error?.response?.data || {}),errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (error.response?.data) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:167',message:'Setting formErrors from response.data',data:{responseDataType:typeof error.response.data,isArray:Array.isArray(error.response.data),keys:Object.keys(error.response.data || {}),responseDataValue:error.response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const normalizedErrors = normalizeErrorResponse(error.response.data);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:170',message:'Normalized errors',data:{normalizedErrors,normalizedKeys:Object.keys(normalizedErrors)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        setFormErrors(normalizedErrors);
      } else {
        setFormErrors({
          non_field_errors: [error.message || 'Failed to mark attendance'],
        });
      }
    }
  };

  const selectedCount = studentRecords.filter((r) => r.selected).length;
  const totalCount = studentRecords.length;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/attendance')}>
          ← Back to Attendance
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
          <CardDescription>Record attendance for a class or session</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {formErrors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {formErrors.non_field_errors.map((err, idx) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:199',message:'Rendering non_field_errors',data:{errType:typeof err,errIsArray:Array.isArray(err),errValue:err,errStringified:JSON.stringify(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                    // #endregion
                    return <div key={idx}>{err}</div>;
                  })}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {submitSuccess && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Attendance marked successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            {/* Class and Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class-select">
                  Class <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedClassId}
                  onValueChange={handleClassChange}
                  disabled={classesLoading || markAttendance.isPending}
                >
                  <SelectTrigger id="class-select">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classesData?.results.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id.toString()}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.class_id && (
                  <p className="text-sm text-destructive">
                    {(() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:239',message:'Rendering class_id error',data:{classIdErrorType:typeof formErrors.class_id,classIdErrorIsArray:Array.isArray(formErrors.class_id),classIdErrorValue:formErrors.class_id,classIdError0Type:typeof formErrors.class_id?.[0],classIdError0Value:formErrors.class_id?.[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                      // #endregion
                      return formErrors.class_id[0];
                    })()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-select">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={markAttendance.isPending}
                  required
                />
                {formErrors.date && (
                  <p className="text-sm text-destructive">
                    {(() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:256',message:'Rendering date error',data:{dateErrorType:typeof formErrors.date,dateErrorIsArray:Array.isArray(formErrors.date),dateErrorValue:formErrors.date,dateError0Type:typeof formErrors.date?.[0],dateError0Value:formErrors.date?.[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                      // #endregion
                      return formErrors.date[0];
                    })()}
                  </p>
                )}
              </div>
            </div>

            {/* Roster Checklist */}
            {selectedClassId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Student Roster</h3>
                    <p className="text-sm text-muted-foreground">
                      {enrollmentsLoading
                        ? 'Loading students...'
                        : `${selectedCount} of ${totalCount} students selected`}
                    </p>
                  </div>
                  {totalCount > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAll}
                        disabled={enrollmentsLoading || markAttendance.isPending}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAll}
                        disabled={enrollmentsLoading || markAttendance.isPending}
                      >
                        Deselect All
                      </Button>
                    </div>
                  )}
                </div>

                {enrollmentsLoading ? (
                  <LoadingState message="Loading enrolled students..." />
                ) : studentRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No enrolled students found for this class.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <div className="divide-y">
                      {studentRecords.map((record) => (
                        <div
                          key={record.student_id}
                          className="p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={record.selected}
                                onChange={() =>
                                  toggleStudentSelection(record.student_id)
                                }
                                disabled={markAttendance.isPending}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor={`student-${record.student_id}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {record.student_name}
                                </Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={record.status === 'PRESENT' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() =>
                                      handleStatusChange(record.student_id, 'PRESENT')
                                    }
                                    disabled={!record.selected || markAttendance.isPending}
                                  >
                                    Present
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={record.status === 'ABSENT' ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() =>
                                      handleStatusChange(record.student_id, 'ABSENT')
                                    }
                                    disabled={!record.selected || markAttendance.isPending}
                                  >
                                    Absent
                                  </Button>
                                </div>
                              </div>
                              {record.selected && (
                                <div>
                                  <Label
                                    htmlFor={`notes-${record.student_id}`}
                                    className="text-sm text-muted-foreground"
                                  >
                                    Notes (optional)
                                  </Label>
                                  <Textarea
                                    id={`notes-${record.student_id}`}
                                    placeholder="Add notes for this student..."
                                    value={record.notes}
                                    onChange={(e) =>
                                      handleNotesChange(record.student_id, e.target.value)
                                    }
                                    disabled={markAttendance.isPending}
                                    className="mt-1"
                                    rows={2}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            {formErrors.attendance_records && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {(() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AttendanceMarkPage.tsx:392',message:'Rendering attendance_records error',data:{attendanceRecordsErrorType:typeof formErrors.attendance_records,attendanceRecordsErrorIsArray:Array.isArray(formErrors.attendance_records),attendanceRecordsErrorValue:formErrors.attendance_records,attendanceRecordsError0Type:typeof formErrors.attendance_records?.[0],attendanceRecordsError0Value:formErrors.attendance_records?.[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
                    // #endregion
                    return (
                      <ul className="list-disc list-inside space-y-1">
                        {formErrors.attendance_records.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    );
                  })()}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/attendance')}
                disabled={markAttendance.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !selectedClassId ||
                  !selectedDate ||
                  selectedCount === 0 ||
                  markAttendance.isPending ||
                  enrollmentsLoading
                }
              >
                {markAttendance.isPending ? 'Marking...' : 'Mark Attendance'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
