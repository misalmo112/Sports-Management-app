# Sports Academy Management System - Project Documentation

Version: 1.1
Last Updated: 2026-03-17

## 1. Scope and Goals

Goal: provide a multi-tenant SaaS platform where a SUPERADMIN manages the platform globally while each academy operates in isolated tenant space for onboarding, operations, billing, media, and reporting.

In scope today:

- Multi-tenant backend with strict academy isolation.
- Role-based access control for SUPERADMIN, OWNER, ADMIN, COACH, and PARENT.
- Platform management for academies, plans, analytics, audit, and finance.
- Tenant modules for onboarding, users, students, classes, attendance, billing, settings, media, reports, facilities, staff, and feedback.
- Platform finance ledgering, expense logging, summary metrics, monthly export, and Xero sync stub.
- React frontend with role-based routing and shared component foundation.

Out of scope today:

- External payment gateway automation for academy subscription collection.
- Real Xero OAuth2 and invoice push implementation.
- Native mobile clients.

## 2. Core Principles

- Platform and tenant logic must not mix.
- Tenant APIs require academy context and role checks.
- UI role guards complement backend permissions; they do not replace them.
- Onboarding remains a gate for tenant operations.
- Platform finance numbers are derived from platform payments and operational expenses, not hardcoded values.
- Environment variables remain the configuration contract.

## 3. Roles and Authority

- `SUPERADMIN`: global platform operator.
- `OWNER`: multi-academy business owner with academy switching.
- `ADMIN`: single-academy operator.
- `COACH`: assigned-class operations.
- `PARENT`: own-children visibility and self-service flows.

Authority rules:

- Only `SUPERADMIN` accesses `/api/v1/platform/*` and `/dashboard/platform/*`.
- Tenant routes are guarded by auth, onboarding, and role checks where applicable.
- Platform finance APIs are `IsPlatformAdmin` only.

## 4. Current Architecture Summary

Backend:

- Django + DRF
- PostgreSQL
- Redis
- Celery
- S3-compatible media storage

Frontend:

- React + Vite
- TanStack Query
- Shared route guards and sidebar navigation

API base paths:

- Platform APIs: `/api/v1/platform/*`
- Tenant APIs: `/api/v1/tenant/*`
- Legacy admin user APIs: `/api/v1/admin/*`
- Auth APIs: `/api/v1/auth/*`

## 5. Module Logic

### 5.1 Platform Layer

#### `saas_platform.tenants`

- Academy lifecycle management.
- SUPERADMIN academy CRUD and academy settings management.

#### `saas_platform.subscriptions`

- Plan catalog and subscription lifecycle.
- Platform payment ledger through `PlatformPayment`.
- Payment validation for positive amounts, non-future dates, and academy/subscription consistency.

#### `saas_platform.finance`

- `OperationalExpense` tracking for platform costs.
- `FinanceService` aggregation for MRR, ARR, churn, revenue, expenses, P&L, and category breakdown.
- Monthly payment CSV export.
- Xero sync task stub with `external_ref` and `synced_at` support.

#### `saas_platform.analytics`

- Platform-wide analytics outside the finance dashboard.

#### `saas_platform.audit`

- Audit logs and error monitoring pages/APIs.

### 5.2 Tenant Layer

Implemented tenant domains in the repo:

- onboarding
- overview
- users
- students
- coaches
- classes
- attendance
- billing
- facilities
- media
- masters
- reports
- communication

### 5.3 Shared Layer

- middleware for tenant context and onboarding behavior
- permission classes for platform and tenant access
- shared utilities and services reused across modules

### 5.4 Frontend

Platform pages implemented today:

- Academies
- Plans
- Statistics
- Errors
- Audit Logs
- Finance Overview
- Payments
- Expenses

Tenant pages implemented today cover overview, onboarding, operations, billing, settings, management, coach, and parent flows.

## 6. Finance Architecture Snapshot

### Data sources

- Revenue ledger: `PlatformPayment`
- Expense ledger: `OperationalExpense`
- Aggregation service: `FinanceService`

### Implemented APIs

- `GET /api/v1/platform/finance/summary/`
- `GET /api/v1/platform/finance/trends/`
- CRUD `/api/v1/platform/finance/payments/`
- CRUD `/api/v1/platform/finance/expenses/`
- `GET /api/v1/platform/finance/payments/export/`

### Implemented frontend routes

- `/dashboard/platform/finance`
- `/dashboard/platform/finance/payments`
- `/dashboard/platform/finance/expenses`

### Current UI behavior

- Finance overview renders summary cards and expense breakdown for a selected month.
- Payments page supports ledger viewing, create/edit, date filtering, and CSV export.
- Expenses page supports filtering, create/edit, and inline mark-as-paid actions.
- The backend trend endpoint exists, but trend charts are not yet rendered on the current finance overview page.
- The payments API supports academy filtering, but the current page UI only exposes date range filters.

## 7. Current Repository State

Implemented and documented in code:

- Platform finance backend models, serializers, views, URLs, tests, and Celery stub.
- Platform finance frontend pages, hooks, services, types, and SUPERADMIN navigation.
- Role-based route wiring across platform and tenant sections.
- Supporting docs for permissions, environment contract, Xero sync, and route/navigation references.

Current documentation gap fixed by this pass:

- older docs described a pre-finance architecture or omitted finance routes from navigation and route maps
- some route reference docs lagged behind the current router and sidebar configuration

## 8. Open Follow-Up Items

- Implement a real Xero client and OAuth2 flow if accounting sync is required.
- Surface the existing trend endpoint in the finance overview page when charting is added.
- Add academy filter controls to the payments page if SUPERADMIN needs that workflow in the UI.

## 9. References

- `docs/ARCHITECTURE.md`
- `docs/MODELS.md`
- `docs/ROLE_ROUTE_MAP.md`
- `docs/NAVIGATION_MAP.md`
- `docs/NAVIGATION_COVERAGE.md`
- `docs/PERMISSIONS.md`
- `docs/DOCUMENTATION_MAINTENANCE.md`
- `docs/ENV_CONTRACT.md`
- `docs/XERO_SYNC.md`
