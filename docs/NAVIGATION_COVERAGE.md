# Navigation Coverage Checklist

This document compares the current sidebar navigation against the implemented dashboard routes in `frontend/src/routes/index.tsx`.

## Coverage Summary

| Category | Total Routes | With Navigation | Without Navigation | Coverage |
|---|---:|---:|---:|---:|
| Platform (SUPERADMIN) | 14 | 8 | 6 | 57% |
| Owner | 2 | 2 | 0 | 100% |
| Admin/Owner | 39 | 25 | 14 | 64% |
| Coach | 6 | 4 | 2 | 67% |
| Parent | 7 | 6 | 1 | 86% |
| **Total** | **68** | **45** | **23** | **66%** |

## SUPERADMIN Routes

| Route | Navigation Item | Status | Notes |
|---|---|---|---|
| `/dashboard/platform/academies` | Academies | Covered | Main list view |
| `/dashboard/platform/academies/new` | None | Expected gap | Create flow |
| `/dashboard/platform/academies/:id` | None | Expected gap | Detail flow |
| `/dashboard/platform/academies/:id/plan` | None | Expected gap | Nested management flow |
| `/dashboard/platform/academies/:id/quota` | None | Expected gap | Nested management flow |
| `/dashboard/platform/plans` | Plans | Covered | Main list view |
| `/dashboard/platform/plans/new` | None | Expected gap | Create flow |
| `/dashboard/platform/plans/:id` | None | Expected gap | Detail flow |
| `/dashboard/platform/stats` | Statistics | Covered | |
| `/dashboard/platform/errors` | Errors | Covered | |
| `/dashboard/platform/audit-logs` | Audit Logs | Covered | |
| `/dashboard/platform/finance` | Finance | Covered | Main finance overview |
| `/dashboard/platform/finance/payments` | Payments | Covered | Payment ledger |
| `/dashboard/platform/finance/expenses` | Expenses | Covered | Expense log |

## OWNER Routes

| Route | Navigation Item | Status | Notes |
|---|---|---|---|
| `/dashboard/owner/overview` | Overview | Covered | |
| `/dashboard/select-academy` | Select Academy | Covered | |

## ADMIN / OWNER Routes

Main list and landing pages are intentionally covered. Create, detail, edit, and nested action routes are intentionally not in the sidebar.

Covered navigation targets:

- `/dashboard/admin/overview`
- `/dashboard/students`
- `/dashboard/classes`
- `/dashboard/attendance`
- `/dashboard/finance/items`
- `/dashboard/finance/invoices`
- `/dashboard/finance/receipts`
- `/dashboard/users`
- `/dashboard/media`
- `/dashboard/reports`
- `/dashboard/management/finance`
- `/dashboard/management/facilities`
- `/dashboard/management/staff`
- `/dashboard/feedback`
- `/dashboard/settings`
- `/dashboard/settings/account`
- `/dashboard/settings/organization`
- `/dashboard/settings/subscription`
- `/dashboard/settings/usage`
- `/dashboard/settings/locations`
- `/dashboard/settings/sports`
- `/dashboard/settings/age-categories`
- `/dashboard/settings/terms`
- `/dashboard/settings/pricing`
- `/dashboard/settings/bulk-actions`

Expected navigation gaps:

- `/dashboard/students/new`
- `/dashboard/students/:id`
- `/dashboard/students/:id/edit`
- `/dashboard/classes/new`
- `/dashboard/classes/:id`
- `/dashboard/classes/:id/edit`
- `/dashboard/classes/:id/enrollments`
- `/dashboard/attendance/mark`
- `/dashboard/attendance/coach`
- `/dashboard/finance/invoices/new`
- `/dashboard/finance/invoices/:id`
- `/dashboard/finance/receipts/new`
- `/dashboard/settings/academy`
- `/dashboard/users/:id`

## COACH Routes

| Route | Navigation Item | Status | Notes |
|---|---|---|---|
| `/dashboard/coach/overview` | Overview | Covered | |
| `/dashboard/coach/classes` | Classes | Covered | |
| `/dashboard/coach/classes/:id` | None | Expected gap | Detail flow |
| `/dashboard/coach/attendance` | Attendance | Covered | |
| `/dashboard/coach/attendance/mark` | None | Expected gap | Action flow |
| `/dashboard/coach/media` | Media | Covered | |

## PARENT Routes

| Route | Navigation Item | Status | Notes |
|---|---|---|---|
| `/dashboard/parent/overview` | Overview | Covered | |
| `/dashboard/parent/children` | Children | Covered | |
| `/dashboard/parent/attendance` | Attendance | Covered | |
| `/dashboard/parent/invoices` | Invoices | Covered | |
| `/dashboard/parent/invoices/:id` | None | Expected gap | Detail flow |
| `/dashboard/parent/media` | Media | Covered | |
| `/dashboard/parent/feedback` | Feedback | Covered | |

## Design Rules

- Sidebar coverage is measured against navigable entry points, not every route.
- Detail, create, edit, and nested action routes should usually inherit highlight state from the nearest parent navigation item.
- Platform finance pages are fully covered because each page is a first-class SUPERADMIN entry point.

## Source of Truth

- Navigation config: `frontend/src/shared/nav/navigation.ts`
- Router config: `frontend/src/routes/index.tsx`
