/**
 * Application routes
 */
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';

/** Old emails / API used /auth/invite/accept; SPA route is /accept-invite. */
function LegacyInviteAcceptRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/accept-invite${search}`} replace />;
}
import { RequireAuth } from '@/shared/components/common/RequireAuth';
import { RequireOnboardingComplete } from '@/shared/components/common/RequireOnboardingComplete';
import { RequireOnboardingIncomplete } from '@/shared/components/common/RequireOnboardingIncomplete';
import { RequireRole } from '@/shared/components/common/RequireRole';
import { RequireModule } from '@/shared/components/common/RequireModule';
import { ModuleAccessDeniedPage } from '@/shared/components/common/ModuleAccessDeniedPage';
import { DashboardHomeRedirect } from '@/shared/components/common/DashboardHomeRedirect';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import type { UserRole } from '@/shared/utils/roleAccess';
import { Skeleton } from '@/shared/components/ui/skeleton';

// Public pages
import OnboardingPage from '@/features/tenant/onboarding/pages/OnboardingPage';
import { SetupChecklistPage } from '@/features/tenant/onboarding/pages/SetupChecklistPage';
import { AcceptInvitePage } from '@/features/tenant/users/pages/AcceptInvitePage';
import { LoginPage } from '@/features/tenant/users/pages/LoginPage';
import { ForgotPasswordPage } from '@/features/tenant/users/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/tenant/users/pages/ResetPasswordPage';

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
import { FinancePage } from '@/features/platform/finance/pages/FinancePage';
import { PaymentsPage } from '@/features/platform/finance/pages/PaymentsPage';
import { ExpensesPage } from '@/features/platform/finance/pages/ExpensesPage';
import { CurrenciesListPage } from '@/features/platform/masters/pages/CurrenciesListPage';
import { CurrencyFormPage } from '@/features/platform/masters/pages/CurrencyFormPage';
import { TimezonesListPage } from '@/features/platform/masters/pages/TimezonesListPage';
import { TimezoneFormPage } from '@/features/platform/masters/pages/TimezoneFormPage';

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
import { CoachAttendanceMarkStaffPage } from '@/features/tenant/attendance/pages/CoachAttendanceMarkStaffPage';
import { ItemsPage } from '@/features/tenant/billing/pages/ItemsPage';
import { InvoicesListPage } from '@/features/tenant/billing/pages/InvoicesListPage';
import { InvoiceCreatePage } from '@/features/tenant/billing/pages/InvoiceCreatePage';
import { InvoiceDetailPage } from '@/features/tenant/billing/pages/InvoiceDetailPage';
import { ReceiptsListPage } from '@/features/tenant/billing/pages/ReceiptsListPage';
import { ReceiptCreatePage } from '@/features/tenant/billing/pages/ReceiptCreatePage';
import { ReceiptDetailPage } from '@/features/tenant/billing/pages/ReceiptDetailPage';
import { SettingsHomePage } from '@/features/tenant/settings/pages/SettingsHomePage';
import { AcademySettingsPage } from '@/features/tenant/settings/pages/AcademySettingsPage';
import { TaxSettingsPage } from '@/features/tenant/settings/pages/TaxSettingsPage';
import { AccountSettingsPage } from '@/features/tenant/settings/pages/AccountSettingsPage';
import { SubscriptionSettingsPage } from '@/features/tenant/settings/pages/SubscriptionSettingsPage';
import { UsageSettingsPage } from '@/features/tenant/settings/pages/UsageSettingsPage';
import { LocationsPage } from '@/features/tenant/settings/pages/LocationsPage';
import { SportsPage } from '@/features/tenant/settings/pages/SportsPage';
import { TermsPage } from '@/features/tenant/settings/pages/TermsPage';
import { CurrenciesPage } from '@/features/tenant/settings/pages/CurrenciesPage';
import { TimezonesPage } from '@/features/tenant/settings/pages/TimezonesPage';
import { BulkActionsPage } from '@/features/tenant/settings/pages/BulkActionsPage';
import { MediaPage } from '@/features/tenant/media/pages/MediaPage';
import { ReportsPage } from '@/features/tenant/reports/pages/ReportsPage';
import { FinanceOverviewPage } from '@/features/tenant/finance/pages/FinanceOverviewPage';
import { FacilitiesPage } from '@/features/tenant/facilities/pages/FacilitiesPage';
import { StaffPage } from '@/features/tenant/staff/pages/StaffPage';
import { CoachDetailPage } from '@/features/tenant/staff/pages/CoachDetailPage';
import { UsersPage } from '@/features/tenant/users/pages/UsersPage';
import { UserDetailPage } from '@/features/tenant/users/pages/UserDetailPage';

// Invoice schedules (IS.5)
import { InvoiceSchedulesPage } from '@/features/tenant/billing/invoice-schedules/pages/InvoiceSchedulesPage';
import { InvoiceScheduleCreatePage } from '@/features/tenant/billing/invoice-schedules/pages/InvoiceScheduleCreatePage';
import { InvoiceScheduleEditPage } from '@/features/tenant/billing/invoice-schedules/pages/InvoiceScheduleEditPage';
import { StaffPaySchedulesPage } from '@/features/tenant/coaches/pay-schedules/pages/StaffPaySchedulesPage';
import { StaffPayScheduleCreatePage } from '@/features/tenant/coaches/pay-schedules/pages/StaffPayScheduleCreatePage';
import { StaffPayScheduleEditPage } from '@/features/tenant/coaches/pay-schedules/pages/StaffPayScheduleEditPage';
import { RentPaySchedulesPage } from '@/features/tenant/facilities/rent-schedules/pages/RentPaySchedulesPage';
import { RentPayScheduleCreatePage } from '@/features/tenant/facilities/rent-schedules/pages/RentPayScheduleCreatePage';
import { RentPayScheduleEditPage } from '@/features/tenant/facilities/rent-schedules/pages/RentPayScheduleEditPage';

// Tenant audit
import { ActivityLogPage } from '@/features/tenant/audit/pages/ActivityLogPage';

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
import { ParentPersonalInfoPage } from '@/features/tenant/parent/pages/ParentPersonalInfoPage';
import { ParentAccountSettingsPage } from '@/features/tenant/parent/pages/ParentAccountSettingsPage';
import { FeedbackPage } from '@/features/tenant/communication/pages/FeedbackPage';
import MediaUploadPage from '@/pages/media/MediaUploadPage';
import MediaGalleryPage from '@/pages/media/MediaGalleryPage';

// Helper function to create protected routes with guards
const PortalRoutes = lazy(() => import('@/routes/PortalRoutes'));

const createProtectedRoute = (
  element: React.ReactElement,
  requireOnboarding: boolean = false,
  allowedRoles?: UserRole[],
  requiredModule?: string | null,
) => {
  let inner = element;

  if (requiredModule) {
    inner = <RequireModule moduleKey={requiredModule}>{inner}</RequireModule>;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    inner = (
      <RequireRole allowedRoles={allowedRoles}>
        {inner}
      </RequireRole>
    );
  }

  if (requireOnboarding) {
    inner = (
      <RequireOnboardingComplete>
        {inner}
      </RequireOnboardingComplete>
    );
  }

  return <RequireAuth>{inner}</RequireAuth>;
};

export const router = createBrowserRouter([
  {
    path: '/portal/*',
    element: (
      <Suspense fallback={<div className="p-6"><Skeleton className="h-40 w-full" /></div>}>
        <PortalRoutes />
      </Suspense>
    ),
  },
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
    path: '/auth/invite/accept',
    element: <LegacyInviteAcceptRedirect />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
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
        element: createProtectedRoute(<DashboardHomeRedirect />),
      },
      {
        path: 'access-denied',
        element: createProtectedRoute(<ModuleAccessDeniedPage />),
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
      {
        path: 'platform/finance',
        element: createProtectedRoute(<FinancePage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/finance/payments',
        element: createProtectedRoute(<PaymentsPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/finance/expenses',
        element: createProtectedRoute(<ExpensesPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/masters/currencies',
        element: createProtectedRoute(<CurrenciesListPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/masters/currencies/new',
        element: createProtectedRoute(<CurrencyFormPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/masters/currencies/:id',
        element: createProtectedRoute(<CurrencyFormPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/masters/timezones',
        element: createProtectedRoute(<TimezonesListPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/masters/timezones/new',
        element: createProtectedRoute(<TimezoneFormPage />, false, ['SUPERADMIN']),
      },
      {
        path: 'platform/masters/timezones/:id',
        element: createProtectedRoute(<TimezoneFormPage />, false, ['SUPERADMIN']),
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
        element: createProtectedRoute(<AdminOverviewPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'admin-overview'),
      },
      {
        path: 'setup',
        element: createProtectedRoute(<SetupChecklistPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'setup'),
      },
      // Students routes (Admin/Owner/STAFF)
      {
        path: 'students',
        element: createProtectedRoute(<StudentsListPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'students'),
      },
      {
        path: 'students/new',
        element: createProtectedRoute(<StudentCreatePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'students'),
      },
      {
        path: 'students/:id',
        element: createProtectedRoute(<StudentDetailPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'students'),
      },
      {
        path: 'students/:id/edit',
        element: createProtectedRoute(<StudentEditPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'students'),
      },
      // Classes routes (Admin/Owner/STAFF)
      {
        path: 'classes',
        element: createProtectedRoute(<ClassesListPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'classes'),
      },
      {
        path: 'classes/new',
        element: createProtectedRoute(<ClassCreatePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'classes'),
      },
      {
        path: 'classes/:id',
        element: createProtectedRoute(<ClassDetailPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'classes'),
      },
      {
        path: 'classes/:id/edit',
        element: createProtectedRoute(<ClassEditPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'classes'),
      },
      {
        path: 'classes/:id/enrollments',
        element: createProtectedRoute(<EnrollmentPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'classes'),
      },
      // Attendance routes (Admin/Owner/STAFF)
      {
        path: 'attendance',
        element: createProtectedRoute(<AttendancePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'attendance'),
      },
      {
        path: 'attendance/mark',
        element: createProtectedRoute(<AttendanceMarkPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'attendance'),
      },
      {
        path: 'attendance/coach/mark',
        element: createProtectedRoute(<CoachAttendanceMarkStaffPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'attendance'),
      },
      {
        path: 'attendance/coach',
        element: createProtectedRoute(<CoachAttendancePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'attendance'),
      },

      // Invoice schedules (Admin/Owner/STAFF)
      {
        path: 'operations/invoice-schedules',
        element: createProtectedRoute(<InvoiceSchedulesPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'invoice-schedules'),
      },
      {
        path: 'operations/invoice-schedules/new',
        element: createProtectedRoute(<InvoiceScheduleCreatePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'invoice-schedules'),
      },
      {
        path: 'operations/invoice-schedules/:id/edit',
        element: createProtectedRoute(<InvoiceScheduleEditPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'invoice-schedules'),
      },
      {
        path: 'operations/rent-schedules',
        element: createProtectedRoute(<RentPaySchedulesPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'facilities'),
      },
      {
        path: 'operations/rent-schedules/new',
        element: createProtectedRoute(<RentPayScheduleCreatePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'facilities'),
      },
      {
        path: 'operations/rent-schedules/:id/edit',
        element: createProtectedRoute(<RentPayScheduleEditPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'facilities'),
      },
      {
        path: 'management/staff/pay-schedules',
        element: createProtectedRoute(<StaffPaySchedulesPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'staff'),
      },
      {
        path: 'management/staff/pay-schedules/create',
        element: createProtectedRoute(<StaffPayScheduleCreatePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'staff'),
      },
      {
        path: 'management/staff/pay-schedules/:id/edit',
        element: createProtectedRoute(<StaffPayScheduleEditPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'staff'),
      },

      // Finance routes (Admin/Owner/STAFF)
      {
        path: 'finance/items',
        element: createProtectedRoute(<ItemsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'finance-items'),
      },
      {
        path: 'finance/invoices',
        element: createProtectedRoute(<InvoicesListPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'invoices'),
      },
      {
        path: 'finance/invoices/new',
        element: createProtectedRoute(<InvoiceCreatePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'invoices'),
      },
      {
        path: 'finance/invoices/:id',
        element: createProtectedRoute(<InvoiceDetailPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'invoices'),
      },
      {
        path: 'finance/receipts',
        element: createProtectedRoute(<ReceiptsListPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'receipts'),
      },
      {
        path: 'finance/receipts/new',
        element: createProtectedRoute(<ReceiptCreatePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'receipts'),
      },
      {
        path: 'finance/receipts/:id',
        element: createProtectedRoute(<ReceiptDetailPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'receipts'),
      },
      // Settings routes (Admin/Owner/STAFF)
      {
        path: 'settings',
        element: createProtectedRoute(<SettingsHomePage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'settings-home'),
      },
      {
        path: 'settings/account',
        element: createProtectedRoute(<AccountSettingsPage />, true, ['ADMIN', 'OWNER', 'STAFF']),
      },
      {
        path: 'settings/organization',
        element: createProtectedRoute(<AcademySettingsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'organization-settings'),
      },
      {
        path: 'settings/tax',
        element: createProtectedRoute(<TaxSettingsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'tax-settings'),
      },
      {
        path: 'settings/academy',
        element: createProtectedRoute(<AcademySettingsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'organization-settings'),
      },
      {
        path: 'settings/subscription',
        element: createProtectedRoute(<SubscriptionSettingsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'academy-settings'),
      },
      {
        path: 'settings/usage',
        element: createProtectedRoute(<UsageSettingsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'usage-settings'),
      },
      {
        path: 'settings/locations',
        element: createProtectedRoute(<LocationsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'locations'),
      },
      {
        path: 'settings/sports',
        element: createProtectedRoute(<SportsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'sports'),
      },
      {
        path: 'settings/terms',
        element: createProtectedRoute(<TermsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'terms'),
      },
      {
        path: 'settings/currencies',
        element: createProtectedRoute(<CurrenciesPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'currencies'),
      },
      {
        path: 'settings/timezones',
        element: createProtectedRoute(<TimezonesPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'timezones'),
      },
      {
        path: 'settings/bulk-actions',
        element: createProtectedRoute(<BulkActionsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'bulk-actions'),
      },
      // Media route (Admin/Owner/STAFF)
      {
        path: 'media',
        element: createProtectedRoute(<MediaPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'media'),
      },
      {
        path: 'academy/media/upload',
        element: createProtectedRoute(<MediaUploadPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'media'),
      },
      {
        path: 'academy/media',
        element: createProtectedRoute(<MediaGalleryPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'media'),
      },
      // Reports route (Admin/Owner/STAFF)
      {
        path: 'reports',
        element: createProtectedRoute(<ReportsPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'reports'),
      },
      {
        path: 'management/finance',
        element: createProtectedRoute(<FinanceOverviewPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'finance-overview'),
      },
      {
        path: 'management/facilities',
        element: createProtectedRoute(<FacilitiesPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'facilities'),
      },
      {
        path: 'management/staff',
        element: createProtectedRoute(<StaffPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'staff'),
      },
      {
        path: 'management/staff/:id',
        element: createProtectedRoute(<CoachDetailPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'staff'),
      },
      // Complaints route (Admin/Owner/STAFF)
      {
        path: 'feedback',
        element: createProtectedRoute(<FeedbackPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'feedback'),
      },
      // Users routes (Admin/Owner/STAFF — STAFF typically lacks users module)
      {
        path: 'users',
        element: createProtectedRoute(<UsersPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'users'),
      },
      {
        path: 'users/:id',
        element: createProtectedRoute(<UserDetailPage />, true, ['ADMIN', 'OWNER', 'STAFF'], 'users'),
      },
      // Activity log (OWNER / ADMIN only)
      {
        path: 'academy/audit',
        element: createProtectedRoute(<ActivityLogPage />, true, ['ADMIN', 'OWNER']),
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
        path: 'parent/profile',
        element: createProtectedRoute(<ParentPersonalInfoPage />, true, ['PARENT']),
      },
      {
        path: 'parent/account',
        element: createProtectedRoute(<ParentAccountSettingsPage />, true, ['PARENT']),
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
