# Navigation Map

Complete navigation structure organized by user role. This document shows all menu items available to each role in the sidebar navigation.

## Overview

The navigation system is role-based, with each role having access to specific menu groups and items. Navigation items are organized into collapsible groups for better UX.

## SUPERADMIN

Platform-level management access.

### Platform Management
- **Academies** (`/dashboard/platform/academies`)
  - Manage all academies in the platform
- **Plans** (`/dashboard/platform/plans`)
  - Manage subscription plans

### Analytics & Audit
- **Statistics** (`/dashboard/platform/stats`)
  - Platform-wide analytics
- **Errors** (`/dashboard/platform/errors`)
  - System error tracking
- **Audit Logs** (`/dashboard/platform/audit-logs`)
  - System audit trail

---

## OWNER

Multi-academy management access. OWNER role has access to both OWNER-specific routes and all ADMIN routes.

### Overview
- **Overview** (`/dashboard/owner/overview`)
  - Owner dashboard overview
- **Select Academy** (`/dashboard/select-academy`)
  - Switch between owned academies

### Operations (from ADMIN)
- **Students** (`/dashboard/students`)
- **Classes** (`/dashboard/classes`)
- **Attendance** (`/dashboard/attendance`)

### Finance (from ADMIN)
- **Items** (`/dashboard/finance/items`)
- **Invoices** (`/dashboard/finance/invoices`)
- **Receipts** (`/dashboard/finance/receipts`)

### Management (from ADMIN)
- **Users** (`/dashboard/users`)
- **Media** (`/dashboard/media`)
- **Reports** (`/dashboard/reports`)

### Settings (from ADMIN)
- **Locations** (`/dashboard/settings/locations`)
- **Sports** (`/dashboard/settings/sports`)
- **Age Categories** (`/dashboard/settings/age-categories`)
- **Terms** (`/dashboard/settings/terms`)
- **Pricing** (`/dashboard/settings/pricing`)

---

## ADMIN

Full tenant operations access for a single academy.

### Overview
- **Overview** (`/dashboard/admin/overview`)
  - Admin dashboard overview

### Operations
- **Students** (`/dashboard/students`)
  - Manage students
- **Classes** (`/dashboard/classes`)
  - Manage classes and enrollments
- **Attendance** (`/dashboard/attendance`)
  - Track and manage attendance

### Finance
- **Items** (`/dashboard/finance/items`)
  - Manage billing items
- **Invoices** (`/dashboard/finance/invoices`)
  - Create and manage invoices
- **Receipts** (`/dashboard/finance/receipts`)
  - Record and manage receipts

### Management
- **Users** (`/dashboard/users`)
  - Manage academy users (invite, edit)
- **Media** (`/dashboard/media`)
  - Manage media files
- **Reports** (`/dashboard/reports`)
  - View academy reports

### Settings
- **Locations** (`/dashboard/settings/locations`)
  - Manage academy locations
- **Sports** (`/dashboard/settings/sports`)
  - Manage sports/activities
- **Age Categories** (`/dashboard/settings/age-categories`)
  - Manage age categories
- **Terms** (`/dashboard/settings/terms`)
  - Manage academic terms
- **Pricing** (`/dashboard/settings/pricing`)
  - Manage pricing items

---

## COACH

Limited tenant access for assigned classes only.

### Overview
- **Overview** (`/dashboard/coach/overview`)
  - Coach dashboard overview

### Operations
- **Classes** (`/dashboard/coach/classes`)
  - View assigned classes
- **Attendance** (`/dashboard/coach/attendance`)
  - Mark attendance for assigned classes
- **Media** (`/dashboard/coach/media`)
  - Access media for assigned classes

---

## PARENT

Parent-specific access to own children's information.

### Overview
- **Overview** (`/dashboard/parent/overview`)
  - Parent dashboard overview

### My Information
- **Children** (`/dashboard/parent/children`)
  - View own children's information
- **Attendance** (`/dashboard/parent/attendance`)
  - View children's attendance records
- **Invoices** (`/dashboard/parent/invoices`)
  - View and manage invoices for own children
- **Media** (`/dashboard/parent/media`)
  - Access media related to own children
- **Complaints** (`/dashboard/parent/complaints`)
  - Submit and view complaints

---

## Navigation Structure

### Group Organization
Navigation items are organized into collapsible groups:
- Groups can be expanded/collapsed
- Groups with active items are highlighted
- Empty groups are hidden

### Active Route Highlighting
- Current route is highlighted in the sidebar
- Parent routes are highlighted when on child routes (e.g., `/dashboard/students/123` highlights "Students")
- Uses prefix matching for nested routes

### Role Filtering
- Navigation items are filtered based on current user role
- Items not accessible to the current role are hidden
- Entire groups are hidden if no items are visible

---

## Implementation Details

### File Structure
- Navigation configuration: `frontend/src/shared/nav/navigation.ts`
- Sidebar component: `frontend/src/shared/components/layout/Sidebar.tsx`
- Dashboard layout: `frontend/src/shared/components/layout/DashboardLayout.tsx`

### Key Functions
- `getNavigationForRole(role)`: Get navigation groups for a specific role
- `isRouteActive(pathname, item)`: Check if a route is currently active
- `validateNavigationLinks(routerPaths, navItems)`: Validate navigation links against router

### Role Merging
- OWNER role automatically merges OWNER-specific navigation with ADMIN navigation
- This is handled by `getNavigationForRole()` function

---

## Notes

- All navigation paths must start with `/dashboard`
- Dynamic routes (e.g., `/dashboard/students/:id`) are supported via prefix matching
- Navigation respects the same role guards as routes
- Navigation items are filtered client-side based on `getCurrentUserRole()`
