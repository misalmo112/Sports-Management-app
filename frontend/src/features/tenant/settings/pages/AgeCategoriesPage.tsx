/**
 * Age Categories Settings Page
 * Manage academy age categories
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
  useAgeCategories,
  useCreateAgeCategory,
  useUpdateAgeCategory,
  useDeleteAgeCategory,
} from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { DeleteConfirmationDialog } from '@/features/tenant/classes/components/DeleteConfirmationDialog';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import type {
  AgeCategory,
  CreateAgeCategoryRequest,
  UpdateAgeCategoryRequest,
} from '../types';

export const AgeCategoriesPage = () => {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgeCategory, setSelectedAgeCategory] = useState<AgeCategory | null>(null);
  const [formData, setFormData] = useState<CreateAgeCategoryRequest>({
    name: '',
    age_min: 0,
    age_max: 0,
    description: '',
  });
  const [editFormData, setEditFormData] = useState<UpdateAgeCategoryRequest>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [editClientErrors, setEditClientErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useAgeCategories({
    search: search || undefined,
    page_size: 100,
  });

  const createAgeCategory = useCreateAgeCategory();
  const updateAgeCategory = useUpdateAgeCategory();
  const deleteAgeCategory = useDeleteAgeCategory();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (formData.age_min === undefined || formData.age_min === null) {
      newErrors.age_min = 'Minimum age is required';
    } else if (formData.age_min < 0) {
      newErrors.age_min = 'Minimum age must be 0 or greater';
    }

    if (formData.age_max === undefined || formData.age_max === null) {
      newErrors.age_max = 'Maximum age is required';
    } else if (formData.age_max <= formData.age_min) {
      newErrors.age_max = 'Maximum age must be greater than minimum age';
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
      const submitData: CreateAgeCategoryRequest = {
        name: formData.name.trim(),
        age_min: formData.age_min,
        age_max: formData.age_max,
      };

      if (formData.description?.trim()) submitData.description = formData.description.trim();

      await createAgeCategory.mutateAsync(submitData);

      setFormData({
        name: '',
        age_min: 0,
        age_max: 0,
        description: '',
      });
      setErrors({});
      setClientErrors({});
      setIsCreateModalOpen(false);
      setSuccessMessage('Age category created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create age category'],
        });
      }
    }
  };

  const handleEditClick = (ageCategory: AgeCategory) => {
    setSelectedAgeCategory(ageCategory);
    setEditFormData({
      name: ageCategory.name,
      age_min: ageCategory.age_min,
      age_max: ageCategory.age_max,
      description: ageCategory.description || '',
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

    const ageMin = editFormData.age_min !== undefined ? editFormData.age_min : selectedAgeCategory?.age_min;
    const ageMax = editFormData.age_max !== undefined ? editFormData.age_max : selectedAgeCategory?.age_max;

    if (ageMin !== undefined && ageMax !== undefined && ageMax <= ageMin) {
      newErrors.age_max = 'Maximum age must be greater than minimum age';
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

    if (!selectedAgeCategory) return;

    try {
      const submitData: UpdateAgeCategoryRequest = {};

      if (editFormData.name !== undefined) {
        submitData.name = editFormData.name.trim();
      }
      if (editFormData.age_min !== undefined) {
        submitData.age_min = editFormData.age_min;
      }
      if (editFormData.age_max !== undefined) {
        submitData.age_max = editFormData.age_max;
      }
      if (editFormData.description !== undefined) {
        submitData.description = editFormData.description.trim() || undefined;
      }

      await updateAgeCategory.mutateAsync({ id: selectedAgeCategory.id, data: submitData });

      setEditErrors({});
      setEditClientErrors({});
      setIsEditModalOpen(false);
      setSelectedAgeCategory(null);
      setEditFormData({});
      setSuccessMessage('Age category updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update age category'],
        });
      }
    }
  };

  const handleDeleteClick = (ageCategory: AgeCategory) => {
    setSelectedAgeCategory(ageCategory);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAgeCategory) return;

    try {
      await deleteAgeCategory.mutateAsync(selectedAgeCategory.id);
      setIsDeleteDialogOpen(false);
      setSelectedAgeCategory(null);
      setSuccessMessage('Age category deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to delete age category'],
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Age Categories</h1>
          <p className="text-muted-foreground mt-2">Manage academy age categories</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Age Category
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load age categories"
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
          <CardTitle>Age Categories</CardTitle>
          <CardDescription>All age categories in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search age categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading age categories..." />
          ) : data?.results && data.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age Range</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((ageCategory) => (
                    <TableRow key={ageCategory.id}>
                      <TableCell className="font-medium">{ageCategory.name}</TableCell>
                      <TableCell>{ageCategory.age_min}-{ageCategory.age_max}</TableCell>
                      <TableCell>{ageCategory.description || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(ageCategory)}
                            disabled={updateAgeCategory.isPending || deleteAgeCategory.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(ageCategory)}
                            disabled={updateAgeCategory.isPending || deleteAgeCategory.isPending}
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
              title="No age categories found"
              description="Get started by creating your first age category."
              actionLabel="Create Age Category"
              onAction={() => setIsCreateModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Age Category Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Age Category</DialogTitle>
            <DialogDescription>
              Add a new age category for your academy.
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
                  disabled={createAgeCategory.isPending}
                />
                {(errors.name || clientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {errors.name?.[0] || clientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="age_min">
                    Minimum Age <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="age_min"
                    type="number"
                    min="0"
                    value={formData.age_min}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData((prev) => ({ ...prev, age_min: value }));
                      if (errors.age_min) setErrors((prev) => clearFieldError(prev, 'age_min'));
                      if (clientErrors.age_min) setClientErrors((prev) => ({ ...prev, age_min: '' }));
                      if (clientErrors.age_max) setClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    required
                    disabled={createAgeCategory.isPending}
                  />
                  {(errors.age_min || clientErrors.age_min) && (
                    <p className="text-sm text-destructive">
                      {errors.age_min?.[0] || clientErrors.age_min}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="age_max">
                    Maximum Age <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="age_max"
                    type="number"
                    min="0"
                    value={formData.age_max}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData((prev) => ({ ...prev, age_max: value }));
                      if (errors.age_max) setErrors((prev) => clearFieldError(prev, 'age_max'));
                      if (clientErrors.age_max) setClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    required
                    disabled={createAgeCategory.isPending}
                  />
                  {(errors.age_max || clientErrors.age_max) && (
                    <p className="text-sm text-destructive">
                      {errors.age_max?.[0] || clientErrors.age_max}
                    </p>
                  )}
                </div>
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
                  disabled={createAgeCategory.isPending}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description[0]}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createAgeCategory.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAgeCategory.isPending}>
                {createAgeCategory.isPending ? 'Creating...' : 'Create Age Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Age Category Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Age Category</DialogTitle>
            <DialogDescription>
              Update age category information.
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
                  value={editFormData.name !== undefined ? editFormData.name : selectedAgeCategory?.name || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (editErrors.name) setEditErrors((prev) => clearFieldError(prev, 'name'));
                    if (editClientErrors.name) setEditClientErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  required
                  disabled={updateAgeCategory.isPending}
                />
                {(editErrors.name || editClientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {editErrors.name?.[0] || editClientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-age_min">
                    Minimum Age <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-age_min"
                    type="number"
                    min="0"
                    value={editFormData.age_min !== undefined ? editFormData.age_min : selectedAgeCategory?.age_min || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setEditFormData((prev) => ({ ...prev, age_min: value }));
                      if (editErrors.age_min) setEditErrors((prev) => clearFieldError(prev, 'age_min'));
                      if (editClientErrors.age_min) setEditClientErrors((prev) => ({ ...prev, age_min: '' }));
                      if (editClientErrors.age_max) setEditClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    required
                    disabled={updateAgeCategory.isPending}
                  />
                  {(editErrors.age_min || editClientErrors.age_min) && (
                    <p className="text-sm text-destructive">
                      {editErrors.age_min?.[0] || editClientErrors.age_min}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-age_max">
                    Maximum Age <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-age_max"
                    type="number"
                    min="0"
                    value={editFormData.age_max !== undefined ? editFormData.age_max : selectedAgeCategory?.age_max || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setEditFormData((prev) => ({ ...prev, age_max: value }));
                      if (editErrors.age_max) setEditErrors((prev) => clearFieldError(prev, 'age_max'));
                      if (editClientErrors.age_max) setEditClientErrors((prev) => ({ ...prev, age_max: '' }));
                    }}
                    required
                    disabled={updateAgeCategory.isPending}
                  />
                  {(editErrors.age_max || editClientErrors.age_max) && (
                    <p className="text-sm text-destructive">
                      {editErrors.age_max?.[0] || editClientErrors.age_max}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description !== undefined ? editFormData.description : selectedAgeCategory?.description || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }));
                    if (editErrors.description) setEditErrors((prev) => clearFieldError(prev, 'description'));
                  }}
                  rows={3}
                  disabled={updateAgeCategory.isPending}
                />
                {editErrors.description && (
                  <p className="text-sm text-destructive">{editErrors.description[0]}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateAgeCategory.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateAgeCategory.isPending}>
                {updateAgeCategory.isPending ? 'Updating...' : 'Update Age Category'}
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
        title="Delete Age Category"
        itemName={selectedAgeCategory?.name}
        isLoading={deleteAgeCategory.isPending}
      />
    </div>
  );
};
