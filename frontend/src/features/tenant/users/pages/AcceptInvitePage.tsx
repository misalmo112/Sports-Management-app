/**
 * Accept invitation page (public route)
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useValidateInvite, useAcceptInvite } from '../hooks/useAcceptInvite';
import { setAllowedModulesInStorage } from '@/shared/utils/roleAccess';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const namesPrefilledRef = useRef(false);

  const {
    data: validateData,
    isLoading: isValidating,
    error: validateError,
  } = useValidateInvite(token || '', !!token);

  const acceptInvite = useAcceptInvite();

  useEffect(() => {
    if (!token) {
      setErrors({
        token: ['Invalid invitation link'],
      });
    }
  }, [token]);

  useEffect(() => {
    namesPrefilledRef.current = false;
  }, [token]);

  useEffect(() => {
    const d = validateData?.data;
    if (!d || namesPrefilledRef.current) return;
    namesPrefilledRef.current = true;
    setFirstName(d.first_name ?? '');
    setLastName(d.last_name ?? '');
  }, [validateData?.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password !== confirmPassword) {
      setErrors({
        password: ['Passwords do not match'],
      });
      return;
    }

    if (password.length < 8) {
      setErrors({
        password: ['Password must be at least 8 characters long'],
      });
      return;
    }

    if (!token) {
      setErrors({
        token: ['Invalid invitation link'],
      });
      return;
    }

    try {
      const res = await acceptInvite.mutateAsync({
        token,
        data: {
          password,
          password_confirm: confirmPassword,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
        },
      });

      if (res.access && res.user) {
        localStorage.setItem('auth_token', res.access);
        if (res.refresh) {
          localStorage.setItem('refresh_token', res.refresh);
        }
        const aid = res.user.academy_id != null ? String(res.user.academy_id).trim() : '';
        localStorage.setItem('user_academy_id', aid);
        localStorage.setItem('user_role', res.user.role);
        if (Array.isArray(res.user.allowed_modules)) {
          setAllowedModulesInStorage(res.user.allowed_modules);
        } else {
          setAllowedModulesInStorage(null);
        }
        if (aid) {
          localStorage.setItem('selected_academy_id', aid);
        } else {
          localStorage.removeItem('selected_academy_id');
        }
      }

      setSuccess(true);
      // Redirect to dashboard after 2 seconds
      // Note: In production, this should redirect to login page
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to accept invitation'],
        });
      }
    }
  };

  if (!token) {
    return (
      <div className="page-grid flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              The invitation link is invalid or missing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please contact your administrator for a new invitation link.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="page-grid flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Validating invitation...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validateError || !validateData?.data) {
    return (
      <div className="page-grid flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validateError instanceof Error
                  ? validateError.message
                  : validateData?.message || 'The invitation link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-grid flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <h2 className="text-2xl font-bold">Invitation Accepted!</h2>
                <p className="text-muted-foreground mt-2">
                  Your account has been created successfully. Redirecting to login...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inviteData = validateData.data;

  return (
    <div className="page-grid flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Set up your account for {inviteData.academy_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border p-4 bg-muted">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{inviteData.email}</p>
              </div>
              <div className="mt-3 space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <p className="text-sm font-medium capitalize">
                  {inviteData.role.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name (Optional)</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={acceptInvite.isPending}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">
                  {errors.first_name[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name (Optional)</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={acceptInvite.isPending}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">
                  {errors.last_name[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={acceptInvite.isPending}
                minLength={8}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={acceptInvite.isPending}
                minLength={8}
              />
              {errors.password_confirm && (
                <p className="text-sm text-destructive">
                  {errors.password_confirm[0]}
                </p>
              )}
            </div>

            {errors.non_field_errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.non_field_errors[0]}
                </AlertDescription>
              </Alert>
            )}

            {errors.token && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.token[0]}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={acceptInvite.isPending}
            >
              {acceptInvite.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
