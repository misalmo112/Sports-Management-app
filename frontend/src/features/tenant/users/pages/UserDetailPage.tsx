/**
 * User Detail Page
 * View and edit user details
 */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { ArrowLeft, Edit, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUpdateUser } from '../hooks/useUpdateUser';
import { getUser } from '../services/usersApi';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { UpdateUserRequest } from '../types';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { StaffModuleAccessPicker } from '../components/StaffModuleAccessPicker';
import { formatTenantModuleLabel } from '@/shared/constants/moduleKeys';
import { getStaffModuleDisplayGroups } from '@/shared/constants/staffModulePickerGroups';

export const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateUserRequest>({});
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { formatDateTime } = useAcademyFormat();
  const [parentRecordForm, setParentRecordForm] = useState({
    phone: '',
    phone_numbers: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });

  const userId = id ? parseInt(id) : undefined;
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['users', 'detail', userId],
    queryFn: () => getUser(userId!),
    enabled: !!userId,
  });

  const updateUser = useUpdateUser();

  useEffect(() => {
    if (updateUser.isSuccess) {
      refetch();
    }
  }, [updateUser.isSuccess, refetch]);

  const handleEditClick = () => {
    if (!user) return;
    setEditFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      ...(user.role === 'STAFF'
        ? { allowed_modules: [...(user.allowed_modules || [])] }
        : {}),
    });
    if (user.role === 'PARENT' && user.parent_record) {
      setParentRecordForm({
        phone: user.parent_record.phone || '',
        phone_numbers: (user.parent_record.phone_numbers || []).join(', '),
        address_line1: user.parent_record.address_line1 || '',
        address_line2: user.parent_record.address_line2 || '',
        city: user.parent_record.city || '',
        state: user.parent_record.state || '',
        postal_code: user.parent_record.postal_code || '',
        country: user.parent_record.country || '',
      });
    }
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors({});

    if (!userId || !user) return;

    try {
      const updatePayload: UpdateUserRequest = { ...editFormData };
      if (user.role === 'STAFF') {
        const mods = editFormData.allowed_modules;
        if (!mods || mods.length === 0) {
          setEditErrors({
            allowed_modules: ['Select at least one module for staff users.'],
          });
          return;
        }
        updatePayload.allowed_modules = [...mods];
      }
      if (user.role === 'PARENT') {
        const phoneNumbers = parentRecordForm.phone_numbers
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        updatePayload.parent_record = {
          phone: parentRecordForm.phone,
          phone_numbers: phoneNumbers,
          address_line1: parentRecordForm.address_line1,
          address_line2: parentRecordForm.address_line2,
          city: parentRecordForm.city,
          state: parentRecordForm.state,
          postal_code: parentRecordForm.postal_code,
          country: parentRecordForm.country,
        };
      }
      await updateUser.mutateAsync({
        id: userId,
        data: updatePayload,
      });
      setIsEditModalOpen(false);
      setEditFormData({});
      setSuccessMessage('User updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      refetch();
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setEditErrors(validationErrors);
      } else {
        setEditErrors({
          non_field_errors: [error.message || 'Failed to update user'],
        });
      }
    }
  };

  const handleDisableClick = () => {
    setIsDisableDialogOpen(true);
  };

  const handleDisableConfirm = async () => {
    if (!userId || !user) return;

    try {
      const newStatus = user.status === 'disabled' ? 'active' : 'disabled';
      await updateUser.mutateAsync({
        id: userId,
        data: { status: newStatus },
      });
      setIsDisableDialogOpen(false);
      setSuccessMessage(`User ${newStatus === 'disabled' ? 'disabled' : 'enabled'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      refetch();
    } catch (error: any) {
      setEditErrors({
        non_field_errors: [error.message || 'Failed to update user status'],
      });
    }
  };

  const formatRole = (role: string) => {
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  const staffModuleReadOnly = useMemo(() => {
    const assigned = user?.allowed_modules;
    if (user?.role !== 'STAFF' || !assigned?.length) {
      return { grouped: [] as ReturnType<typeof getStaffModuleDisplayGroups>, orphans: [] as string[] };
    }
    const grouped = getStaffModuleDisplayGroups(assigned);
    const inGroups = new Set(grouped.flatMap((g) => g.modules.map((m) => m.key)));
    const orphans = assigned.filter((k) => !inGroups.has(k));
    return { grouped, orphans };
  }, [user]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading user details..." />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('User not found')}
          onRetry={() => refetch()}
          title="Failed to load user"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEditClick}
            disabled={updateUser.isPending}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant={user.status === 'disabled' ? 'default' : 'destructive'}
            onClick={handleDisableClick}
            disabled={updateUser.isPending}
          >
            {user.status === 'disabled' ? 'Enable' : 'Disable'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>User details and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium mt-1">{user.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <p className="font-medium mt-1">{formatRole(user.role)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">First Name</Label>
                <p className="font-medium mt-1">{user.first_name || '—'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Name</Label>
                <p className="font-medium mt-1">{user.last_name || '—'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Academy ID</Label>
                <p className="font-medium mt-1">{user.academy_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {user.role === 'STAFF' && (
          <Card>
            <CardHeader>
              <CardTitle>Module access</CardTitle>
              <CardDescription>
                Dashboard areas this staff member can use
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.allowed_modules && user.allowed_modules.length > 0 ? (
                <div className="space-y-4 text-sm">
                  {staffModuleReadOnly.grouped.map((group) => (
                    <div key={group.groupId}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {group.groupLabel}
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        {group.modules.map((mod) => (
                          <li key={mod.key}>
                            <span className="font-medium">{mod.label}</span>{' '}
                            <span className="text-muted-foreground">({mod.key})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {staffModuleReadOnly.orphans.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Other
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        {staffModuleReadOnly.orphans.map((key) => (
                          <li key={key}>
                            <span className="font-medium">{formatTenantModuleLabel(key)}</span>{' '}
                            <span className="text-muted-foreground">({key})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No modules assigned</p>
              )}
            </CardContent>
          </Card>
        )}

        {user.role === 'PARENT' && (
          <Card>
            <CardHeader>
              <CardTitle>Parent Information</CardTitle>
              <CardDescription>Details stored for this parent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Parent Email</Label>
                  <p className="font-medium mt-1">{user.parent_record?.email || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Primary Phone</Label>
                  <p className="font-medium mt-1">{user.parent_record?.phone || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Phone Numbers</Label>
                  <p className="font-medium mt-1">
                    {user.parent_record?.phone_numbers?.length
                      ? user.parent_record.phone_numbers.join(', ')
                      : '—'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium mt-1">
                    {[
                      user.parent_record?.address_line1,
                      user.parent_record?.address_line2,
                      user.parent_record?.city,
                      user.parent_record?.state,
                      user.parent_record?.postal_code,
                      user.parent_record?.country,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user.role === 'PARENT' && (
          <Card>
            <CardHeader>
              <CardTitle>Linked Students</CardTitle>
              <CardDescription>Students connected to this parent</CardDescription>
            </CardHeader>
            <CardContent>
              {user.parent_students && user.parent_students.length > 0 ? (
                <div className="space-y-3">
                  {user.parent_students.map((student) => (
                    <div
                      key={student.id}
                      className="flex flex-wrap items-center justify-between rounded border px-4 py-3"
                    >
                      <div className="font-medium">{student.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.date_of_birth
                          ? formatDateTime(student.date_of_birth)
                          : 'No DOB'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No students linked</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>User activity and timestamps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Invited At</Label>
                <p className="font-medium mt-1">{formatDateTime(user.invited_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Login</Label>
                <p className="font-medium mt-1">{formatDateTime(user.last_login)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created At</Label>
                <p className="font-medium mt-1">{formatDateTime(user.created_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Updated At</Label>
                <p className="font-medium mt-1">{formatDateTime(user.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent
          className={user.role === 'STAFF' ? 'sm:max-w-xl max-h-[90vh] overflow-y-auto' : 'sm:max-w-[500px]'}
        >
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
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
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={editFormData.first_name || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, first_name: e.target.value || undefined }));
                    if (editErrors.first_name) setEditErrors((prev) => clearFieldError(prev, 'first_name'));
                  }}
                  disabled={updateUser.isPending}
                />
                {editErrors.first_name && (
                  <p className="text-sm text-destructive">{editErrors.first_name[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={editFormData.last_name || ''}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, last_name: e.target.value || undefined }));
                    if (editErrors.last_name) setEditErrors((prev) => clearFieldError(prev, 'last_name'));
                  }}
                  disabled={updateUser.isPending}
                />
                {editErrors.last_name && (
                  <p className="text-sm text-destructive">{editErrors.last_name[0]}</p>
                )}
              </div>

              {user.role === 'STAFF' && (
                <div className="grid gap-2">
                  <Label>
                    Module access <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose which areas of the admin dashboard this staff member can access.
                  </p>
                  <StaffModuleAccessPicker
                    selectedKeys={editFormData.allowed_modules || []}
                    onChange={(keys) => {
                      setEditFormData((prev) => ({ ...prev, allowed_modules: keys }));
                      if (editErrors.allowed_modules) {
                        setEditErrors((prev) => clearFieldError(prev, 'allowed_modules'));
                      }
                    }}
                    disabled={updateUser.isPending}
                    errorMessage={editErrors.allowed_modules?.[0]}
                  />
                </div>
              )}

              {user.role === 'PARENT' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_phone">Primary Phone</Label>
                    <Input
                      id="parent_phone"
                      value={parentRecordForm.phone}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      disabled={updateUser.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_phone_numbers">Phone Numbers</Label>
                    <Input
                      id="parent_phone_numbers"
                      value={parentRecordForm.phone_numbers}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, phone_numbers: e.target.value }))
                      }
                      placeholder="Add multiple numbers separated by commas"
                      disabled={updateUser.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_address_line1">Address Line 1</Label>
                    <Input
                      id="parent_address_line1"
                      value={parentRecordForm.address_line1}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, address_line1: e.target.value }))
                      }
                      disabled={updateUser.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_address_line2">Address Line 2</Label>
                    <Input
                      id="parent_address_line2"
                      value={parentRecordForm.address_line2}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, address_line2: e.target.value }))
                      }
                      disabled={updateUser.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_city">City</Label>
                    <Input
                      id="parent_city"
                      value={parentRecordForm.city}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, city: e.target.value }))
                      }
                      disabled={updateUser.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_state">State</Label>
                    <Input
                      id="parent_state"
                      value={parentRecordForm.state}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, state: e.target.value }))
                      }
                      disabled={updateUser.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_postal_code">Postal Code</Label>
                    <Input
                      id="parent_postal_code"
                      value={parentRecordForm.postal_code}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, postal_code: e.target.value }))
                      }
                      disabled={updateUser.isPending}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parent_country">Country</Label>
                    <Input
                      id="parent_country"
                      value={parentRecordForm.country}
                      onChange={(e) =>
                        setParentRecordForm((prev) => ({ ...prev, country: e.target.value }))
                      }
                      disabled={updateUser.isPending}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditFormData({});
                  setEditErrors({});
                }}
                disabled={updateUser.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable/Enable Confirmation Dialog */}
      <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{user.status === 'disabled' ? 'Enable User' : 'Disable User'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {user.status === 'disabled' ? 'enable' : 'disable'} user "{user.email}"?
              {user.status === 'disabled' 
                ? ' The user will be able to access the system again.'
                : ' The user will not be able to access the system.'}
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
                setIsDisableDialogOpen(false);
                setEditErrors({});
              }}
              disabled={updateUser.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={user.status === 'disabled' ? 'default' : 'destructive'}
              onClick={handleDisableConfirm}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? 'Updating...' : user.status === 'disabled' ? 'Enable' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

