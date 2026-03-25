import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';

const PortalLogin = lazy(() => import('@/pages/portal/PortalLogin'));
const PortalDashboard = lazy(() => import('@/pages/portal/PortalDashboard'));
const StudentDetail = lazy(() => import('@/pages/portal/StudentDetail'));
const StudentSchedule = lazy(() => import('@/pages/portal/StudentSchedule'));
const InvoiceList = lazy(() => import('@/pages/portal/InvoiceList'));
const InvoiceDetail = lazy(() => import('@/pages/portal/InvoiceDetail'));
const MediaGallery = lazy(() => import('@/pages/portal/MediaGallery'));

export function PortalPrivateRoute({ children }) {
  const portalAuth = usePortalAuth();
  const staffRole = localStorage.getItem('user_role');
  const user = portalAuth.currentUser();

  if (!portalAuth.isAuthenticated()) {
    return <Navigate to="/portal/login" replace />;
  }

  if (staffRole === 'STAFF' || user?.role === 'STAFF') {
    return (
      <Navigate
        to="/portal/login"
        replace
        state={{ reason: 'staff-role-blocked' }}
      />
    );
  }

  return children;
}

function PortalLayout({ children }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl space-y-6 p-6">
      <header className="border-b pb-3">
        <h1 className="text-xl font-semibold">Portal</h1>
      </header>
      {children}
    </div>
  );
}

function RouteSuspense({ children }) {
  return <Suspense fallback={<Skeleton className="h-48 w-full" />}>{children}</Suspense>;
}

export default function PortalRoutes() {
  return (
    <Routes>
      <Route
        path="login"
        element={
          <RouteSuspense>
            <PortalLogin />
          </RouteSuspense>
        }
      />
      <Route
        index
        element={
          <PortalPrivateRoute>
            <PortalLayout>
              <RouteSuspense>
                <PortalDashboard />
              </RouteSuspense>
            </PortalLayout>
          </PortalPrivateRoute>
        }
      />
      <Route
        path="students/:studentId"
        element={
          <PortalPrivateRoute>
            <PortalLayout>
              <RouteSuspense>
                <StudentDetail />
              </RouteSuspense>
            </PortalLayout>
          </PortalPrivateRoute>
        }
      />
      <Route
        path="students/:studentId/schedule"
        element={
          <PortalPrivateRoute>
            <PortalLayout>
              <RouteSuspense>
                <StudentSchedule />
              </RouteSuspense>
            </PortalLayout>
          </PortalPrivateRoute>
        }
      />
      <Route
        path="invoices"
        element={
          <PortalPrivateRoute>
            <PortalLayout>
              <RouteSuspense>
                <InvoiceList />
              </RouteSuspense>
            </PortalLayout>
          </PortalPrivateRoute>
        }
      />
      <Route
        path="invoices/:invoiceId"
        element={
          <PortalPrivateRoute>
            <PortalLayout>
              <RouteSuspense>
                <InvoiceDetail />
              </RouteSuspense>
            </PortalLayout>
          </PortalPrivateRoute>
        }
      />
      <Route
        path="media"
        element={
          <PortalPrivateRoute>
            <PortalLayout>
              <RouteSuspense>
                <MediaGallery />
              </RouteSuspense>
            </PortalLayout>
          </PortalPrivateRoute>
        }
      />
      <Route
        path="*"
        element={
          <Alert>
            <AlertTitle>Portal route not found</AlertTitle>
            <AlertDescription>Use portal navigation links to continue.</AlertDescription>
          </Alert>
        }
      />
    </Routes>
  );
}

