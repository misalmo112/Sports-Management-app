import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { PageShell } from '@/shared/components/common/PageShell';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { clearFieldError, extractValidationErrors, formatErrorMessage } from '@/shared/utils/errorUtils';
import { useChangePassword, useCurrentAccount, useUpdateCurrentAccount } from '../hooks/hooks';
import type { ChangePasswordRequest, UpdateCurrentAccountRequest } from '../types';

const emptyAccountForm: UpdateCurrentAccountRequest = {
  email: '',
  first_name: '',
  last_name: '',
};

const emptyPasswordForm: ChangePasswordRequest = {
  current_password: '',
  new_password: '',
  new_password_confirm: '',
};

export const AccountSettingsPage = () => {
  const { data, isLoading, error, refetch } = useCurrentAccount();
  const updateAccount = useUpdateCurrentAccount();
  const updatePassword = useChangePassword();

  const [accountForm, setAccountForm] = useState<UpdateCurrentAccountRequest>(emptyAccountForm);
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest>(emptyPasswordForm);
  const [accountErrors, setAccountErrors] = useState<Record<string, string[]>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setAccountForm({
      email: data.email || '',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
    });
  }, [data]);

  const handleAccountChange = (
    field: keyof UpdateCurrentAccountRequest,
    value: string
  ) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
    if (accountErrors[field]) {
      setAccountErrors((prev) => clearFieldError(prev, field));
    }
  };

  const handlePasswordChange = (
    field: keyof ChangePasswordRequest,
    value: string
  ) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => clearFieldError(prev, field));
    }
  };

  const submitAccount = async (event: FormEvent) => {
    event.preventDefault();
    setAccountErrors({});
    setSuccessMessage(null);

    try {
      await updateAccount.mutateAsync(accountForm);
      setSuccessMessage('Account details updated successfully.');
    } catch (err) {
      const validationErrors = extractValidationErrors(err);
      if (validationErrors) {
        setAccountErrors(validationErrors);
      } else {
        setAccountErrors({
          non_field_errors: [formatErrorMessage(err)],
        });
      }
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordMessage(null);

    try {
      const response = await updatePassword.mutateAsync(passwordForm);
      setPasswordMessage(response.detail || 'Password updated successfully.');
      setPasswordForm(emptyPasswordForm);
    } catch (err) {
      const validationErrors = extractValidationErrors(err);
      if (validationErrors) {
        setPasswordErrors(validationErrors);
      } else {
        setPasswordErrors({
          non_field_errors: [formatErrorMessage(err)],
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading account settings..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Failed to load account settings')}
          onRetry={() => refetch()}
          title="Failed to load account settings"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <PageShell
        title="My Account"
        subtitle="Manage your login identity separately from the academy’s organization profile."
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update the signed-in admin&apos;s login email and display name.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitAccount} className="space-y-5">
                {successMessage ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {accountErrors.non_field_errors ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {accountErrors.non_field_errors.map((message) => (
                        <div key={message}>{message}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="account-first-name">First Name</Label>
                    <Input
                      id="account-first-name"
                      value={accountForm.first_name || ''}
                      onChange={(event) => handleAccountChange('first_name', event.target.value)}
                      disabled={updateAccount.isPending}
                    />
                    {accountErrors.first_name ? (
                      <p className="text-sm text-destructive">{accountErrors.first_name[0]}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="account-last-name">Last Name</Label>
                    <Input
                      id="account-last-name"
                      value={accountForm.last_name || ''}
                      onChange={(event) => handleAccountChange('last_name', event.target.value)}
                      disabled={updateAccount.isPending}
                    />
                    {accountErrors.last_name ? (
                      <p className="text-sm text-destructive">{accountErrors.last_name[0]}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="account-email">Login Email</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={accountForm.email || ''}
                    onChange={(event) => handleAccountChange('email', event.target.value)}
                    disabled={updateAccount.isPending}
                  />
                  {accountErrors.email ? (
                    <p className="text-sm text-destructive">{accountErrors.email[0]}</p>
                  ) : null}
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Current role</p>
                  <p className="mt-2 font-semibold">{data.role}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Last login: {data.last_login ? new Date(data.last_login).toLocaleString() : 'Not available'}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateAccount.isPending}>
                    {updateAccount.isPending ? 'Saving...' : 'Save Account Details'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password without affecting other academy users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitPassword} className="space-y-5">
                {passwordMessage ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{passwordMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {passwordErrors.non_field_errors ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {passwordErrors.non_field_errors.map((message) => (
                        <div key={message}>{message}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <PasswordField
                  id="current-password"
                  label="Current Password"
                  value={passwordForm.current_password}
                  error={passwordErrors.current_password?.[0]}
                  onChange={(value) => handlePasswordChange('current_password', value)}
                  disabled={updatePassword.isPending}
                />

                <PasswordField
                  id="new-password"
                  label="New Password"
                  value={passwordForm.new_password}
                  error={passwordErrors.new_password?.[0]}
                  onChange={(value) => handlePasswordChange('new_password', value)}
                  disabled={updatePassword.isPending}
                />

                <PasswordField
                  id="new-password-confirm"
                  label="Confirm New Password"
                  value={passwordForm.new_password_confirm}
                  error={passwordErrors.new_password_confirm?.[0]}
                  onChange={(value) => handlePasswordChange('new_password_confirm', value)}
                  disabled={updatePassword.isPending}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={updatePassword.isPending}>
                    {updatePassword.isPending ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  );
};

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function PasswordField({ id, label, value, error, disabled, onChange }: PasswordFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
