/**
 * Locations Settings Page
 * Manage academy locations
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
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
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { DeleteConfirmationDialog } from '@/features/tenant/classes/components/DeleteConfirmationDialog';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import type {
  Location,
  CreateLocationRequest,
  UpdateLocationRequest,
} from '../types';

export const LocationsPage = () => {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<CreateLocationRequest>({
    name: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    capacity: undefined,
  });
  const [editFormData, setEditFormData] = useState<UpdateLocationRequest>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [editClientErrors, setEditClientErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useLocations({
    search: search || undefined,
    page_size: 100,
  });

  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (formData.capacity !== undefined && formData.capacity !== null && formData.capacity <= 0) {
      newErrors.capacity = 'Capacity must be a positive number';
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
      const submitData: CreateLocationRequest = {
        name: formData.name.trim(),
      };

      if (formData.address_line1?.trim()) submitData.address_line1 = formData.address_line1.trim();
      if (formData.city?.trim()) submitData.city = formData.city.trim();
      if (formData.state?.trim()) submitData.state = formData.state.trim();
      if (formData.postal_code?.trim()) submitData.postal_code = formData.postal_code.trim();
      if (formData.country?.trim()) submitData.country = formData.country.trim();
      if (formData.phone?.trim()) submitData.phone = formData.phone.trim();
      if (formData.capacity !== undefined && formData.capacity !== null) {
        submitData.capacity = formData.capacity;
      }

      await createLocation.mutateAsync(submitData);

      setFormData({
        name: '',
        address_line1: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        phone: '',
        capacity: undefined,
      });
      setErrors({});
      setClientErrors({});
      setIsCreateModalOpen(false);
      setSuccessMessage('Location created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create location'],
        });
      }
    }
  };

  const handleEditClick = (location: Location) => {
    setSelectedLocation(location);
    setEditFormData({
      name: location.name,
      address_line1: location.address_line1 || '',
      city: location.city || '',
      state: location.state || '',
      postal_code: location.postal_code || '',
      country: location.country || '',
      phone: location.phone || '',
      capacity: location.capacity || undefined,
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

    if (editFormData.capacity !== undefined && editFormData.capacity !== null && editFormData.capacity <= 0) {
      newErrors.capacity = 'Capacity must be a positive number';
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

    if (!selectedLocation) return;

    try {
      const submitData: UpdateLocationRequest = {};

      if (editFormData.name !== undefined) {
        submitData.name = editFormData.name.trim();
      }
      if (editFormData.address_line1 !== undefined) {
        submitData.address_line1 = editFormData.address_line1.trim() || undefined;
      }
      if (editFormData.city !== undefined) {
        submitData.city = editFormData.city.trim() || undefined;
      }
      if (editFormData.state !== undefined) {
        submitData.state = editFormData.state.trim() || undefined;
      }
      if (editFormData.postal_code !== undefined) {
        submitData.postal_code = editFormData.postal_code.trim() || undefined;
      }
      if (editFormData.country !== undefined) {
        submitData.country = editFormData.country.trim() || undefined;
      }
      if (editFormData.phone !== undefined) {
        submitData.phone = editFormData.phone.trim() || undefined;
      }
      if (editFormData.capacity !== undefined) {
        submitData.capacity = editFormData.capacity || undefined;
      }

      await updateLocation.mutateAsync({ id: selectedLocation.id, data: submitData });

      setEditErrors({});
      setEditClientErrors({});
      setIsEditModalOpen(false);
      setSelectedLocation(null);
      setEditFormData({});
      setSuccessMessage('Location updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update location'],
        });
      }
    }
  };

  const handleDeleteClick = (location: Location) => {
    setSelectedLocation(location);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLocation) return;

    try {
      await deleteLocation.mutateAsync(selectedLocation.id);
      setIsDeleteDialogOpen(false);
      setSelectedLocation(null);
      setSuccessMessage('Location deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to delete location'],
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground mt-2">Manage academy locations</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Location
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load locations"
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
          <CardTitle>Locations</CardTitle>
          <CardDescription>All locations in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading locations..." />
          ) : data?.results && data.results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.city || '—'}</TableCell>
                      <TableCell>{location.state || '—'}</TableCell>
                      <TableCell>{location.country || '—'}</TableCell>
                      <TableCell>{location.capacity || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(location)}
                            disabled={updateLocation.isPending || deleteLocation.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(location)}
                            disabled={updateLocation.isPending || deleteLocation.isPending}
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
              title="No locations found"
              description="Get started by creating your first location."
              actionLabel="Create Location"
              onAction={() => setIsCreateModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Location Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Location</DialogTitle>
            <DialogDescription>
              Add a new location for your academy.
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
                  disabled={createLocation.isPending}
                />
                {(errors.name || clientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {errors.name?.[0] || clientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1 || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, address_line1: e.target.value }));
                    if (errors.address_line1) setErrors((prev) => clearFieldError(prev, 'address_line1'));
                  }}
                  disabled={createLocation.isPending}
                />
                {errors.address_line1 && (
                  <p className="text-sm text-destructive">{errors.address_line1[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, city: e.target.value }));
                      if (errors.city) setErrors((prev) => clearFieldError(prev, 'city'));
                    }}
                    disabled={createLocation.isPending}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, state: e.target.value }));
                      if (errors.state) setErrors((prev) => clearFieldError(prev, 'state'));
                    }}
                    disabled={createLocation.isPending}
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive">{errors.state[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, postal_code: e.target.value }));
                      if (errors.postal_code) setErrors((prev) => clearFieldError(prev, 'postal_code'));
                    }}
                    disabled={createLocation.isPending}
                  />
                  {errors.postal_code && (
                    <p className="text-sm text-destructive">{errors.postal_code[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, country: e.target.value }));
                      if (errors.country) setErrors((prev) => clearFieldError(prev, 'country'));
                    }}
                    disabled={createLocation.isPending}
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, phone: e.target.value }));
                      if (errors.phone) setErrors((prev) => clearFieldError(prev, 'phone'));
                    }}
                    disabled={createLocation.isPending}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="0"
                    value={formData.capacity || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                      setFormData((prev) => ({ ...prev, capacity: isNaN(value as number) ? undefined : value }));
                      if (errors.capacity) setErrors((prev) => clearFieldError(prev, 'capacity'));
                      if (clientErrors.capacity) setClientErrors((prev) => ({ ...prev, capacity: '' }));
                    }}
                    disabled={createLocation.isPending}
                  />
                  {(errors.capacity || clientErrors.capacity) && (
                    <p className="text-sm text-destructive">
                      {errors.capacity?.[0] || clientErrors.capacity}
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
                disabled={createLocation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLocation.isPending}>
                {createLocation.isPending ? 'Creating...' : 'Create Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Location Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location information.
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
                  disabled={updateLocation.isPending}
                />
                {(editErrors.name || editClientErrors.name) && (
                  <p className="text-sm text-destructive">
                    {editErrors.name?.[0] || editClientErrors.name}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-address_line1">Address Line 1</Label>
                <Input
                  id="edit-address_line1"
                  value={editFormData.address_line1 || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, address_line1: e.target.value }));
                    if (editErrors.address_line1) setEditErrors((prev) => clearFieldError(prev, 'address_line1'));
                  }}
                  disabled={updateLocation.isPending}
                />
                {editErrors.address_line1 && (
                  <p className="text-sm text-destructive">{editErrors.address_line1[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editFormData.city || ''}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, city: e.target.value }));
                      if (editErrors.city) setEditErrors((prev) => clearFieldError(prev, 'city'));
                    }}
                    disabled={updateLocation.isPending}
                  />
                  {editErrors.city && (
                    <p className="text-sm text-destructive">{editErrors.city[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-state">State/Province</Label>
                  <Input
                    id="edit-state"
                    value={editFormData.state || ''}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, state: e.target.value }));
                      if (editErrors.state) setEditErrors((prev) => clearFieldError(prev, 'state'));
                    }}
                    disabled={updateLocation.isPending}
                  />
                  {editErrors.state && (
                    <p className="text-sm text-destructive">{editErrors.state[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-postal_code">Postal Code</Label>
                  <Input
                    id="edit-postal_code"
                    value={editFormData.postal_code || ''}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, postal_code: e.target.value }));
                      if (editErrors.postal_code) setEditErrors((prev) => clearFieldError(prev, 'postal_code'));
                    }}
                    disabled={updateLocation.isPending}
                  />
                  {editErrors.postal_code && (
                    <p className="text-sm text-destructive">{editErrors.postal_code[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-country">Country</Label>
                  <Input
                    id="edit-country"
                    value={editFormData.country || ''}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, country: e.target.value }));
                      if (editErrors.country) setEditErrors((prev) => clearFieldError(prev, 'country'));
                    }}
                    disabled={updateLocation.isPending}
                  />
                  {editErrors.country && (
                    <p className="text-sm text-destructive">{editErrors.country[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editFormData.phone || ''}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, phone: e.target.value }));
                      if (editErrors.phone) setEditErrors((prev) => clearFieldError(prev, 'phone'));
                    }}
                    disabled={updateLocation.isPending}
                  />
                  {editErrors.phone && (
                    <p className="text-sm text-destructive">{editErrors.phone[0]}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    min="0"
                    value={editFormData.capacity || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                      setEditFormData((prev) => ({ ...prev, capacity: isNaN(value as number) ? undefined : value }));
                      if (editErrors.capacity) setEditErrors((prev) => clearFieldError(prev, 'capacity'));
                      if (editClientErrors.capacity) setEditClientErrors((prev) => ({ ...prev, capacity: '' }));
                    }}
                    disabled={updateLocation.isPending}
                  />
                  {(editErrors.capacity || editClientErrors.capacity) && (
                    <p className="text-sm text-destructive">
                      {editErrors.capacity?.[0] || editClientErrors.capacity}
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
                disabled={updateLocation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateLocation.isPending}>
                {updateLocation.isPending ? 'Updating...' : 'Update Location'}
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
        title="Delete Location"
        itemName={selectedLocation?.name}
        isLoading={deleteLocation.isPending}
      />
    </div>
  );
};
