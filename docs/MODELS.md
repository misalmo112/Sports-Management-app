# Platform Layer Models

## Overview

This document summarizes the current platform-layer data model in the repo. These models live under `backend/saas_platform/` and support academy management, subscription management, platform finance, and related platform reporting.

Platform models must not contain tenant business logic. Tenant domain data remains in `backend/tenant/`.

## Core Platform Models

### Academy

Purpose:

- root tenant entity for the SaaS platform
- links platform concerns to academy-scoped tenant data

Key characteristics:

- UUID primary key
- academy identity, contact, address, status, and onboarding fields
- referenced by subscriptions, usage, and platform payments

Primary relationships:

- one academy -> many subscriptions
- one academy -> many platform payments
- one academy -> one usage record

Academy export and delete:

- Platform admins can download a full backup of an academy’s data (platform + tenant) via `GET /api/v1/platform/academies/{id}/export/`. The response is a ZIP of JSON files. Use this before deleting an academy.
- Academy delete is allowed even when the academy has platform payments; those payments have `academy_id` set to NULL (see PlatformPayment).

### Plan

Purpose:

- defines commercial subscription tiers

Key fields:

- `name`, `slug`, `description`
- `price_monthly`, `price_yearly`, `currency`
- `trial_days`
- `limits_json`
- `seat_based_pricing`
- `is_active`, `is_public`

Key notes:

- `limits_json` stores default quota limits
- plans are protected from destructive changes when referenced by subscriptions

### Subscription

Purpose:

- historical link between an academy and a plan

Key fields:

- `academy` -> FK to `Academy`
- `plan` -> FK to `Plan`
- `status`
- `is_current`
- `start_at`, `end_at`, `trial_ends_at`
- `overrides_json`
- `canceled_at`, `suspended_at`, `cancel_reason`

Key constraints:

- only one `is_current=True` subscription per academy
- indexed for academy/current, status/current, and billing-window queries

Status enum:

- `TRIAL`
- `ACTIVE`
- `PAST_DUE`
- `CANCELED`
- `SUSPENDED`
- `EXPIRED`

## Platform Masters Models

### Currency

- Module: `saas_platform.masters.models`
- Purpose: single source of truth for platform-wide currencies.
- Key fields:
  - `code` (3-letter ISO code, primary identifier)
  - `name` (display label)
  - `is_active`, `sort_order`, timestamps
- Used by:
  - `Academy.currency`
  - `Plan.currency`
  - Finance calculations and exports.

### Timezone

- Module: `saas_platform.masters.models`
- Purpose: single source of truth for time zone identifiers used by academies and the platform.
- Key fields:
  - `code` (IANA identifier, e.g. `Asia/Dubai`)
  - `name` (optional display label)
  - `is_active`, `sort_order`, timestamps
- Used by:
  - `Academy.timezone`
  - Onboarding and tenant validation.

### Country

- Module: `saas_platform.masters.models`
- Purpose: global country master using ISO 3166-1 alpha-3 codes.
- Key fields:
  - `code` (3-letter ISO alpha-3 country code, e.g. `ARE`, `USA`)
  - `name` (country name, e.g. `United Arab Emirates`)
  - `phone_code` (optional dialing code, e.g. `+971`)
  - `region` (optional region label, e.g. `Middle East`)
  - `is_active`, `sort_order`, timestamps
- API: list and retrieve are readable by any authenticated user (global master); create/update/delete require SUPERADMIN.
- Behavior and conventions:
  - `Academy.country` and onboarding profile `country` fields are treated as alpha-3 codes and validated against this master.
  - Deletion is blocked while any academy uses the code; records should be deactivated instead.

## Platform Finance Models

### PaymentMethod

`PlatformPayment.payment_method` uses these choices:

- `BANK_TRANSFER`
- `CREDIT_CARD`
- `CASH`
- `CHEQUE`
- `OTHER`

