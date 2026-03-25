/**
 * Feedback Page
 * Submit and view feedback (Parent can create, Admin can view/manage)
 */
import { useState, useEffect, useMemo } from 'react';
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
import { AlertCircle, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { useFeedback } from '../hooks/useFeedback';
import { useCreateFeedback } from '../hooks/useCreateFeedback';
import { useUpdateFeedback } from '../hooks/useUpdateFeedback';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { CreateFeedbackRequest, FeedbackStatus, FeedbackPriority } from '../types';
import { useStudents } from '@/features/tenant/students/hooks/hooks';

const STUDENT_NONE = '__none__';

export const FeedbackPage = () => {
  const userRole = getCurrentUserRole();
  const isParent = userRole === 'PARENT';
  const canManageFeedback =
    userRole === 'ADMIN' || userRole === 'OWNER' || userRole === 'STAFF';

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [priorityFilter, setPriorityFilter] = useState<string>('__all__');
  const [selectedFeedback, setSelectedFeedback] = useState<number | null>(null);
  const [updateData, setUpdateData] = useState<{
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    resolution_notes?: string;
  }>({});
  const [updateErrors, setUpdateErrors] = useState<Record<string, string[]>>({});
  const { formatDateTime } = useAcademyFormat();

  const { data, isLoading, error, refetch } = useFeedback({
    status: statusFilter === '__all__' ? undefined : statusFilter,
    priority: priorityFilter === '__all__' ? undefined : priorityFilter,
  });

  const { data: studentsData, isLoading: studentsLoading } = useStudents(
    { is_active: true },
    { enabled: isParent && showCreateForm }
  );

  const [formData, setFormData] = useState<CreateFeedbackRequest>({
    student: null,
    subject: '',
    message: '',
    priority: 'MEDIUM',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const createFeedback = useCreateFeedback();

  const parentStudents = useMemo(
    () => studentsData?.results ?? [],
    [studentsData?.results]
  );

  useEffect(() => {
    if (!isParent || !showCreateForm) return;
    if (parentStudents.length !== 1) return;
    setFormData((prev) =>
      prev.student == null ? { ...prev, student: parentStudents[0].id } : prev
    );
  }, [isParent, showCreateForm, parentStudents]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload: CreateFeedbackRequest = {
      subject: formData.subject,
      message: formData.message,
      priority: formData.priority,
      student: formData.student ?? null,
    };

    try {
      await createFeedback.mutateAsync(payload);
      setFormData({ student: null, subject: '', message: '', priority: 'MEDIUM' });
      setShowCreateForm(false);
    } catch (error: any) {
      if (error.response?.data) {
        setFormErrors(error.response.data);
      } else {
        setFormErrors({
          non_field_errors: [error.message || 'Failed to create feedback'],
        });
      }
    }
  };

  const selectedFeedbackData = data?.results.find((c) => c.id === selectedFeedback);
  const updateFeedback = useUpdateFeedback(selectedFeedback || 0);

  const handleUpdateSubmit = async (_feedbackId: number) => {
    setUpdateErrors({});
    try {
      await updateFeedback.mutateAsync(updateData);
      setSelectedFeedback(null);
      setUpdateData({});
    } catch (error: any) {
      if (error.response?.data) {
        setUpdateErrors(error.response.data);
      } else {
        setUpdateErrors({
          non_field_errors: [error.message || 'Failed to update feedback'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground mt-2">
            {isParent ? 'Submit and view your feedback' : 'Manage feedback'}
          </p>
        </div>
        {isParent && !showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Feedback
          </Button>
        )}
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load feedback"
          className="mb-6"
        />
      )}

      {isParent && showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>Submit new feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {formErrors.non_field_errors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {formErrors.non_field_errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="student">Student</Label>
                {studentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading your children...</p>
                ) : (
                  <Select
                    value={
                      formData.student != null ? String(formData.student) : STUDENT_NONE
                    }
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        student: v === STUDENT_NONE ? null : Number(v),
                      })
                    }
                  >
                    <SelectTrigger id="student">
                      <SelectValue placeholder="Choose a child or general feedback" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={STUDENT_NONE}>
                        General (not about a specific child)
                      </SelectItem>
                      {parentStudents.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.full_name ||
                            [s.first_name, s.last_name].filter(Boolean).join(' ') ||
                            `Student #${s.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Link this feedback to one of your children, or choose general if it applies to the
                  whole family or academy.
                </p>
                {formErrors.student && (
                  <p className="text-sm text-destructive">{formErrors.student[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
                {formErrors.subject && (
                  <p className="text-sm text-destructive">{formErrors.subject[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  required
                />
                {formErrors.message && (
                  <p className="text-sm text-destructive">{formErrors.message[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as FeedbackPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.priority && (
                  <p className="text-sm text-destructive">{formErrors.priority[0]}</p>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormErrors({});
                    setFormData({ student: null, subject: '', message: '', priority: 'MEDIUM' });
                  }}
                  disabled={createFeedback.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createFeedback.isPending}>
                  {createFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {canManageFeedback && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
          <CardDescription>
            {isParent ? 'Your submitted feedback' : 'All feedback'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <>
          {isLoading ? (
            <LoadingState message="Loading feedback..." />
          ) : data?.results && data.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="min-w-[160px] max-w-[280px]">Response</TableHead>
                    {canManageFeedback && <TableHead>Parent</TableHead>}
                    {canManageFeedback && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>{formatDateTime(feedback.created_at)}</TableCell>
                      <TableCell className="font-medium">{feedback.subject}</TableCell>
                      <TableCell>{feedback.student_name || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            feedback.status === 'RESOLVED'
                              ? 'default'
                              : feedback.status === 'IN_PROGRESS'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {feedback.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            feedback.priority === 'URGENT'
                              ? 'destructive'
                              : feedback.priority === 'HIGH'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {feedback.priority_display}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-[280px] align-top text-sm text-muted-foreground"
                        title={feedback.resolution_notes || undefined}
                      >
                        {feedback.resolution_notes ? (
                          <span className="line-clamp-3 whitespace-pre-wrap">
                            {feedback.resolution_notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </TableCell>
                      {canManageFeedback && <TableCell>{feedback.parent_name || feedback.parent_email}</TableCell>}
                      {canManageFeedback && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFeedback(
                                selectedFeedback === feedback.id ? null : feedback.id
                              );
                              if (selectedFeedback !== feedback.id) {
                                setUpdateData({
                                  status: feedback.status,
                                  priority: feedback.priority,
                                  resolution_notes: feedback.resolution_notes || '',
                                });
                              }
                            }}
                          >
                            {selectedFeedback === feedback.id ? 'Hide' : 'Manage'}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No feedback found"
              description={
                isParent
                  ? "You haven't submitted any feedback yet."
                  : 'There are no feedback matching your filters.'
              }
              actionLabel={isParent ? 'Submit Feedback' : undefined}
              onAction={isParent ? () => setShowCreateForm(true) : undefined}
            />
          )}

          {canManageFeedback && selectedFeedbackData ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Manage Feedback</CardTitle>
                <CardDescription>
                  Update status and priority. Your reply below is shown to the parent in their
                  feedback list.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <p className="text-sm">{selectedFeedbackData.subject}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <p className="text-sm whitespace-pre-wrap">{selectedFeedbackData.message}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="update_status">Status</Label>
                      <Select
                        value={updateData.status || selectedFeedbackData.status}
                        onValueChange={(v) => setUpdateData({ ...updateData, status: v as FeedbackStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      {updateErrors.status && (
                        <p className="text-sm text-destructive">{updateErrors.status[0]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="update_priority">Priority</Label>
                      <Select
                        value={updateData.priority || selectedFeedbackData.priority}
                        onValueChange={(v) => setUpdateData({ ...updateData, priority: v as FeedbackPriority })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      {updateErrors.priority && (
                        <p className="text-sm text-destructive">{updateErrors.priority[0]}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resolution_notes">Reply to parent</Label>
                    <Textarea
                      id="resolution_notes"
                      value={updateData.resolution_notes || ''}
                      onChange={(e) => setUpdateData({ ...updateData, resolution_notes: e.target.value })}
                      rows={4}
                      placeholder="e.g. Thank you - we have noted this and will follow up shortly."
                    />
                    {updateErrors.resolution_notes && (
                      <p className="text-sm text-destructive">{updateErrors.resolution_notes[0]}</p>
                    )}
                  </div>
                  {updateErrors.non_field_errors && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {updateErrors.non_field_errors.map((err, idx) => (
                          <div key={idx}>{err}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFeedback(null);
                        setUpdateData({});
                        setUpdateErrors({});
                      }}
                      disabled={updateFeedback.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleUpdateSubmit(selectedFeedbackData.id)}
                      disabled={updateFeedback.isPending}
                    >
                      {updateFeedback.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          </>
        </CardContent>
      </Card>
    </div>
  );
};
