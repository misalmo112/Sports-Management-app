/**
 * Create user modal component
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useInviteUser } from '../hooks/useInviteUser';
import type { UserRole } from '../types';
import { Alert } from '@/shared/components/ui/alert';
import { StaffModuleAccessPicker } from './StaffModuleAccessPicker';
import { extractValidationErrors, formatErrorMessage } from '@/shared/utils/errorUtils';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const emptyForm = () => ({
  email: '',
  role: 'ADMIN' as UserRole,
  firstName: '',
  lastName: '',
  selectedModules: [] as string[],
});

export const CreateUserModal = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserModalProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const inviteUser = useInviteUser();

  const resetForm = () => {
    const f = emptyForm();
    setEmail(f.email);
    setRole(f.role);
    setFirstName(f.firstName);
    setLastName(f.lastName);
    setSelectedModules(f.selectedModules);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (role === 'STAFF' && selectedModules.length === 0) {
      setErrors({
        allowed_modules: ['Select at least one module for staff users.'],
      });
      return;
    }

    try {
      await inviteUser.mutateAsync({
        email,
        role,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        ...(role === 'STAFF' ? { allowed_modules: [...selectedModules] } : {}),
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const validation = extractValidationErrors(error);
      if (validation) {
        setErrors(validation);
      } else {
        setErrors({ non_field_errors: [formatErrorMessage(error)] });
      }
    }
  };

  const handleDialogOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next && !inviteUser.isPending) {
      resetForm();
    }
  };

  const handleCancel = () => {
    if (!inviteUser.isPending) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new user. They will receive an email with
            instructions to set up their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={inviteUser.isPending}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email[0]}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={role}
                onValueChange={(value) => {
                  setRole(value as UserRole);
                  if (value !== 'STAFF') {
                    setSelectedModules([]);
                  }
                }}
                disabled={inviteUser.isPending}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="COACH">Coach</SelectItem>
                  <SelectItem value="PARENT">Parent</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role[0]}</p>
              )}
            </div>

            {role === 'STAFF' && (
              <div className="grid gap-2">
                <Label>
                  Module access <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Choose which areas of the admin dashboard this staff member can
                  access.
                </p>
                <StaffModuleAccessPicker
                  selectedKeys={selectedModules}
                  onChange={(keys) => {
                    setSelectedModules(keys);
                    if (errors.allowed_modules) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.allowed_modules;
                        return next;
                      });
                    }
                  }}
                  disabled={inviteUser.isPending}
                  errorMessage={errors.allowed_modules?.[0]}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name (Optional)</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={inviteUser.isPending}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">
                  {errors.first_name[0]}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name (Optional)</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={inviteUser.isPending}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">
                  {errors.last_name[0]}
                </p>
              )}
            </div>

            {errors.non_field_errors && (
              <Alert variant="destructive" className="mt-2">
                <p>{errors.non_field_errors[0]}</p>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={inviteUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteUser.isPending}>
              {inviteUser.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