### PlatformPayment

Module:

- `saas_platform.subscriptions.models`

Purpose:

- manual ledger entry for subscription payments received from academies

Fields:

- `subscription` -> FK to `Subscription` with `PROTECT`
- `academy` -> denormalized FK to `Academy` with `SET_NULL`, nullable (so academy delete can succeed; payments become orphan and are retained for audit)
- `amount`
- `currency`
- `payment_method`
- `payment_date`
- `invoice_ref`
- `notes`
- `external_ref`
- `synced_at`
- `created_at`
- `updated_at`

Indexes:

- `payment_date`
- `(academy, payment_date)`

Why the denormalized `academy` link exists:

- it gives a stable academy-level ledger even if the academy changes subscription later
- it allows finance queries and export to filter directly by academy

When an academy is deleted, `academy_id` is set to NULL on related `PlatformPayment` rows (SET_NULL). Code that displays payment data (e.g. finance export CSV) should handle `academy` being null for these orphaned payments.

Serializer-level rules:

- `amount` must be greater than zero
- `payment_date` cannot be in the future
- `academy` must match `subscription.academy`
- `external_ref` and `synced_at` are read-only API fields reserved for sync workflows

API behavior:

- SUPERADMIN-only CRUD viewset under `/api/v1/platform/finance/payments/`
- API delete is disabled on the viewset

### OperationalExpense

Module:

- `saas_platform.finance.models`

Purpose:

- structured log of platform operating costs

Fields:

- `category`
- `vendor_name`
- `description`
- `amount`
- `currency`
- `billing_cycle`
- `due_date`
- `paid_date`
- `is_paid`
- `notes`
- `created_at`
- `updated_at`

Category enum:

- `CLOUD`
- `DOMAIN`
- `SERVER`
- `SAAS`
- `LEGAL`
- `MARKETING`
- `OTHER`

Billing cycle enum:

- `ONE_TIME`
- `MONTHLY`
- `YEARLY`

Indexes:

- `(paid_date, is_paid)`
- `(billing_cycle, category)`

Serializer-level rules:

- `amount` must be greater than zero
- `paid_date` requires `is_paid=True`
- `is_paid=True` requires `paid_date`

API behavior:

- SUPERADMIN-only CRUD viewset under `/api/v1/platform/finance/expenses/`

## Service-Level Finance Aggregation

### FinanceService

Module:

- `saas_platform.finance.services`

Purpose:

- aggregation source of truth for platform finance metrics

Current outputs:

- MRR
- ARR
- active subscription count
- churn count
- revenue by month
- expenses by month
- expense breakdown by category
- net P&L
- monthly summaries for trend views
- payment queryset for CSV export

Data sources:

- subscription pricing from `Subscription` + `Plan`
- revenue from `PlatformPayment`
- expenses from `OperationalExpense`

## Relationship Summary

```text
Academy
|-- subscriptions -> Subscription
|-- platform_payments -> PlatformPayment
`-- usage -> TenantUsage

Plan
`-- subscriptions -> Subscription

Subscription
|-- academy -> Academy
|-- plan -> Plan
`-- payments -> PlatformPayment

PlatformPayment
|-- academy -> Academy (PROTECT)
`-- subscription -> Subscription (PROTECT)

OperationalExpense
`-- standalone platform expense ledger entry
```

## Data Integrity Notes

- `PlatformPayment` uses `PROTECT` on both foreign keys so payment history does not disappear on subscription changes or deletes.
- `Subscription.plan` uses `PROTECT` to preserve historical commercial relationships.
- `Subscription` enforces one current subscription per academy through a conditional unique constraint.
- Finance summaries are computed from ledger tables, not cached constants.

## Related Documentation

- `docs/ARCHITECTURE.md`
- `docs/PROJECT_DOCUMENTATION.md`
- `docs/ROLE_ROUTE_MAP.md`
- `docs/XERO_SYNC.md`
