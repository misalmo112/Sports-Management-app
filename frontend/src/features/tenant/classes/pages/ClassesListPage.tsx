/**
 * Classes List Page
 * Lists all classes in the academy
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Plus, Search, Eye, Edit, Trash2, Users, Power } from 'lucide-react';
import { useClasses, useDeleteClass, useUpdateClass } from '../hooks/hooks';
import { useLocations } from '@/features/tenant/settings/hooks/hooks';
import { useSports } from '@/features/tenant/settings/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';

export const ClassesListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [sportFilter, setSportFilter] = useState<number | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<number | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<{ id: number | string; name: string } | null>(null);
  const { formatDateTime } = useAcademyFormat();

  const { data, isLoading, error, refetch } = useClasses({
    search: search || undefined,
    is_active: isActiveFilter,
    sport: sportFilter,
    location: locationFilter,
  });

  const { data: locationsData } = useLocations({ page_size: 100 });
  const { data: sportsData } = useSports({ page_size: 100 });

  const deleteClass = useDeleteClass();
  const updateClass = useUpdateClass();

  const handleToggleActive = async (classItem: { id: number | string; is_active: boolean }) => {
    try {
      await updateClass.mutateAsync({
        id: classItem.id,
        data: { is_active: !classItem.is_active },
      });
    } catch (error) {
      // Error handling is done by the mutation
      console.error('Failed to toggle class status:', error);
    }
  };

  const handleDeleteClick = (classItem: { id: number | string; name: string }) => {
    setClassToDelete(classItem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (classToDelete) {
      try {
        await deleteClass.mutateAsync(classToDelete.id);
        setDeleteDialogOpen(false);
        setClassToDelete(null);
      } catch (error) {
        // Error handling is done by the mutation
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground mt-2">Manage academy classes</p>
        </div>
        <Button onClick={() => navigate('/dashboard/classes/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load classes"
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Classes List</CardTitle>
          <CardDescription>All classes in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search classes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={isActiveFilter === undefined ? 'default' : 'outline'}
                onClick={() => setIsActiveFilter(undefined)}
              >
                All
              </Button>
              <Button
                variant={isActiveFilter === true ? 'default' : 'outline'}
                onClick={() => setIsActiveFilter(true)}
              >
                Active
              </Button>
              <Button
                variant={isActiveFilter === false ? 'default' : 'outline'}
                onClick={() => setIsActiveFilter(false)}
              >
                Inactive
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sport</label>
                <Select
                  value={sportFilter?.toString() || 'all'}
                  onValueChange={(value) => {
                    setSportFilter(value === 'all' ? undefined : parseInt(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sports" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sports</SelectItem>
                    {sportsData?.results.map((sport) => (
                      <SelectItem key={sport.id} value={sport.id.toString()}>
                        {sport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Select
                  value={locationFilter?.toString() || 'all'}
                  onValueChange={(value) => {
                    setLocationFilter(value === 'all' ? undefined : parseInt(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locationsData?.results.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading classes..." />
          ) : data?.results && data.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="font-medium">{classItem.name}</TableCell>
                      <TableCell>{classItem.sport_name || '—'}</TableCell>
                      <TableCell>{classItem.location_name || '—'}</TableCell>
                      <TableCell>
                        {classItem.coach_name || classItem.coach_detail?.full_name || '—'}
                      </TableCell>
                      <TableCell>
                        {classItem.current_enrollment} / {classItem.max_capacity}
                        {classItem.is_full && (
                          <Badge variant="destructive" className="ml-2">
                            Full
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {classItem.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(classItem.start_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/classes/${classItem.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/classes/${classItem.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/classes/${classItem.id}/enrollments`)}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Enrollments
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive({ id: classItem.id, is_active: classItem.is_active })}
                            disabled={updateClass.isPending}
                            title={classItem.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Power className={`h-4 w-4 mr-1 ${classItem.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                            {classItem.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick({ id: classItem.id, name: classItem.name })}
                            disabled={deleteClass.isPending || updateClass.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                            Delete
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
              title="No classes found"
              description="Get started by creating your first class."
              actionLabel="Create Class"
              onAction={() => navigate('/dashboard/classes/new')}
            />
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Class"
        itemName={classToDelete?.name}
        isLoading={deleteClass.isPending}
      />
    </div>
  );
};
