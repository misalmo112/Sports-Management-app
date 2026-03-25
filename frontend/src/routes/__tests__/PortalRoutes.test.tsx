import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PortalRoutes from '@/routes/PortalRoutes';

const renderPortalPath = (initialPath: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/portal/*',
        element: <PortalRoutes />,
      },
    ],
    { initialEntries: [initialPath] }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

describe('PortalRoutes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated /portal to /portal/login', async () => {
    renderPortalPath('/portal');

    expect(await screen.findByText('Portal Login')).toBeInTheDocument();
  });

  it('blocks staff users from portal private routes', async () => {
    localStorage.setItem('portal_access_token', 'portal-token');
    localStorage.setItem('user_role', 'STAFF');

    renderPortalPath('/portal');

    await waitFor(() => {
      expect(screen.getByText('Portal Login')).toBeInTheDocument();
    });
  });
});

