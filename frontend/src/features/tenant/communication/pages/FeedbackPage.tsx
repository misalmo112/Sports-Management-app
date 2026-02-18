/**
 * Feedback Page
 * Submit and view feedback (Parent can create, Admin can view/manage)
 */
import { useState } from 'react';
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

export const FeedbackPage = () => {
  const userRole = getCurrentUserRole();
  const isParent = userRole === 'PARENT';
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

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

  const [formData, setFormData] = useState<CreateFeedbackRequest>({
    student: 0,
    subject: '',
    message: '',
    priority: 'MEDIUM',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const createFeedback = useCreateFeedback();

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      await createFeedback.mutateAsync(formData);
      setFormData({ student: 0, subject: '', message: '', priority: 'MEDIUM' });
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
                <Label htmlFor="student">Student *</Label>
                <Input
                  id="student"
                  type="number"
                  value={formData.student || ''}
                  onChange={(e) => setFormData({ ...formData, student: parseInt(e.target.value) || 0 })}
                  required
                />
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

      {isAdmin && (
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
                    {isAdmin && <TableHead>Parent</TableHead>}
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
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
                      {isAdmin && <TableCell>{feedback.parent_name || feedback.parent_email}</TableCell>}
                      {isAdmin && (
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

          {isAdmin && selectedFeedbackData && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Manage Feedback</CardTitle>
                <CardDescription>Update feedback status and resolution</CardDescription>
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
                    <Label htmlFor="resolution_notes">Resolution Notes</Label>
                    <Textarea
                      id="resolution_notes"
                      value={updateData.resolution_notes || ''}
                      onChange={(e) => setUpdateData({ ...updateData, resolution_notes: e.target.value })}
                      rows={4}
                      placeholder="Add resolution notes..."
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};
