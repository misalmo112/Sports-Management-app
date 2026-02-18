# ROLE_ROUTE_MAP (Aligned to Current Repo)
Sports Academy Management System (SaaS)

Dashboard base: `/dashboard`
API base: `${VITE_API_BASE_URL}` (e.g., `/api/v1`)
Tenant context: `X-Academy-ID` header is supported but optional (JWT academy_id is also accepted)

## Global Guards
- RequireAuth: all `/dashboard/*`
- RequireOnboardingComplete: all tenant modules except onboarding routes
- RequireRole: route-group specific (platform/owner/admin/coach/parent)

## Tenant Context Precedence
- X-Academy-ID header: Owner and Superadmin only (academy switching)
- JWT academy_id: Admin/Coach/Parent (single-tenant)
- If neither is present: 400 "academy context required"

Status legend: DONE | IN PROGRESS | BLOCKED | TODO

---

## 1) Superadmin (Platform)

Notes:
- Backend wires `/api/v1/platform/academies/*` (fully implemented).
- Plans, stats, errors, and audit endpoints are fully wired and functional.

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| SUPERADMIN | /dashboard/platform/academies | features/platform/tenants/pages/AcademyListPage | GET `/platform/academies/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/new | features/platform/tenants/pages/AcademyCreatePage | POST `/platform/academies/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/:id | features/platform/tenants/pages/AcademyDetailPage | GET `/platform/academies/:id/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/:id/plan | features/platform/tenants/pages/AcademyPlanPage | PATCH `/platform/academies/:id/plan` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/academies/:id/quota | features/platform/tenants/pages/AcademyQuotaPage | PATCH `/platform/academies/:id/quota` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/plans | features/platform/subscriptions/pages/PlansListPage | GET `/platform/plans/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/plans/new | features/platform/subscriptions/pages/PlanCreatePage | POST `/platform/plans/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/plans/:id | features/platform/subscriptions/pages/PlanDetailPage | GET `/platform/plans/:id/`, PATCH `/platform/plans/:id/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/stats | features/platform/analytics/pages/StatsPage | GET `/platform/stats/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/errors | features/platform/audit/pages/ErrorsPage | GET `/platform/errors/` | Auth + Role(SUPERADMIN) | DONE |
| SUPERADMIN | /dashboard/platform/audit-logs | features/platform/audit/pages/AuditLogsPage | GET `/platform/audit-logs/` | Auth + Role(SUPERADMIN) | DONE |

---

## 2) Owner (Multi-academy)

Notes:
- Owner uses tenant endpoints after selecting an academy (Role(OWNER) permitted).
- Select Academy page allows owners to switch between their academies using X-Academy-ID header.

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| OWNER | /dashboard/owner/overview | features/tenant/overview/pages/OwnerOverviewPage | GET `/tenant/overview/` | Auth + Role(OWNER) | DONE |
| OWNER | /dashboard/select-academy | features/tenant/pages/SelectAcademyPage | GET `/platform/academies/` (filtered by owner) | Auth + Role(OWNER) | DONE |

---

## 3) Admin (Tenant Operations)

All tenant operations use `/api/v1/tenant/*` endpoints. Permissions filter by role.

### Admin Overview
| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/admin/overview | features/tenant/overview/pages/AdminOverviewPage | GET `/tenant/overview/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Students
| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/students | features/tenant/students/pages/StudentsListPage | GET `/tenant/students/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/students/new | features/tenant/students/pages/StudentCreatePage | POST `/tenant/students/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/students/:id | features/tenant/students/pages/StudentDetailPage | GET `/tenant/students/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/students/:id/edit | features/tenant/students/pages/StudentEditPage | PATCH `/tenant/students/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Classes + Enrollment
| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/classes | features/tenant/classes/pages/ClassesListPage | GET `/tenant/classes/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/classes/new | features/tenant/classes/pages/ClassCreatePage | POST `/tenant/classes/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/classes/:id | features/tenant/classes/pages/ClassDetailPage | GET `/tenant/classes/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/classes/:id/edit | features/tenant/classes/pages/ClassEditPage | PATCH `/tenant/classes/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/classes/:id/enrollments | features/tenant/classes/pages/EnrollmentPage | GET `/tenant/classes/:id/enrollments/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/classes/:id/enrollments | Add via modal/inline | POST `/tenant/enrollments/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/classes/:id/enrollments | Delete via action | DELETE `/tenant/enrollments/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Attendance
| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/attendance | features/tenant/attendance/pages/AttendancePage | GET `/tenant/attendance/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/attendance/mark | features/tenant/attendance/pages/AttendanceMarkPage | POST `/tenant/attendance/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/attendance/coach | features/tenant/attendance/pages/CoachAttendancePage | GET `/tenant/coach-attendance/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### User Management (Invites)
Notes:
- Single invite endpoint with role in payload: POST `/admin/users/` with role "ADMIN" | "COACH" | "PARENT".
- Accept invite via query param: `/accept-invite?token=...` (avoid path tokens).
| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/users | features/tenant/users/pages/UsersPage | GET `/admin/users/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/users | Invite modals in UsersPage | POST `/admin/users/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/users/:id | features/tenant/users/pages/UserDetailPage | PATCH `/admin/users/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| PUBLIC | /accept-invite | features/tenant/users/pages/AcceptInvitePage | POST `/auth/invite/accept/` | Public | DONE |

### Finance
| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/finance/items | features/tenant/billing/pages/ItemsPage | GET `/tenant/items/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/finance/invoices | features/tenant/billing/pages/InvoicesListPage | GET `/tenant/invoices/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/finance/invoices/new | features/tenant/billing/pages/InvoiceCreatePage | POST `/tenant/invoices/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/finance/invoices/:id | features/tenant/billing/pages/InvoiceDetailPage | GET `/tenant/invoices/:id/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/finance/receipts | features/tenant/billing/pages/ReceiptsListPage | GET `/tenant/receipts/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/finance/receipts/new | features/tenant/billing/pages/ReceiptCreatePage | POST `/tenant/receipts/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Settings (Tenant reference data)
Notes:
- Settings use onboarding upsert endpoints (POST `/tenant/onboarding/step/{n}/`).
- Phase 6 cleanup: introduce CRUD endpoints (GET/POST `/tenant/locations/`, PATCH/DELETE `/tenant/locations/:id/`, etc.).

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/settings/locations | features/tenant/onboarding/pages/LocationsPage | POST `/tenant/onboarding/step/2/` (upsert) | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/settings/sports | features/tenant/onboarding/pages/SportsPage | POST `/tenant/onboarding/step/3/` (upsert) | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/settings/age-categories | features/tenant/onboarding/pages/AgeCategoriesPage | POST `/tenant/onboarding/step/4/` (upsert) | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/settings/terms | features/tenant/onboarding/pages/TermsPage | POST `/tenant/onboarding/step/5/` (upsert) | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/settings/pricing | features/tenant/onboarding/pages/PricingPage | POST `/tenant/onboarding/step/6/` (upsert) | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

### Reports & Media
| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| ADMIN | /dashboard/reports | features/tenant/reports/pages/ReportsPage | GET `/tenant/reports/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |
| ADMIN | /dashboard/media | features/tenant/media/pages/MediaPage | GET `/tenant/media/`, POST `/tenant/media/` | Auth + Onboarding + Role(ADMIN,OWNER) | DONE |

---

## 4) Coach

Coach uses tenant endpoints with role filtering.

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| COACH | /dashboard/coach/overview | features/tenant/overview/pages/CoachOverviewPage | GET `/tenant/overview/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/classes | features/tenant/classes/pages/CoachClassesPage | GET `/tenant/classes/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/classes/:id | features/tenant/classes/pages/CoachClassDetailPage | GET `/tenant/classes/:id/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/attendance | features/tenant/attendance/pages/CoachAttendancePage | GET `/tenant/coach-attendance/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/attendance/mark | features/tenant/attendance/pages/CoachAttendanceMarkPage | POST `/tenant/attendance/` | Auth + Onboarding + Role(COACH) | DONE |
| COACH | /dashboard/coach/media | features/tenant/media/pages/CoachMediaPage | GET `/tenant/media/`, POST `/tenant/media/` | Auth + Onboarding + Role(COACH) | DONE |

---

## 5) Parent

Parent uses tenant endpoints with role filtering.

| Role | Route | Page Component | Backend Endpoint(s) | Guards/Permission | Status |
|---|---|---|---|---|---|
| PARENT | /dashboard/parent/overview | features/tenant/overview/pages/ParentOverviewPage | GET `/tenant/overview/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/children | features/tenant/students/pages/ParentChildrenPage | GET `/tenant/students/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/attendance | features/tenant/attendance/pages/ParentAttendancePage | GET `/tenant/attendance/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/invoices | features/tenant/billing/pages/ParentInvoicesPage | GET `/tenant/invoices/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/invoices/:id | features/tenant/billing/pages/ParentInvoiceDetailPage | GET `/tenant/invoices/:id/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/media | features/tenant/media/pages/ParentMediaPage | GET `/tenant/media/` | Auth + Onboarding + Role(PARENT) | DONE |
| PARENT | /dashboard/parent/complaints | features/tenant/communication/pages/ComplaintsPage | POST `/tenant/complaints/` | Auth + Onboarding + Role(PARENT) | DONE |

---

## Overview Endpoint Contract (Proposed)

Endpoint:
- GET `/api/v1/tenant/overview/`

Response shape (superset, UI filters by role):
```json
{
  "role": "ADMIN",
  "today_classes": [],
  "attendance_summary": {
    "present": 0,
    "absent": 0
  },
  "finance_summary": {
    "unpaid_invoices": 0,
    "overdue_invoices": 0,
    "total_due": 0
  },
  "alerts": []
}
```

---

## Current Frontend Routes (Implemented)

- `/onboarding`
- `/dashboard`
- `/accept-invite` (uses query param: `/accept-invite?token=...`)
- All tenant routes (students, classes, attendance, billing, media, users, settings)
- All coach routes (overview, classes, attendance, media)
- All parent routes (overview, children, attendance, invoices, media, complaints)

---

## Wiring Notes

1. Tenant routes use `/api/v1/tenant/*` (not `/admin/*`) for domain data; `/api/v1/admin/*` is user management only.
2. `X-Academy-ID` header is supported by middleware; precedence rules above apply.
3. Role separation is enforced by permission classes, not URL prefix.
4. Overview and reporting endpoints are fully wired and functional.
5. Parent Children uses GET `/tenant/students/` with backend filtering to parent-owned students.
6. Attendance marking uses POST `/tenant/attendance/` for Admin and Coach with role-based filtering.
7. Enrollments endpoint: GET `/tenant/classes/:id/enrollments/` (nested under classes).
8. Accept invite route uses query parameter: `/accept-invite?token=...` (implemented).
9. Most tenant CRUD operations (students, classes, attendance, billing, media, users) are fully wired and functional.