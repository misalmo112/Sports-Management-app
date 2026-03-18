/**
 * Forgot password page (public route)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(formatErrorMessage(err));
    }
  };

  return (
    <div className="page-grid flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Sports Academy
          </p>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                If an account exists for that email, we&apos;ve sent a reset link. Check your
                inbox and spam folder.
              </AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <div className="space-y-4">
              <Button asChild className="w-full" variant="outline">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
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
                  disabled={forgotPasswordMutation.isPending}
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
