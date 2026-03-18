/**
 * Coach Attendance Mark Page (Staff)
 * Record staff (coach) attendance for multiple coaches by date and class.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMarkCoachAttendance } from '../hooks/hooks';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { useCoaches } from '@/features/tenant/coaches/hooks/hooks';
import { useCoachAttendance } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { formatErrorMessage } from '@/shared/utils/errorUtils';

const today = new Date().toISOString().slice(0, 10);

type RowStatus = '' | 'PRESENT' | 'ABSENT' | 'LATE';

interface CoachRow {
  coach_id: number;
  coach_name: string;
  status: RowStatus;
  notes: string;
}

export const CoachAttendanceMarkStaffPage = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState<string>('');
  const [rows, setRows] = useState<CoachRow[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);

  const { data: classesData, isLoading: classesLoading, error: classesError } = useClasses({
    is_active: true,
  });
  const { data: coachesData, isLoading: coachesLoading, error: coachesError } = useCoaches({
    is_active: true,
  });
  const { data: existingData } = useCoachAttendance({
    date: date && classId ? date : undefined,
    class_obj: classId ? parseInt(classId, 10) : undefined,
    page_size: 500,
  });
  const markMutation = useMarkCoachAttendance();

  const classes = classesData?.results ?? [];
  const coaches = coachesData?.results ?? [];

  const isLoading = classesLoading || coachesLoading;
  const error = classesError || coachesError;

  // Build rows from coaches; when we have existing attendance for this date+class, merge it in
  useEffect(() => {
    if (coaches.length === 0) {
      setRows([]);
      return;
    }
    const existing = existingData?.results ?? [];
    setRows(
      coaches.map((c) => {
        const ex = existing.find((r) => r.coach === c.id);
        return {
          coach_id: c.id,
          coach_name: c.full_name,
          status: (ex?.status as RowStatus) ?? '',
          notes: ex?.notes ?? '',
        };
      })
    );
  }, [coaches, existingData?.results]);

  const handleRowStatusChange = (coachId: number, status: RowStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.coach_id === coachId ? { ...r, status } : r))
    );
  };

  const handleRowNotesChange = (coachId: number, notes: string) => {
    setRows((prev) =>
      prev.map((r) => (r.coach_id === coachId ? { ...r, notes } : r))
    );
  };

  const rowsToSave = rows.filter((r) => r.status !== '');
  const canSave = date && classId && rowsToSave.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setSaveError(null);
    const cId = parseInt(classId, 10);
    if (!cId || !date || rowsToSave.length === 0) return;

    setSavingProgress({ current: 0, total: rowsToSave.length });
    const failed: string[] = [];
    let succeeded = 0;

    for (let i = 0; i < rowsToSave.length; i++) {
      setSavingProgress({ current: i + 1, total: rowsToSave.length });
      const row = rowsToSave[i];
      try {
        await markMutation.mutateAsync({
          class_id: cId,
          coach_id: row.coach_id,
          date,
          status: row.status as 'PRESENT' | 'ABSENT' | 'LATE',
          notes: row.notes.trim() || undefined,
        });
        succeeded += 1;
      } catch (err) {
        failed.push(`${row.coach_name}: ${formatErrorMessage(err)}`);
      }
    }

    setSavingProgress(null);
    if (failed.length === 0) {
      setSuccessMessage(
        succeeded === 1
          ? 'Coach attendance recorded.'
          : `Recorded attendance for ${succeeded} coach(es).`
      );
    } else {
      setSaveError(
        succeeded > 0
          ? `Saved ${succeeded}, failed ${failed.length}: ${failed.join('; ')}`
          : failed.join('; ')
      );
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error as Error}
          onRetry={() => window.location.reload()}
          title="Failed to load classes or coaches"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Mark coach attendance</h1>
          <p className="text-muted-foreground mt-1">
            Record staff attendance for a date and class. Set status for each coach and save.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading classes and coaches..." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Record attendance by date</CardTitle>
            <CardDescription>
              Select date and class, then set each coach&apos;s status. Only rows with a status are saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {successMessage && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              {saveError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={classId} onValueChange={setClassId} required>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {date && classId && (
                <>
                  <div className="space-y-2">
                    <Label>Coaches</Label>
                    <p className="text-sm text-muted-foreground">
                      Set status for each coach. Rows with a status will be saved when you click Save.
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Coach</TableHead>
                            <TableHead className="w-[180px]">Status</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow key={row.coach_id}>
                              <TableCell className="font-medium">
                                {row.coach_name}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={row.status || '__none__'}
                                  onValueChange={(v) =>
                                    handleRowStatusChange(
                                      row.coach_id,
                                      v === '__none__' ? '' : (v as RowStatus)
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Not set" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Not set</SelectItem>
                                    <SelectItem value="PRESENT">Present</SelectItem>
                                    <SelectItem value="ABSENT">Absent</SelectItem>
                                    <SelectItem value="LATE">Late</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.notes}
                                  onChange={(e) =>
                                    handleRowNotesChange(row.coach_id, e.target.value)
                                  }
                                  placeholder="Optional notes"
                                  className="max-w-[200px]"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {savingProgress && (
                    <p className="text-sm text-muted-foreground">
                      Saving… {savingProgress.current} of {savingProgress.total}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={
                        !canSave || savingProgress !== null || markMutation.isPending
                      }
                    >
                      {savingProgress !== null
                        ? 'Saving…'
                        : rowsToSave.length === 0
                          ? 'Save attendance'
                          : `Save attendance (${rowsToSave.length} coach${rowsToSave.length === 1 ? '' : 'es'})`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/dashboard/management/staff')}
                    >
                      Back to Staff
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/dashboard/attendance')}
                    >
                      Back to Attendance
                    </Button>
                  </div>
                </>
              )}

              {(!date || !classId) && (
                <p className="text-sm text-muted-foreground">
                  Select date and class to see the coach list.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
