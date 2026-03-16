/**
 * Application routes
 */
import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '@/shared/components/common/RequireAuth';
import { RequireOnboardingComplete } from '@/shared/components/common/RequireOnboardingComplete';
import { RequireOnboardingIncomplete } from '@/shared/components/common/RequireOnboardingIncomplete';
import { RequireRole } from '@/shared/components/common/RequireRole';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import type { UserRole } from '@/shared/utils/roleAccess';

// Public pages
import OnboardingPage from '@/features/tenant/onboarding/pages/OnboardingPage';
import { AcceptInvitePage } from '@/features/tenant/users/pages/AcceptInvitePage';
import { LoginPage } from '@/features/tenant/users/pages/LoginPage';

// Platform pages (SUPERADMIN)
import { AcademyListPage } from '@/features/platform/tenants/pages/AcademyListPage';
import { AcademyCreatePage } from '@/features/platform/tenants/pages/AcademyCreatePage';
import { AcademyDetailPage } from '@/features/platform/tenants/pages/AcademyDetailPage';
import { AcademyPlanPage } from '@/features/platform/tenants/pages/AcademyPlanPage';
import { AcademyQuotaPage } from '@/features/platform/tenants/pages/AcademyQuotaPage';
import { PlansListPage } from '@/features/platform/subscriptions/pages/PlansListPage';
import { PlanCreatePage } from '@/features/platform/subscriptions/pages/PlanCreatePage';
import { PlanDetailPage } from '@/features/platform/subscriptions/pages/PlanDetailPage';
import { StatsPage } from '@/features/platform/analytics/pages/StatsPage';
import { ErrorsPage } from '@/features/platform/audit/pages/ErrorsPage';
import { AuditLogsPage } from '@/features/platform/audit/pages/AuditLogsPage';

// Owner pages
import { OwnerOverviewPage } from '@/features/tenant/overview/pages/OwnerOverviewPage';
import { SelectAcademyPage } from '@/features/tenant/pages/SelectAcademyPage';

// Admin/Tenant pages
import { AdminOverviewPage } from '@/features/tenant/overview/pages/AdminOverviewPage';
import { StudentsListPage } from '@/features/tenant/students/pages/StudentsListPage';
import { StudentCreatePage } from '@/features/tenant/students/pages/StudentCreatePage';
import { StudentDetailPage } from '@/features/tenant/students/pages/StudentDetailPage';
import { StudentEditPage } from '@/features/tenant/students/pages/StudentEditPage';
import { ClassesListPage } from '@/features/tenant/classes/pages/ClassesListPage';
import { ClassCreatePage } from '@/features/tenant/classes/pages/ClassCreatePage';
import { ClassDetailPage } from '@/features/tenant/classes/pages/ClassDetailPage';
import { ClassEditPage } from '@/features/tenant/classes/pages/ClassEditPage';
import { EnrollmentPage } from '@/features/tenant/classes/pages/EnrollmentPage';
import { AttendancePage } from '@/features/tenant/attendance/pages/AttendancePage';
import { AttendanceMarkPage } from '@/features/tenant/attendance/pages/AttendanceMarkPage';
import { CoachAttendancePage } from '@/features/tenant/attendance/pages/CoachAttendancePage';
import { CoachAttendanceMarkPage } from '@/features/tenant/attendance/pages/CoachAttendanceMarkPage';
import { ItemsPage } from '@/features/tenant/billing/pages/ItemsPage';
import { InvoicesListPage } from '@/features/tenant/billing/pages/InvoicesListPage';
import { InvoiceCreatePage } from '@/features/tenant/billing/pages/InvoiceCreatePage';
import { InvoiceDetailPage } from '@/features/tenant/billing/pages/InvoiceDetailPage';
import { ReceiptsListPage } from '@/features/tenant/billing/pages/ReceiptsListPage';
import { ReceiptCreatePage } from '@/features/tenant/billing/pages/ReceiptCreatePage';
import { AcademySettingsPage } from '@/features/tenant/settings/pages/AcademySettingsPage';
import { LocationsPage } from '@/features/tenant/settings/pages/LocationsPage';
import { SportsPage } from '@/features/tenant/settings/pages/SportsPage';
import { AgeCategoriesPage } from '@/features/tenant/settings/pages/AgeCategoriesPage';
import { TermsPage } from '@/features/tenant/settings/pages/TermsPage';
import { BulkActionsPage } from '@/features/tenant/settings/pages/BulkActionsPage';
import { PricingPage } from '@/features/tenant/onboarding/pages/PricingPage';
import { MediaPage } from '@/features/tenant/media/pages/MediaPage';
import { ReportsPage } from '@/features/tenant/reports/pages/ReportsPage';
import { FinanceOverviewPage } from '@/features/tenant/finance/pages/FinanceOverviewPage';
import { FacilitiesPage } from '@/features/tenant/facilities/pages/FacilitiesPage';
import { StaffPage } from '@/features/tenant/staff/pages/StaffPage';
import { UsersPage } from '@/features/tenant/users/pages/UsersPage';
import { UserDetailPage } from '@/features/tenant/users/pages/UserDetailPage';

