/**
 * Login page (public route)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useLogin } from '../hooks/useLogin';
import { AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const response = await loginMutation.mutateAsync({
        email,
        password,
      });

      // Store tokens
      localStorage.setItem('auth_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);

      // Support both flat and nested response shapes (e.g. response.user or response.data.user)
      const user = response.user ?? (response as { data?: { user?: { academy_id?: string | null; role?: string } } }).data?.user;
      const academyId = user?.academy_id != null ? String(user.academy_id).trim() : null;
      const role = user?.role;
      localStorage.setItem('user_academy_id', academyId ?? '');

      if (role) {
        const normalizedRole = academyId ? role : 'SUPERADMIN';
        localStorage.setItem('user_role', normalizedRole);
      }

      // X-Academy-ID is required for tenant API calls; set whenever we have an academy
      if (academyId) {
        localStorage.setItem('selected_academy_id', academyId);
      } else {
        localStorage.removeItem('selected_academy_id');
      }

      // Tenant users with an academy go to onboarding first; dashboard redirects there if incomplete
      if (academyId) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    }
  };

  return (
    <div className="page-grid flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Sports Academy
          </p>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to manage your academy operations.
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
                disabled={loginMutation.isPending}
                autoComplete="email"
              />
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
                disabled={loginMutation.isPending}
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
