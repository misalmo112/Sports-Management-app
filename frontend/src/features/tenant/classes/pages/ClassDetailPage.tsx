/**
 * Class Detail Page
 * View class details
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Edit, Trash2, Users, Calendar, User, Users2 } from 'lucide-react';
import { useClass, useDeleteClass } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';

export const ClassDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { formatDateTime } = useAcademyFormat();

  const { data: classData, isLoading, error, refetch } = useClass(id);
  const deleteClass = useDeleteClass();

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (id) {
      try {
        await deleteClass.mutateAsync(id);
        setDeleteDialogOpen(false);
        navigate('/dashboard/classes');
      } catch (error) {
        // Error handling is done by the mutation
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading class details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load class"
          fullPage
        />
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/classes')}>
          ← Back to Classes
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/classes/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/classes/${id}/enrollments`)}
          >
            <Users className="mr-2 h-4 w-4" />
            Manage Enrollments
          </Button>
          <Button variant="destructive" onClick={handleDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{classData.name}</CardTitle>
                <CardDescription className="mt-2">
                  {classData.description || 'No description provided'}
                </CardDescription>
              </div>
              <div>
                {classData.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    Coach
                  </div>
                  <p className="font-medium">
                    {classData.coach_detail?.full_name || 'No coach assigned'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users2 className="h-4 w-4" />
                    Capacity
                  </div>
                  <p className="font-medium">
                    {classData.current_enrollment} / {classData.max_capacity} students
                    {classData.is_full && (
                      <Badge variant="destructive" className="ml-2">
                        Full
                      </Badge>
                    )}
                    {classData.available_spots > 0 && (
                      <span className="text-muted-foreground ml-2">
                        ({classData.available_spots} spots available)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </div>
                  <p className="font-medium">{formatDateTime(classData.start_date)}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </div>
                  <p className="font-medium">{formatDateTime(classData.end_date)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {classData.schedule && Object.keys(classData.schedule).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                {JSON.stringify(classData.schedule, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Class"
        itemName={classData.name}
        isLoading={deleteClass.isPending}
      />
    </div>
  );
};
