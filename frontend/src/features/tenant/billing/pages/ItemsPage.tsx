/**
 * Billing Items Page
 * Manage billing items (pricing items)
 */
import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Plus, Search, AlertCircle, ChevronLeft, ChevronRight, Edit, Trash2, CheckCircle2, Power } from 'lucide-react';
import { useBillingItems, useCreateBillingItem, useUpdateBillingItem, useDeleteBillingItem } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { CreateBillingItemRequest, UpdateBillingItemRequest, BillingItem } from '../types';

export const ItemsPage = () => {
  const { formatCurrency, formatDateTime, currency } = useAcademyFormat();
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BillingItem | null>(null);
  const [formData, setFormData] = useState<CreateBillingItemRequest>({
    name: '',
    description: '',
    price: 0,
    currency,
    is_active: true,
  });
  const [editFormData, setEditFormData] = useState<UpdateBillingItemRequest>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [editClientErrors, setEditClientErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pageSize = 20;

  const { data, isLoading, error, refetch } = useBillingItems({
    search: search || undefined,
    is_active: isActiveFilter,
    page,
    page_size: pageSize,
  });

  const createItem = useCreateBillingItem();
  const updateItem = useUpdateBillingItem();
  const deleteItem = useDeleteBillingItem();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (formData.price === undefined || formData.price === null) {
      newErrors.price = 'Price is required';
    } else if (formData.price < 0) {
      newErrors.price = 'Price must be greater than or equal to 0';
    }

    if (formData.currency && formData.currency.length !== 3) {
      newErrors.currency = 'Currency must be a 3-letter code (e.g., USD)';
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
      const submitData: CreateBillingItemRequest = {
        name: formData.name.trim(),
        price: formData.price,
        is_active: formData.is_active ?? true,
      };

      if (formData.description?.trim()) {
        submitData.description = formData.description.trim();
      }
      // Backend enforces academy currency; lock currency to `currency` for safety.
      submitData.currency = currency;

      await createItem.mutateAsync(submitData);

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: 0,
        currency,
        is_active: true,
      });
      setErrors({});
      setClientErrors({});
      setIsCreateModalOpen(false);
      setSuccessMessage('Billing item created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create billing item'],
        });
      }
    }
  };

  const handleEditClick = (item: BillingItem) => {
    setSelectedItem(item);
    setEditFormData({
      name: item.name,
      description: item.description || '',
      price: parseFloat(item.price),
      currency,
      is_active: item.is_active,
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

    if (editFormData.price !== undefined) {
      if (editFormData.price < 0) {
        newErrors.price = 'Price must be greater than or equal to 0';
      }
    }

    if (editFormData.currency && editFormData.currency.length !== 3) {
      newErrors.currency = 'Currency must be a 3-letter code (e.g., USD)';
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

    if (!selectedItem) return;

    try {
      const submitData: UpdateBillingItemRequest = {};
      
      if (editFormData.name !== undefined) {
        submitData.name = editFormData.name.trim();
      }
      if (editFormData.description !== undefined) {
        submitData.description = editFormData.description.trim() || undefined;
      }
      if (editFormData.price !== undefined) {
        submitData.price = editFormData.price;
      }
      // Backend enforces academy currency; lock currency to `currency`.
      submitData.currency = currency;
      if (editFormData.is_active !== undefined) {
        submitData.is_active = editFormData.is_active;
      }

      await updateItem.mutateAsync({ id: selectedItem.id, data: submitData });

      setEditErrors({});
      setEditClientErrors({});
      setIsEditModalOpen(false);
      setSelectedItem(null);
      setEditFormData({});
      setSuccessMessage('Billing item updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update billing item'],
        });
      }
    }
  };

  const handleToggleActive = async (item: BillingItem) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        data: { is_active: !item.is_active },
      });
      setSuccessMessage(`Item ${!item.is_active ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to toggle item status:', error);
    }
  };

  const handleDeleteClick = (item: BillingItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;

    try {
      await deleteItem.mutateAsync(selectedItem.id);
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      setSuccessMessage('Billing item deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to delete billing item'],
      });
    }
  };

  const handleNextPage = () => {
    if (data?.next) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (data?.previous) {
      setPage((prev) => Math.max(1, prev - 1));
    }
  };

  const getTotalPages = () => {
    if (!data?.count) return 0;
    return Math.ceil(data.count / pageSize);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Billing Items</h1>
          <p className="text-muted-foreground mt-2">Manage pricing and billing items</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Item
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load billing items"
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
          <CardTitle>Items</CardTitle>
          <CardDescription>All billing items in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items by name or description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
              onValueChange={(value) => {
                setIsActiveFilter(
                  value === 'all' ? undefined : value === 'active' ? true : false
                );
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingState message="Loading billing items..." />
          ) : data?.results && data.results.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.results.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description || '—'}
                        </TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>{currency}</TableCell>
                        <TableCell>
                          {item.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(item.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(item)}
                              disabled={updateItem.isPending || deleteItem.isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(item)}
                              disabled={updateItem.isPending || deleteItem.isPending}
                              title={item.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <Power className={`h-4 w-4 ${item.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(item)}
                              disabled={updateItem.isPending || deleteItem.isPending}
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

              {/* Pagination */}
              {data.count > pageSize && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, data.count)} of {data.count} items
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={!data.previous || page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {getTotalPages()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!data.next}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No billing items found"
              description="Get started by creating your first billing item."
              actionLabel="Create Item"
              onAction={() => setIsCreateModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Item Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Billing Item</DialogTitle>
            <DialogDescription>
              Add a new billing item that can be used in invoices.
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
                  disabled={createItem.isPending}
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
                  placeholder="Optional description..."
                  disabled={createItem.isPending}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">
                    Price <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setFormData((prev) => ({ ...prev, price: isNaN(value) ? 0 : value }));
                      if (errors.price) setErrors((prev) => clearFieldError(prev, 'price'));
                      if (clientErrors.price) setClientErrors((prev) => ({ ...prev, price: '' }));
                    }}
                    required
                    disabled={createItem.isPending}
                  />
                  {(errors.price || clientErrors.price) && (
                    <p className="text-sm text-destructive">
                      {errors.price?.[0] || clientErrors.price}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={currency}
                    disabled
                    placeholder="USD"
                    maxLength={3}
                  />
                  {(errors.currency || clientErrors.currency) && (
                    <p className="text-sm text-destructive">
                      {errors.currency?.[0] || clientErrors.currency}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }));
                    if (errors.is_active) setErrors((prev) => clearFieldError(prev, 'is_active'));
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={createItem.isPending}
                />
                <Label htmlFor="is_active" className="font-normal">
                  Active
                </Label>
                {errors.is_active && (
                  <p className="text-sm text-destructive">{errors.is_active[0]}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createItem.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createItem.isPending}>
                {createItem.isPending ? 'Creating...' : 'Create Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Billing Item</DialogTitle>
            <DialogDescription>
              Update the billing item details.
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
                  disabled={updateItem.isPending}
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
                  placeholder="Optional description..."
                  disabled={updateItem.isPending}
                />
                {editErrors.description && (
                  <p className="text-sm text-destructive">{editErrors.description[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">
                    Price <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.price || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setEditFormData((prev) => ({ ...prev, price: isNaN(value) ? 0 : value }));
                      if (editErrors.price) setEditErrors((prev) => clearFieldError(prev, 'price'));
                      if (editClientErrors.price) setEditClientErrors((prev) => ({ ...prev, price: '' }));
                    }}
                    required
                    disabled={updateItem.isPending}
                  />
                  {(editErrors.price || editClientErrors.price) && (
                    <p className="text-sm text-destructive">
                      {editErrors.price?.[0] || editClientErrors.price}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-currency">Currency</Label>
                  <Input
                    id="edit-currency"
                    value={currency}
                    disabled
                    placeholder="USD"
                    maxLength={3}
                  />
                  {(editErrors.currency || editClientErrors.currency) && (
                    <p className="text-sm text-destructive">
                      {editErrors.currency?.[0] || editClientErrors.currency}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={editFormData.is_active ?? true}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, is_active: e.target.checked }));
                    if (editErrors.is_active) setEditErrors((prev) => clearFieldError(prev, 'is_active'));
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={updateItem.isPending}
                />
                <Label htmlFor="edit-is_active" className="font-normal">
                  Active
                </Label>
                {editErrors.is_active && (
                  <p className="text-sm text-destructive">{editErrors.is_active[0]}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedItem(null);
                  setEditFormData({});
                  setEditErrors({});
                  setEditClientErrors({});
                }}
                disabled={updateItem.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateItem.isPending}>
                {updateItem.isPending ? 'Updating...' : 'Update Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Billing Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {editErrors.non_field_errors && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {editErrors.non_field_errors.map((err, idx) => (
                  <div key={idx}>{err}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedItem(null);
                setEditErrors({});
              }}
              disabled={deleteItem.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteItem.isPending}
            >
              {deleteItem.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
