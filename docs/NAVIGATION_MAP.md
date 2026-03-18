# Navigation Map

Complete sidebar navigation structure based on the current `frontend/src/shared/nav/navigation.ts` configuration.

## Overview

- Navigation is role-based.
- All dashboard routes require authentication.
- OWNER navigation merges OWNER-only items with ADMIN items.
- Detail, create, and nested action routes usually do not have dedicated sidebar items.

## SUPERADMIN

Platform-wide management access.

### Platform Management

- **Academies** (`/dashboard/platform/academies`)
- **Plans** (`/dashboard/platform/plans`)

### Analytics & Audit

- **Statistics** (`/dashboard/platform/stats`)
- **Errors** (`/dashboard/platform/errors`)
- **Audit Logs** (`/dashboard/platform/audit-logs`)

### Finance

- **Finance** (`/dashboard/platform/finance`)
- **Payments** (`/dashboard/platform/finance/payments`)
- **Expenses** (`/dashboard/platform/finance/expenses`)

### Masters

- **Currencies** (`/dashboard/platform/masters/currencies`)
- **Time zones** (`/dashboard/platform/masters/timezones`)

## OWNER

OWNER has OWNER-specific routes plus the full ADMIN navigation set.

### Overview

- **Overview** (`/dashboard/owner/overview`)
- **Select Academy** (`/dashboard/select-academy`)

### Inherited from ADMIN

- Operations: Students, Classes, Attendance
- Finance: Items, Invoices, Receipts
- Management: Users, Media, Reports, Finance Overview, Facilities, Staff, Feedback
- Settings: Settings Home, My Account, Organization, Subscription, Usage & Limits, Locations, Sports, Age Categories, Terms, Currencies, Time zones, Pricing, Bulk Actions

## ADMIN

Single-academy operations and management.

### Overview

- **Overview** (`/dashboard/admin/overview`)

### Operations

- **Students** (`/dashboard/students`)
- **Classes** (`/dashboard/classes`)
- **Attendance** (`/dashboard/attendance`)

### Finance

- **Items** (`/dashboard/finance/items`)
- **Invoices** (`/dashboard/finance/invoices`)
- **Receipts** (`/dashboard/finance/receipts`)

### Management

- **Users** (`/dashboard/users`)
- **Media** (`/dashboard/media`)
- **Reports** (`/dashboard/reports`)
- **Finance Overview** (`/dashboard/management/finance`)
- **Facilities** (`/dashboard/management/facilities`)
- **Staff** (`/dashboard/management/staff`)
- **Feedback** (`/dashboard/feedback`)

### Settings

- **Settings Home** (`/dashboard/settings`)
- **My Account** (`/dashboard/settings/account`)
- **Organization** (`/dashboard/settings/organization`)
- **Subscription** (`/dashboard/settings/subscription`)
- **Usage & Limits** (`/dashboard/settings/usage`)
- **Locations** (`/dashboard/settings/locations`)
- **Sports** (`/dashboard/settings/sports`)
- **Age Categories** (`/dashboard/settings/age-categories`)
- **Terms** (`/dashboard/settings/terms`)
- **Currencies** (`/dashboard/settings/currencies`)
- **Time zones** (`/dashboard/settings/timezones`)
- **Pricing** (`/dashboard/settings/pricing`)
- **Bulk Actions** (`/dashboard/settings/bulk-actions`)

## COACH

Assigned-class operations only.

### Overview

- **Overview** (`/dashboard/coach/overview`)

### Operations

- **Classes** (`/dashboard/coach/classes`)
- **Attendance** (`/dashboard/coach/attendance`)
- **Media** (`/dashboard/coach/media`)

## PARENT

Parent self-service access to own-family data.

### Overview

- **Overview** (`/dashboard/parent/overview`)

### My Information

- **Children** (`/dashboard/parent/children`)
- **Attendance** (`/dashboard/parent/attendance`)
- **Invoices** (`/dashboard/parent/invoices`)
- **Media** (`/dashboard/parent/media`)
- **Feedback** (`/dashboard/parent/feedback`)

## Navigation Behavior

### Group organization

- Sidebar items are grouped into labeled sections.
- Groups with no visible items are hidden.
- OWNER navigation is merged from OWNER and ADMIN definitions.

### Active route highlighting

- Exact matching is used for items that explicitly declare `exact: true`.
- Prefix matching is used for nested routes, so parent items remain highlighted on detail pages.

### Intentionally absent sidebar items

The following route types are expected to exist without dedicated navigation items:

- create pages
- detail pages
- edit pages
- nested action pages such as enrollment or mark-attendance flows

## Source of Truth

- Navigation config: `frontend/src/shared/nav/navigation.ts`
- Router config: `frontend/src/routes/index.tsx`
