/**
 * Sports Settings Page
 * Manage academy sports
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Plus, Search, Edit, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useSports,
  useCreateSport,
  useUpdateSport,
  useDeleteSport,
} from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { DeleteConfirmationDialog } from '@/features/tenant/classes/components/DeleteConfirmationDialog';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import type {
  Sport,
  CreateSportRequest,
  UpdateSportRequest,
} from '../types';

export const SportsPage = () => {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [formData, setFormData] = useState<CreateSportRequest>({
    name: '',
    description: '',
    age_min: undefined,
    age_max: undefined,
  });
  const [editFormData, setEditFormData] = useState<UpdateSportRequest>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [editClientErrors, setEditClientErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useSports({
    search: search || undefined,
    page_size: 100,
  });

  const createSport = useCreateSport();
  const updateSport = useUpdateSport();
  const deleteSport = useDeleteSport();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (formData.age_min !== undefined && formData.age_max !== undefined) {
      if (formData.age_max <= formData.age_min) {
        newErrors.age_max = 'Maximum age must be greater than minimum age';
      }
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateSportRequest = {
        name: formData.name.trim(),
      };

      if (formData.description?.trim()) submitData.description = formData.description.trim();
      if (formData.age_min !== undefined) submitData.age_min = formData.age_min;
      if (formData.age_max !== undefined) submitData.age_max = formData.age_max;

      await createSport.mutateAsync(submitData);

      setFormData({
        name: '',
        description: '',
        age_min: undefined,
        age_max: undefined,
      });
      setErrors({});
      setClientErrors({});
      setIsCreateModalOpen(false);
      setSuccessMessage('Sport created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create sport'],
        });
      }
    }
  };

  const handleEditClick = (sport: Sport) => {
    setSelectedSport(sport);
    setEditFormData({
      name: sport.name,
      description: sport.description || '',
      age_min: sport.age_min || undefined,
      age_max: sport.age_max || undefined,
    });
    setEditErrors({});
    setEditClientErrors({});
    setIsEditModalOpen(true);
  };

  const validateEditForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (editFormData.name !== undefined) {
      if (!editFormData.name || editFormData.name.trim().length === 0) {
        newErrors.name = 'Name is required';
      } else if (editFormData.name.length > 255) {
        newErrors.name = 'Name must be 255 characters or less';
      }
    }

    if (editFormData.age_min !== undefined && editFormData.age_max !== undefined) {
      if (editFormData.age_max <= editFormData.age_min) {
        newErrors.age_max = 'Maximum age must be greater than minimum age';
      }
    }

    setEditClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors({});

    if (!validateEditForm()) {
      return;
    }

    if (!selectedSport) return;

    try {
      const submitData: UpdateSportRequest = {};

      if (editFormData.name !== undefined) {
        submitData.name = editFormData.name.trim();
      }
      if (editFormData.description !== undefined) {
        submitData.description = editFormData.description.trim() || undefined;
      }
      if (editFormData.age_min !== undefined) {
        submitData.age_min = editFormData.age_min || undefined;
      }
      if (editFormData.age_max !== undefined) {
        submitData.age_max = editFormData.age_max || undefined;
      }

      await updateSport.mutateAsync({ id: selectedSport.id, data: submitData });

      setEditErrors({});
      setEditClientErrors({});
      setIsEditModalOpen(false);
      setSelectedSport(null);
      setEditFormData({});
      setSuccessMessage('Sport updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update sport'],
        });
      }
    }
  };

  const handleDeleteClick = (sport: Sport) => {
    setSelectedSport(sport);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSport) return;

    try {
      await deleteSport.mutateAsync(selectedSport.id);
      setIsDeleteDialogOpen(false);
      setSelectedSport(null);
      setSuccessMessage('Sport deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to delete sport'],
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sports</h1>
          <p className="text-muted-foreground mt-2">Manage academy sports</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sport
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load sports"
          className="mb-6"
        />
      )}

      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sports</CardTitle>
          <CardDescription>All sports in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading sports..." />
          ) : data?.results && data.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Age Range</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((sport) => (
                    <TableRow key={sport.id}>
                      <TableCell className="font-medium">{sport.name}</TableCell>
                      <TableCell>{sport.description || '—'}</TableCell>
                      <TableCell>
                        {sport.age_min !== undefined && sport.age_max !== undefined
                          ? `${sport.age_min}-${sport.age_max}`
                          : sport.age_min !== undefined
                          ? `${sport.age_min}+`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(sport)}
                            disabled={updateSport.isPending || deleteSport.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(sport)}
                            disabled={updateSport.isPending || deleteSport.isPending}
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
              title="No sports found"
              description="Get started by creating your first sport."
              actionLabel="Create Sport"
              onAction={() => setIsCreateModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Sport Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Sport</DialogTitle>
            <DialogDescription>
              Add a new sport for your academy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
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
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors((prev) => clearFieldError(prev, 'name'));
                    if (clientErrors.name) setClientErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  required
                  disabled={createSport.isPending}
                />
                {(errors.name || clientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {errors.name?.[0] || clientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, description: e.target.value }));
                    if (errors.description) setErrors((prev) => clearFieldError(prev, 'description'));
                  }}
                  rows={3}
                  disabled={createSport.isPending}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="age_min">Minimum Age</Label>
                  <Input
                    id="age_min"
                    type="number"
                    min="0"
                    value={formData.age_min || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                      setFormData((prev) => ({ ...prev, age_min: isNaN(value as number) ? undefined : value }));
                      if (errors.age_min) setErrors((prev) => clearFieldError(prev, 'age_min'));
                      if (clientErrors.age_max) setClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    disabled={createSport.isPending}
                  />
                  {errors.age_min && (
                    <p className="text-sm text-destructive">{errors.age_min[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="age_max">Maximum Age</Label>
                  <Input
                    id="age_max"
                    type="number"
                    min="0"
                    value={formData.age_max || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                      setFormData((prev) => ({ ...prev, age_max: isNaN(value as number) ? undefined : value }));
                      if (errors.age_max) setErrors((prev) => clearFieldError(prev, 'age_max'));
                      if (clientErrors.age_max) setClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    disabled={createSport.isPending}
                  />
                  {(errors.age_max || clientErrors.age_max) && (
                    <p className="text-sm text-destructive">
                      {errors.age_max?.[0] || clientErrors.age_max}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createSport.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createSport.isPending}>
                {createSport.isPending ? 'Creating...' : 'Create Sport'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sport Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Sport</DialogTitle>
            <DialogDescription>
              Update sport information.
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
                <Label htmlFor="edit-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={editFormData.name || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (editErrors.name) setEditErrors((prev) => clearFieldError(prev, 'name'));
                    if (editClientErrors.name) setEditClientErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  required
                  disabled={updateSport.isPending}
                />
                {(editErrors.name || editClientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {editErrors.name?.[0] || editClientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }));
                    if (editErrors.description) setEditErrors((prev) => clearFieldError(prev, 'description'));
                  }}
                  rows={3}
                  disabled={updateSport.isPending}
                />
                {editErrors.description && (
                  <p className="text-sm text-destructive">{editErrors.description[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-age_min">Minimum Age</Label>
                  <Input
                    id="edit-age_min"
                    type="number"
                    min="0"
                    value={editFormData.age_min || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                      setEditFormData((prev) => ({ ...prev, age_min: isNaN(value as number) ? undefined : value }));
                      if (editErrors.age_min) setEditErrors((prev) => clearFieldError(prev, 'age_min'));
                      if (editClientErrors.age_max) setEditClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    disabled={updateSport.isPending}
                  />
                  {editErrors.age_min && (
                    <p className="text-sm text-destructive">{editErrors.age_min[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-age_max">Maximum Age</Label>
                  <Input
                    id="edit-age_max"
                    type="number"
                    min="0"
                    value={editFormData.age_max || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                      setEditFormData((prev) => ({ ...prev, age_max: isNaN(value as number) ? undefined : value }));
                      if (editErrors.age_max) setEditErrors((prev) => clearFieldError(prev, 'age_max'));
                      if (editClientErrors.age_max) setEditClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    disabled={updateSport.isPending}
                  />
                  {(editErrors.age_max || editClientErrors.age_max) && (
                    <p className="text-sm text-destructive">
                      {editErrors.age_max?.[0] || editClientErrors.age_max}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateSport.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateSport.isPending}>
                {updateSport.isPending ? 'Updating...' : 'Update Sport'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Sport"
        itemName={selectedSport?.name}
        isLoading={deleteSport.isPending}
      />
    </div>
  );
};
