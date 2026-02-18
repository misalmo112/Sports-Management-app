/**
 * Terms Settings Page
 * Manage academy terms
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
  useTerms,
  useCreateTerm,
  useUpdateTerm,
  useDeleteTerm,
} from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { DeleteConfirmationDialog } from '@/features/tenant/classes/components/DeleteConfirmationDialog';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type {
  Term,
  CreateTermRequest,
  UpdateTermRequest,
} from '../types';

export const TermsPage = () => {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [formData, setFormData] = useState<CreateTermRequest>({
    name: '',
    start_date: '',
    end_date: '',
    description: '',
  });
  const [editFormData, setEditFormData] = useState<UpdateTermRequest>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [editClientErrors, setEditClientErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { formatDateTime } = useAcademyFormat();

  const { data, isLoading, error, refetch } = useTerms({
    search: search || undefined,
    page_size: 100,
  });

  const createTerm = useCreateTerm();
  const updateTerm = useUpdateTerm();
  const deleteTerm = useDeleteTerm();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        newErrors.end_date = 'End date must be after start date';
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
      const submitData: CreateTermRequest = {
        name: formData.name.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      if (formData.description?.trim()) submitData.description = formData.description.trim();

      await createTerm.mutateAsync(submitData);

      setFormData({
        name: '',
        start_date: '',
        end_date: '',
        description: '',
      });
      setErrors({});
      setClientErrors({});
      setIsCreateModalOpen(false);
      setSuccessMessage('Term created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create term'],
        });
      }
    }
  };

  const handleEditClick = (term: Term) => {
    setSelectedTerm(term);
    setEditFormData({
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
      description: term.description || '',
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

    const startDate = editFormData.start_date !== undefined ? editFormData.start_date : selectedTerm?.start_date;
    const endDate = editFormData.end_date !== undefined ? editFormData.end_date : selectedTerm?.end_date;

    if (startDate && endDate) {
      if (new Date(endDate) <= new Date(startDate)) {
        newErrors.end_date = 'End date must be after start date';
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

    if (!selectedTerm) return;

    try {
      const submitData: UpdateTermRequest = {};

      if (editFormData.name !== undefined) {
        submitData.name = editFormData.name.trim();
      }
      if (editFormData.start_date !== undefined) {
        submitData.start_date = editFormData.start_date;
      }
      if (editFormData.end_date !== undefined) {
        submitData.end_date = editFormData.end_date;
      }
      if (editFormData.description !== undefined) {
        submitData.description = editFormData.description.trim() || undefined;
      }

      await updateTerm.mutateAsync({ id: selectedTerm.id, data: submitData });

      setEditErrors({});
      setEditClientErrors({});
      setIsEditModalOpen(false);
      setSelectedTerm(null);
      setEditFormData({});
      setSuccessMessage('Term updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update term'],
        });
      }
    }
  };

  const handleDeleteClick = (term: Term) => {
    setSelectedTerm(term);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTerm) return;

    try {
      await deleteTerm.mutateAsync(selectedTerm.id);
      setIsDeleteDialogOpen(false);
      setSelectedTerm(null);
      setSuccessMessage('Term deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to delete term'],
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Terms</h1>
          <p className="text-muted-foreground mt-2">Manage academy terms</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Term
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load terms"
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
          <CardTitle>Terms</CardTitle>
          <CardDescription>All terms in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading terms..." />
          ) : data?.results && data.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.name}</TableCell>
                      <TableCell>{formatDateTime(term.start_date)}</TableCell>
                      <TableCell>{formatDateTime(term.end_date)}</TableCell>
                      <TableCell>{term.description || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(term)}
                            disabled={updateTerm.isPending || deleteTerm.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(term)}
                            disabled={updateTerm.isPending || deleteTerm.isPending}
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
              title="No terms found"
              description="Get started by creating your first term."
              actionLabel="Create Term"
              onAction={() => setIsCreateModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Term Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Term</DialogTitle>
            <DialogDescription>
              Add a new term for your academy.
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
                  disabled={createTerm.isPending}
                />
                {(errors.name || clientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {errors.name?.[0] || clientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, start_date: e.target.value }));
                      if (errors.start_date) setErrors((prev) => clearFieldError(prev, 'start_date'));
                      if (clientErrors.start_date) setClientErrors((prev) => ({ ...prev, start_date: '' }));
                      if (clientErrors.end_date) setClientErrors((prev) => ({ ...prev, end_date: '' }));
                    }}
                    required
                    disabled={createTerm.isPending}
                  />
                  {(errors.start_date || clientErrors.start_date) && (
                    <p className="text-sm text-destructive">
                      {errors.start_date?.[0] || clientErrors.start_date}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">
                    End Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, end_date: e.target.value }));
                      if (errors.end_date) setErrors((prev) => clearFieldError(prev, 'end_date'));
                      if (clientErrors.end_date) setClientErrors((prev) => ({ ...prev, end_date: '' }));
                    }}
                    required
                    disabled={createTerm.isPending}
                  />
                  {(errors.end_date || clientErrors.end_date) && (
                    <p className="text-sm text-destructive">
                      {errors.end_date?.[0] || clientErrors.end_date}
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
                  disabled={createTerm.isPending}
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
                disabled={createTerm.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTerm.isPending}>
                {createTerm.isPending ? 'Creating...' : 'Create Term'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Term Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Term</DialogTitle>
            <DialogDescription>
              Update term information.
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
                  value={editFormData.name !== undefined ? editFormData.name : selectedTerm?.name || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (editErrors.name) setEditErrors((prev) => clearFieldError(prev, 'name'));
                    if (editClientErrors.name) setEditClientErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  required
                  disabled={updateTerm.isPending}
                />
                {(editErrors.name || editClientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {editErrors.name?.[0] || editClientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start_date">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-start_date"
                    type="date"
                    value={editFormData.start_date !== undefined ? editFormData.start_date : selectedTerm?.start_date || ''}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, start_date: e.target.value }));
                      if (editErrors.start_date) setEditErrors((prev) => clearFieldError(prev, 'start_date'));
                      if (editClientErrors.start_date) setEditClientErrors((prev) => ({ ...prev, start_date: '' }));
                      if (editClientErrors.end_date) setEditClientErrors((prev) => ({ ...prev, end_date: '' }));
                    }}
                    required
                    disabled={updateTerm.isPending}
                  />
                  {(editErrors.start_date || editClientErrors.start_date) && (
                    <p className="text-sm text-destructive">
                      {editErrors.start_date?.[0] || editClientErrors.start_date}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-end_date">
                    End Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-end_date"
                    type="date"
                    value={editFormData.end_date !== undefined ? editFormData.end_date : selectedTerm?.end_date || ''}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, end_date: e.target.value }));
                      if (editErrors.end_date) setEditErrors((prev) => clearFieldError(prev, 'end_date'));
                      if (editClientErrors.end_date) setEditClientErrors((prev) => ({ ...prev, end_date: '' }));
                    }}
                    required
                    disabled={updateTerm.isPending}
                  />
                  {(editErrors.end_date || editClientErrors.end_date) && (
                    <p className="text-sm text-destructive">
                      {editErrors.end_date?.[0] || editClientErrors.end_date}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description !== undefined ? editFormData.description : selectedTerm?.description || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }));
                    if (editErrors.description) setEditErrors((prev) => clearFieldError(prev, 'description'));
                  }}
                  rows={3}
                  disabled={updateTerm.isPending}
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
                disabled={updateTerm.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTerm.isPending}>
                {updateTerm.isPending ? 'Updating...' : 'Update Term'}
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
        title="Delete Term"
        itemName={selectedTerm?.name}
        isLoading={deleteTerm.isPending}
      />
    </div>
  );
};