// Coach pages
import { CoachOverviewPage } from '@/features/tenant/overview/pages/CoachOverviewPage';
import { CoachClassesPage } from '@/features/tenant/classes/pages/CoachClassesPage';
import { CoachClassDetailPage } from '@/features/tenant/classes/pages/CoachClassDetailPage';
import { CoachMediaPage } from '@/features/tenant/media/pages/CoachMediaPage';

// Parent pages
import { ParentOverviewPage } from '@/features/tenant/overview/pages/ParentOverviewPage';
import { ParentChildrenPage } from '@/features/tenant/students/pages/ParentChildrenPage';
import { ParentAttendancePage } from '@/features/tenant/attendance/pages/ParentAttendancePage';
import { ParentInvoicesPage } from '@/features/tenant/billing/pages/ParentInvoicesPage';
import { ParentInvoiceDetailPage } from '@/features/tenant/billing/pages/ParentInvoiceDetailPage';
import { ParentMediaPage } from '@/features/tenant/media/pages/ParentMediaPage';
import { FeedbackPage } from '@/features/tenant/communication/pages/FeedbackPage';

// Helper function to create protected routes with guards
const createProtectedRoute = (
  element: React.ReactElement,
  requireOnboarding: boolean = false,
  allowedRoles?: UserRole[]
) => {
  let protectedElement = element;

  if (allowedRoles && allowedRoles.length > 0) {
    protectedElement = (
      <RequireRole allowedRoles={allowedRoles}>
        {protectedElement}
      </RequireRole>
    );
  }

  if (requireOnboarding) {
    protectedElement = (
      <RequireOnboardingComplete>
        {protectedElement}
      </RequireOnboardingComplete>
    );
  }

  return <RequireAuth>{protectedElement}</RequireAuth>;
};

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/onboarding',
    element: <RequireAuth><RequireOnboardingIncomplete><OnboardingPage /></RequireOnboardingIncomplete></RequireAuth>,
  },
  {
    path: '/accept-invite',
    element: <AcceptInvitePage />,
  },
  {
    path: '/',
    element: <LoginPage />,
  },
  // Dashboard routes (all require auth) - wrapped with DashboardLayout
  {
    path: '/dashboard',
    element: createProtectedRoute(<DashboardLayout />),
    children: [
      {
        index: true,
        element: createProtectedRoute(
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
              <p className="text-muted-foreground">Welcome to your dashboard!</p>
            </div>
          </div>
        ),
      },
      // Platform routes (SUPERADMIN only)
      {
        path: 'platform/academies',
        element: createProtectedRoute(<AcademyListPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/academies/new',
        element: createProtectedRoute(<AcademyCreatePage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/academies/:id',
        element: createProtectedRoute(<AcademyDetailPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/academies/:id/plan',
        element: createProtectedRoute(<AcademyPlanPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/academies/:id/quota',
        element: createProtectedRoute(<AcademyQuotaPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/plans',
        element: createProtectedRoute(<PlansListPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/plans/new',
        element: createProtectedRoute(<PlanCreatePage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/plans/:id',
        element: createProtectedRoute(<PlanDetailPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/stats',
        element: createProtectedRoute(<StatsPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/errors',
        element: createProtectedRoute(<ErrorsPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/audit-logs',
        element: createProtectedRoute(<AuditLogsPage />, false, ['SUPERADMIN']),
      },
      // Owner routes
      {
        path: 'owner/overview',
        element: createProtectedRoute(<OwnerOverviewPage />, true, ['OWNER']),
      },
      {
        path: 'select-academy',
        element: createProtectedRoute(<SelectAcademyPage />, false, ['OWNER']),
      },
      // Admin overview
      {
        path: 'admin/overview',
        element: createProtectedRoute(<AdminOverviewPage />, true, ['ADMIN', 'OWNER']),
      },
      // Students routes (Admin/Owner)
      {
        path: 'students',
        element: createProtectedRoute(<StudentsListPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'students/new',
        element: createProtectedRoute(<StudentCreatePage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'students/:id',
        element: createProtectedRoute(<StudentDetailPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'students/:id/edit',
        element: createProtectedRoute(<StudentEditPage />, true, ['ADMIN', 'OWNER']),
      },
      // Classes routes (Admin/Owner)
      {
        path: 'classes',
        element: createProtectedRoute(<ClassesListPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'classes/new',
        element: createProtectedRoute(<ClassCreatePage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'classes/:id',
        element: createProtectedRoute(<ClassDetailPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'classes/:id/edit',
        element: createProtectedRoute(<ClassEditPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'classes/:id/enrollments',
        element: createProtectedRoute(<EnrollmentPage />, true, ['ADMIN', 'OWNER']),
      },
      // Attendance routes (Admin/Owner)
      {
        path: 'attendance',
        element: createProtectedRoute(<AttendancePage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'attendance/mark',
        element: createProtectedRoute(<AttendanceMarkPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'attendance/coach',
        element: createProtectedRoute(<CoachAttendancePage />, true, ['ADMIN', 'OWNER']),
      },
      // Finance routes (Admin/Owner)
      {
        path: 'finance/items',
        element: createProtectedRoute(<ItemsPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'finance/invoices',
        element: createProtectedRoute(<InvoicesListPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'finance/invoices/new',
        element: createProtectedRoute(<InvoiceCreatePage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'finance/invoices/:id',
        element: createProtectedRoute(<InvoiceDetailPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'finance/receipts',
        element: createProtectedRoute(<ReceiptsListPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'finance/receipts/new',
        element: createProtectedRoute(<ReceiptCreatePage />, true, ['ADMIN', 'OWNER']),
      },
      // Settings routes (Admin/Owner)
      {
        path: 'settings/academy',
        element: createProtectedRoute(<AcademySettingsPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'settings/locations',
        element: createProtectedRoute(<LocationsPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'settings/sports',
        element: createProtectedRoute(<SportsPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'settings/age-categories',
        element: createProtectedRoute(<AgeCategoriesPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'settings/terms',
        element: createProtectedRoute(<TermsPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'settings/pricing',
        element: createProtectedRoute(<PricingPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'settings/bulk-actions',
        element: createProtectedRoute(<BulkActionsPage />, true, ['ADMIN', 'OWNER']),
      },
      // Media route (Admin/Owner)
      {
        path: 'media',
        element: createProtectedRoute(<MediaPage />, true, ['ADMIN', 'OWNER']),
      },
      // Reports route (Admin/Owner)
      {
        path: 'reports',
        element: createProtectedRoute(<ReportsPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'management/finance',
        element: createProtectedRoute(<FinanceOverviewPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'management/facilities',
        element: createProtectedRoute(<FacilitiesPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'management/staff',
        element: createProtectedRoute(<StaffPage />, true, ['ADMIN', 'OWNER']),
      },
      // Complaints route (Admin/Owner)
      {
        path: 'feedback',
        element: createProtectedRoute(<FeedbackPage />, true, ['ADMIN', 'OWNER']),
      },
      // Users routes (Admin/Owner)
      {
        path: 'users',
        element: createProtectedRoute(<UsersPage />, true, ['ADMIN', 'OWNER']),
      },
      {
        path: 'users/:id',
        element: createProtectedRoute(<UserDetailPage />, true, ['ADMIN', 'OWNER']),
      },
      // Coach routes
      {
        path: 'coach/overview',
        element: createProtectedRoute(<CoachOverviewPage />, true, ['COACH']),
      },
      {
        path: 'coach/classes',
        element: createProtectedRoute(<CoachClassesPage />, true, ['COACH']),
      },
      {
        path: 'coach/classes/:id',
        element: createProtectedRoute(<CoachClassDetailPage />, true, ['COACH']),
      },
      {
        path: 'coach/attendance',
        element: createProtectedRoute(<CoachAttendancePage />, true, ['COACH']),
      },
      {
        path: 'coach/attendance/mark',
        element: createProtectedRoute(<CoachAttendanceMarkPage />, true, ['COACH']),
      },
      {
        path: 'coach/media',
        element: createProtectedRoute(<CoachMediaPage />, true, ['COACH']),
      },
      // Parent routes
      {
        path: 'parent/overview',
        element: createProtectedRoute(<ParentOverviewPage />, true, ['PARENT']),
      },
      {
        path: 'parent/children',
        element: createProtectedRoute(<ParentChildrenPage />, true, ['PARENT']),
      },
      {
        path: 'parent/attendance',
        element: createProtectedRoute(<ParentAttendancePage />, true, ['PARENT']),
      },
      {
        path: 'parent/invoices',
        element: createProtectedRoute(<ParentInvoicesPage />, true, ['PARENT']),
      },
      {
        path: 'parent/invoices/:id',
        element: createProtectedRoute(<ParentInvoiceDetailPage />, true, ['PARENT']),
      },
      {
        path: 'parent/media',
        element: createProtectedRoute(<ParentMediaPage />, true, ['PARENT']),
      },
      {
        path: 'parent/feedback',
        element: createProtectedRoute(<FeedbackPage />, true, ['PARENT']),
      },
    ],
  },
  // 404 route
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">404 Not Found</h1>
          <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        </div>
      </div>
    ),
  },
]);
