# ROLE_ROUTE_MAP

Sports Academy Management System

Dashboard base: `/dashboard`

API base: `/api/v1`

Status legend: `DONE | IN PROGRESS | BLOCKED | TODO`

## Global Guards

- `RequireAuth`: all `/dashboard/*`
- `RequireOnboardingComplete`: tenant modules that require completed onboarding
- `RequireRole`: route-group specific
- `IsPlatformAdmin`: all platform finance endpoints

## 1. SUPERADMIN (Platform)

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| SUPERADMIN | /dashboard/platform/academies | `AcademyListPage` | GET `/platform/academies/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/new | `AcademyCreatePage` | POST `/platform/academies/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/:id | `AcademyDetailPage` | GET `/platform/academies/:id/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/:id/plan | `AcademyPlanPage` | PATCH `/platform/academies/:id/plan` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/:id/quota | `AcademyQuotaPage` | PATCH `/platform/academies/:id/quota` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/plans | `PlansListPage` | GET `/platform/plans/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/plans/new | `PlanCreatePage` | POST `/platform/plans/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/plans/:id | `PlanDetailPage` | GET `/platform/plans/:id/`, PATCH `/platform/plans/:id/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/stats | `StatsPage` | GET `/platform/stats/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/errors | `ErrorsPage` | GET `/platform/errors/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/audit-logs | `AuditLogsPage` | GET `/platform/audit-logs/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/finance | `FinancePage` | GET `/platform/finance/summary/`, GET `/platform/finance/trends/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/finance/payments | `PaymentsPage` | GET/POST/PATCH `/platform/finance/payments/`, GET `/platform/finance/payments/export/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/finance/expenses | `ExpensesPage` | GET/POST/PATCH/DELETE `/platform/finance/expenses/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/masters/currencies | `CurrenciesListPage` | GET/POST `/platform/masters/currencies/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/masters/currencies/new | `CurrencyFormPage` | POST `/platform/masters/currencies/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/masters/currencies/:id | `CurrencyFormPage` | GET/PATCH/DELETE `/platform/masters/currencies/:id/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/masters/timezones | `TimezonesListPage` | GET/POST `/platform/masters/timezones/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/masters/timezones/new | `TimezoneFormPage` | POST `/platform/masters/timezones/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/masters/timezones/:id | `TimezoneFormPage` | GET/PATCH/DELETE `/platform/masters/timezones/:id/` | Auth + Role(SUPERADMIN) | DONE |

Notes:

- Payment delete is disabled by the API viewset even though the model is fully managed in admin/database space.
- Finance overview currently consumes the summary endpoint; the trend endpoint exists but is not yet rendered by the page.

## 2. OWNER

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| OWNER | /dashboard/owner/overview | `OwnerOverviewPage` | GET `/tenant/overview/` | Auth + Onboarding + Role(OWNER) | DONE |
| OWNER | /dashboard/select-academy | `SelectAcademyPage` | GET `/platform/academies/` | Auth + Role(OWNER) | DONE |

Notes:

- OWNER also inherits the full ADMIN route set.
- Academy switching uses academy context support on tenant APIs.

## 3. ADMIN / OWNER (Tenant Operations)

### Overview

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN, OWNER | /dashboard/admin/overview | `AdminOverviewPage` | GET `/tenant/overview/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Students

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN, OWNER | /dashboard/students | `StudentsListPage` | GET `/tenant/students/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/students/new | `StudentCreatePage` | POST `/tenant/students/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/students/:id | `StudentDetailPage` | GET `/tenant/students/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/students/:id/edit | `StudentEditPage` | PATCH `/tenant/students/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Classes and Attendance

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN, OWNER | /dashboard/classes | `ClassesListPage` | GET `/tenant/classes/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/classes/new | `ClassCreatePage` | POST `/tenant/classes/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/classes/:id | `ClassDetailPage` | GET `/tenant/classes/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/classes/:id/edit | `ClassEditPage` | PATCH `/tenant/classes/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/classes/:id/enrollments | `EnrollmentPage` | GET `/tenant/classes/:id/enrollments/`, POST/DELETE `/tenant/enrollments/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/attendance | `AttendancePage` | GET `/tenant/attendance/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/attendance/mark | `AttendanceMarkPage` | POST `/tenant/attendance/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/attendance/coach | `CoachAttendancePage` | GET `/tenant/coach-attendance/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Tenant Finance

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN, OWNER | /dashboard/finance/items | `ItemsPage` | GET `/tenant/items/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/finance/invoices | `InvoicesListPage` | GET `/tenant/invoices/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/finance/invoices/new | `InvoiceCreatePage` | POST `/tenant/invoices/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/finance/invoices/:id | `InvoiceDetailPage` | GET `/tenant/invoices/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/finance/receipts | `ReceiptsListPage` | GET `/tenant/receipts/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/finance/receipts/new | `ReceiptCreatePage` | POST `/tenant/receipts/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Settings and Management

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN, OWNER | /dashboard/settings | `SettingsHomePage` | Tenant settings entrypoint | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/account | `AccountSettingsPage` | Account settings APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/organization | `AcademySettingsPage` | Academy settings APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/academy | `AcademySettingsPage` | Academy settings APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/subscription | `SubscriptionSettingsPage` | Subscription/usage APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/usage | `UsageSettingsPage` | Usage/quota APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/locations | `LocationsPage` | Settings data APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/sports | `SportsPage` | Settings data APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/age-categories | `AgeCategoriesPage` | Settings data APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/terms | `TermsPage` | Settings data APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/currencies | `CurrenciesPage` | GET `/tenant/masters/currencies/` (view only) | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/timezones | `TimezonesPage` | GET `/tenant/masters/timezones/` (view only) | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/pricing | `PricingPage` | Settings/pricing APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/settings/bulk-actions | `BulkActionsPage` | Bulk operation APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/media | `MediaPage` | GET/POST `/tenant/media/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/reports | `ReportsPage` | GET `/tenant/reports/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/management/finance | `FinanceOverviewPage` | Tenant finance overview APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/management/facilities | `FacilitiesPage` | Facilities APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/management/staff | `StaffPage` | Staff APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/feedback | `FeedbackPage` | Feedback/communication APIs | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/users | `UsersPage` | GET/POST `/tenant/users/` and compatibility user endpoints | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN, OWNER | /dashboard/users/:id | `UserDetailPage` | PATCH `/tenant/users/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

## 4. COACH

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| COACH | /dashboard/coach/overview | `CoachOverviewPage` | GET `/tenant/overview/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/classes | `CoachClassesPage` | GET `/tenant/classes/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/classes/:id | `CoachClassDetailPage` | GET `/tenant/classes/:id/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/attendance | `CoachAttendancePage` | GET `/tenant/coach-attendance/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/attendance/mark | `CoachAttendanceMarkPage` | POST `/tenant/attendance/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/media | `CoachMediaPage` | GET/POST `/tenant/media/` | Auth + Onboarding + Role(COACH) | DONE |

## 5. PARENT

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| PARENT | /dashboard/parent/overview | `ParentOverviewPage` | GET `/tenant/overview/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/children | `ParentChildrenPage` | GET `/tenant/students/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/attendance | `ParentAttendancePage` | GET `/tenant/attendance/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/invoices | `ParentInvoicesPage` | GET `/tenant/invoices/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/invoices/:id | `ParentInvoiceDetailPage` | GET `/tenant/invoices/:id/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/media | `ParentMediaPage` | GET `/tenant/media/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/feedback | `FeedbackPage` | Feedback/communication APIs | Auth + Onboarding + Role(PARENT) | DONE |

## Notes

- Route references are aligned to the current router and navigation config.
- Platform finance is fully SUPERADMIN-scoped in both backend and frontend routing.
- Some backend endpoint labels remain generalized where the page coordinates multiple tenant APIs internally.
