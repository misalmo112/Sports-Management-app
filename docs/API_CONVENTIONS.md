# API Conventions

## Overview

This document describes the current API conventions used by the repository. It is intentionally grounded in the routes and viewsets that are implemented today, not aspirational endpoints.

## Base URL Structure

All APIs use path versioning:

- Base: `/api/v1/`
- Platform APIs: `/api/v1/platform/*`
- Tenant APIs: `/api/v1/tenant/*`
- Legacy admin compatibility APIs: `/api/v1/admin/*`
- Auth APIs: `/api/v1/auth/*`

## Current Route Families

### Platform routes

Representative implemented platform endpoints:

```text
/api/v1/platform/academies/
/api/v1/platform/academies/{id}/
/api/v1/platform/plans/
/api/v1/platform/plans/{id}/
/api/v1/platform/finance/payments/
/api/v1/platform/finance/payments/{id}/
/api/v1/platform/finance/payments/export/
/api/v1/platform/finance/expenses/
/api/v1/platform/finance/expenses/{id}/
/api/v1/platform/finance/summary/
/api/v1/platform/finance/trends/
```

### Tenant routes

Representative implemented tenant endpoints:

```text
/api/v1/tenant/students/
/api/v1/tenant/students/{id}/
/api/v1/tenant/classes/
/api/v1/tenant/classes/{id}/
/api/v1/tenant/attendance/
/api/v1/tenant/attendance/mark/
/api/v1/tenant/coach-attendance/
/api/v1/tenant/items/
/api/v1/tenant/invoices/
/api/v1/tenant/receipts/
/api/v1/tenant/media/
/api/v1/tenant/media/upload-multiple/
/api/v1/tenant/users/
/api/v1/tenant/account/
```

### Auth routes

```text
/api/v1/auth/token/
/api/v1/auth/invite/validate/
/api/v1/auth/invite/accept/
```

## Naming Rules

- Use lowercase plural resource names.
- Use nested or action routes only where the implementation actually exposes them.
- Use hyphenated path segments for multi-word resources or actions, such as `audit-logs`, `age-categories`, `coach-attendance`, and `upload-multiple`.
- Prefer `PATCH` for updates unless the view explicitly expects full replacement.

## HTTP Method Conventions

| Method | Use |
|---|---|
| `GET` | list or retrieve resources |
| `POST` | create resources or trigger explicit actions |
| `PATCH` | partial updates |
| `DELETE` | destroy resources where the endpoint allows deletion |

Notes:

- Many viewsets expose the standard DRF router shape for list, create, retrieve, update, partial update, and destroy.
- Some resources intentionally restrict deletion even if the resource is otherwise CRUD-managed. Example: platform payments disable delete at the API layer.
- Action endpoints are typically implemented through DRF `@action`.

## Query Parameter Conventions

### Pagination

List endpoints that use DRF pagination return the standard:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

Do not document a fixed page size here unless it is confirmed from settings.

### Filtering

Use query parameters for simple list filtering.

Current implemented examples:

```text
/api/v1/platform/academies/?is_active=true&onboarding_completed=true
/api/v1/platform/finance/payments/?academy=<uuid>&payment_date_after=2026-03-01
/api/v1/platform/finance/expenses/?category=CLOUD&is_paid=true
```

### Ordering and search

Where a viewset enables DRF ordering or search, use:

```text
?ordering=name
?ordering=-created_at
?search=academy
```

Only document ordering or search examples for endpoints that actually enable those backends.

## Headers and Tenant Context

Typical JSON requests include:

```text
Content-Type: application/json
Authorization: Bearer <jwt>
```

Tenant requests may also use:

```text
X-Academy-ID: <academy-uuid>
```

Current middleware behavior:

- `X-Academy-ID` is checked first.
- If absent, academy context falls back to the authenticated user's academy mapping.
- Platform and auth paths are exempt from academy resolution.

## Request and Response Conventions

### Successful responses

- List responses generally use DRF pagination.
- Detail/create/update responses generally return the serialized object directly.
- Export endpoints may return non-JSON payloads such as CSV.

### Error responses

The codebase currently uses DRF-style error bodies, not one universal custom envelope.

Common patterns:

```json
{ "detail": "Not found." }
```

```json
{ "amount": ["Amount must be greater than 0."] }
```

```json
{ "academy": ["Academy must match the subscription academy."] }
```

Do not assume a top-level `errors` wrapper unless a specific view implements one.

## Representative Current Examples

### Create a platform payment

```text
POST /api/v1/platform/finance/payments/
```

```json
{
  "subscription": 12,
  "academy": "academy-uuid",
  "amount": "99.00",
  "currency": "USD",
  "payment_method": "BANK_TRANSFER",
  "payment_date": "2026-03-17",
  "invoice_ref": "INV-1001"
}
```

### Query finance summary

```text
GET /api/v1/platform/finance/summary/?year=2026&month=3
```

### Mark tenant attendance

```text
POST /api/v1/tenant/attendance/mark/
```

### Upload multiple media files

```text
POST /api/v1/tenant/media/upload-multiple/
Content-Type: multipart/form-data
```

## Documentation Rules

- Only list endpoints that exist in the current URL configuration.
- If an endpoint is planned but not wired, document it in a proposal doc instead of here.
- When a new route is added, update the route map and any convention examples that reference that area.

## Related References

- `docs/ARCHITECTURE.md`
- `docs/ROLE_ROUTE_MAP.md`
- `docs/PERMISSIONS.md`
- `docs/DOCUMENTATION_MAINTENANCE.md`
