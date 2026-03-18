# System Architecture

## Overview

This project is a multi-tenant SaaS platform for sports academies. The system is split into a platform layer for SUPERADMIN operations and a tenant layer for academy-scoped operations. The current implementation includes platform finance management for payment ledgering, operational expense tracking, financial summaries, CSV export, and a stubbed Xero sync task.

## Core Principles

- Platform and tenant responsibilities stay separate.
- Tenant data is scoped by academy and enforced in backend permissions, middleware, and queryset filtering.
- SUPERADMIN-only platform features live under `/api/v1/platform/*` and `/dashboard/platform/*`.
- Shared services and permissions are reused by both layers, but do not own domain rules.
- Documentation should describe implemented behavior first and planned enhancements second.

## Backend Structure

The backend uses Django and DRF under `backend/`.

```text
backend/
|-- config/                    # Django project settings and root URL wiring
|-- saas_platform/             # Platform-layer apps (SUPERADMIN scope)
|   |-- tenants/               # Academy lifecycle management
|   |-- subscriptions/         # Plans, subscriptions, platform payments
|   |-- finance/               # Operational expenses, finance service, export, sync
|   |-- masters/              # Currency and Timezone master data (CRUD)
|   |-- analytics/             # Platform-wide analytics
|   `-- audit/                 # Audit logs and error tracking
|-- tenant/                    # Academy-scoped apps
|   |-- onboarding/
|   |-- overview/
|   |-- students/
|   |-- coaches/
|   |-- classes/
|   |-- attendance/
|   |-- billing/
|   |-- facilities/
|   |-- media/
|   |-- masters/
|   |-- reports/
|   |-- communication/
|   `-- users/
`-- shared/                    # Shared middleware, permissions, utilities
```

### Platform app responsibilities

#### `saas_platform.tenants`

- Owns the `Academy` model and academy CRUD APIs.
- Feeds platform management pages and academy switching flows.

#### `saas_platform.subscriptions`

- Owns `Plan`, `Subscription`, `PaymentMethod`, and `PlatformPayment`.
- Exposes plan management endpoints and payment ledger CRUD endpoints.
- Keeps `PlatformPayment.subscription` and `PlatformPayment.academy` on `PROTECT` so payment history survives subscription updates and cannot be cascaded away.

#### `saas_platform.masters`

- Owns `Currency`, `Timezone`, and `Country` models as the single source of truth for platform and tenant.
- Exposes:
  - `/api/v1/platform/masters/currencies/` and `/api/v1/platform/masters/timezones/`: full CRUD (SUPERADMIN only).
  - `/api/v1/platform/masters/countries/`: **global master** — list and retrieve are readable by any authenticated user; create/update/delete require SUPERADMIN.
- Tenant masters endpoints (`/api/v1/tenant/masters/currencies/`, `/api/v1/tenant/masters/timezones/`, `/api/v1/tenant/masters/countries/`) read only active records from these models; academy and onboarding validation use them (including country alpha-3 codes).

#### `saas_platform.finance`

- Owns `OperationalExpense`, `FinanceService`, finance summary/trend APIs, payment export, and the Xero sync task stub.
- Computes MRR, ARR, churn, revenue, expenses, P&L, expense breakdown, and monthly trend snapshots.
- Exposes:
  - `GET /api/v1/platform/finance/summary/`
  - `GET /api/v1/platform/finance/trends/`
  - CRUD `/api/v1/platform/finance/expenses/`
  - `GET /api/v1/platform/finance/payments/export/`

#### `saas_platform.analytics`

- Aggregates broader platform-wide metrics outside the finance dashboard.

#### `saas_platform.audit`

- Provides audit logs and error reporting for platform operators.

## Finance Architecture

### Data model split

- Subscription billing source of truth:
  - `PlatformPayment` in `saas_platform.subscriptions.models`
- Platform operating cost source of truth:
  - `OperationalExpense` in `saas_platform.finance.models`
- Aggregation source of truth:
  - `FinanceService` in `saas_platform.finance.services`

### Implemented finance flows

#### Payment ledger

- SUPERADMIN manually records payments received from academies.
- Each record stores academy, subscription, amount, currency, method, payment date, invoice reference, notes, external sync reference, and sync timestamp.
- Payment CRUD API is available to SUPERADMIN, but API deletion is intentionally disabled on the viewset.

#### Operational expenses

- SUPERADMIN logs platform costs such as cloud, SaaS, domains, servers, legal, and marketing.
- Expenses support billing cycle, due date, paid date, paid status, and notes.
- Serializer rules enforce positive amounts and `paid_date` / `is_paid` consistency.

#### Summary and trend metrics

- `FinanceService` aggregates current or historical month data from `PlatformPayment` and `OperationalExpense`.
- Current implementation provides:
  - MRR
  - ARR
  - active subscription count
  - churn count
  - monthly revenue
  - monthly paid expenses
  - monthly net P&L
  - expense breakdown by category
  - monthly trend snapshots via `/finance/trends/`

#### Export and sync

- Payments can be exported as CSV for a selected month.
- A Celery task stub (`sync_payments_to_xero`) exists for future Xero automation.
- The task currently stamps `external_ref` and `synced_at` only if a future real Xero client succeeds.

## Root URL Layout

Platform routes are registered in `backend/config/urls.py`:

- `/api/v1/platform/` -> tenants, subscriptions, finance, analytics, audit
- `/api/v1/tenant/` -> academy-scoped tenant apps
- `/api/v1/admin/` -> legacy user management compatibility routes
- `/api/v1/auth/` -> authentication and invite acceptance

## Frontend Structure

The frontend uses React, Vite, TanStack Query, and role-based routing.

```text
frontend/src/
|-- features/
|   |-- platform/
|   |   |-- tenants/
|   |   |-- subscriptions/
|   |   |-- analytics/
|   |   |-- audit/
|   |   `-- finance/          # Finance overview, payments, expenses
|   `-- tenant/
|       |-- onboarding/
|       |-- overview/
|       |-- students/
|       |-- classes/
|       |-- attendance/
|       |-- billing/
|       |-- settings/
|       |-- media/
|       |-- reports/
|       |-- facilities/
|       |-- staff/
|       |-- communication/
|       `-- users/
|-- routes/                   # Route definitions and guards
`-- shared/                   # UI, API client, context, nav, utilities
```

### Platform finance frontend

The SUPERADMIN finance feature lives in `frontend/src/features/platform/finance/` and currently includes:

- `FinancePage`
  - summary cards for MRR, ARR, P&L, active subscriptions, churn
  - month/year selector
  - expense breakdown table
- `PaymentsPage`
  - payment ledger table
  - create and edit dialogs
  - date range filters
  - monthly CSV export
- `ExpensesPage`
  - expense log table
  - category, billing cycle, and paid-status filters
  - create/edit dialogs
  - inline "Mark as Paid"

The backend trend endpoint exists, but the current `FinancePage` does not render trend charts yet.

## Route and Navigation Model

### Platform frontend routes

- `/dashboard/platform/academies`
- `/dashboard/platform/plans`
- `/dashboard/platform/stats`
- `/dashboard/platform/errors`
- `/dashboard/platform/audit-logs`
- `/dashboard/platform/finance`
- `/dashboard/platform/finance/payments`
- `/dashboard/platform/finance/expenses`

All platform finance routes are wrapped with `createProtectedRoute(..., ['SUPERADMIN'])`.

### Platform navigation groups

The SUPERADMIN sidebar currently has three groups:

- Platform Management
- Analytics & Audit
- Finance

## Tenant Isolation

Tenant apps remain academy-scoped:

- tenant requests derive academy context from JWT and optional academy header support
- queryset filtering and permissions prevent cross-academy leakage
- onboarding guards protect tenant modules until setup completes
- SUPERADMIN can access platform modules globally, but tenant logic remains separate from platform finance and subscription bookkeeping

## Deployment Notes

- Backend: Django + DRF + PostgreSQL + Redis + Celery
- Frontend: React + Vite
- Storage: S3-compatible storage (MinIO in local development)
- Finance export is synchronous HTTP CSV generation
- Xero sync is asynchronous Celery infrastructure with a stub client today

## Documentation References

- `docs/PROJECT_DOCUMENTATION.md`
- `docs/MODELS.md`
- `docs/ROLE_ROUTE_MAP.md`
- `docs/NAVIGATION_MAP.md`
- `docs/NAVIGATION_COVERAGE.md`
- `docs/XERO_SYNC.md`
