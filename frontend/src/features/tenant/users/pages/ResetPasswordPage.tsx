/**
 * Reset password page (public route)
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useResetPassword } from '../hooks/useResetPassword';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetPasswordMutation = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!token) {
      setError('Invalid or expired reset link.');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password,
        password_confirm: passwordConfirm,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(formatErrorMessage(err));
    }
  };

  if (!token) {
    return (
      <div className="page-grid flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Sports Academy
            </p>
            <CardTitle className="text-2xl">Invalid or expired link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired. Request a new one from the
              login page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-grid flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Sports Academy
            </p>
            <CardTitle className="text-2xl">Password reset</CardTitle>
            <CardDescription>
              Your password has been reset successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                You can now sign in with your new password.
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link to="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-grid flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Sports Academy
          </p>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                New password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={resetPasswordMutation.isPending}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirm">
                Confirm password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password_confirm"
                type="password"
                placeholder="Confirm your password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                disabled={resetPasswordMutation.isPending}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
