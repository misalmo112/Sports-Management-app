import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import portalAxios from '@/api/portalAxios';
import { usePortalAuth } from '@/hooks/usePortalAuth';

export default function PortalLogin() {
  const navigate = useNavigate();
  const { login } = usePortalAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const response = await portalAxios.post('auth/portal/login/', payload);
      return response.data;
    },
    onSuccess: (data) => {
      login({
        accessToken: data?.access,
        refreshToken: data?.refresh,
        user: data?.user ?? null,
      });
      navigate('/portal', { replace: true });
    },
  });

  return (
    <div className="mx-auto mt-16 max-w-md space-y-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold">Portal Login</h1>
        <p className="text-sm text-muted-foreground">Sign in to your parent/student portal.</p>
      </div>

      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Login failed</AlertTitle>
          <AlertDescription>Could not sign in. Please check your credentials.</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({ email, password });
        }}
      >
        <div className="space-y-2">
          <label htmlFor="portal-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="portal-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="portal-password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="portal-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}

