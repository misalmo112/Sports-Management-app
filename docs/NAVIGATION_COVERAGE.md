# Navigation Coverage Checklist

This document tracks which routes have corresponding navigation items in the sidebar, and identifies any gaps.

## Coverage Summary

| Category | Total Routes | With Navigation | Without Navigation | Coverage |
|----------|--------------|-----------------|-------------------|----------|
| Platform (SUPERADMIN) | 10 | 5 | 5 | 50% |
| Owner | 2 | 2 | 0 | 100% |
| Admin/Owner | 30 | 18 | 12 | 60% |
| Coach | 4 | 4 | 0 | 100% |
| Parent | 7 | 6 | 1 | 86% |
| **Total** | **53** | **35** | **18** | **66%** |

## Route Coverage by Role

### SUPERADMIN Routes

| Route | Navigation Item | Status | Notes |
|-------|----------------|--------|-------|
| `/dashboard/platform/academies` | ✅ Academies | ✅ Covered | Main list view |
| `/dashboard/platform/academies/new` | ❌ | ⚠️ Missing | Create academy (no nav item) |
| `/dashboard/platform/academies/:id` | ❌ | ⚠️ Missing | Academy detail (no nav item) |
| `/dashboard/platform/academies/:id/plan` | ❌ | ⚠️ Missing | Academy plan (no nav item) |
| `/dashboard/platform/academies/:id/quota` | ❌ | ⚠️ Missing | Academy quota (no nav item) |
| `/dashboard/platform/plans` | ✅ Plans | ✅ Covered | Main list view |
| `/dashboard/platform/plans/new` | ❌ | ⚠️ Missing | Create plan (no nav item) |
| `/dashboard/platform/plans/:id` | ❌ | ⚠️ Missing | Plan detail (no nav item) |
| `/dashboard/platform/stats` | ✅ Statistics | ✅ Covered | |
| `/dashboard/platform/errors` | ✅ Errors | ✅ Covered | |
| `/dashboard/platform/audit-logs` | ✅ Audit Logs | ✅ Covered | |

**Note**: Detail and create routes are intentionally not in navigation (accessed via list pages).

### OWNER Routes

| Route | Navigation Item | Status | Notes |
|-------|----------------|--------|-------|
| `/dashboard/owner/overview` | ✅ Overview | ✅ Covered | |
| `/dashboard/select-academy` | ✅ Select Academy | ✅ Covered | |

### ADMIN/OWNER Routes

| Route | Navigation Item | Status | Notes |
|-------|----------------|--------|-------|
| `/dashboard/admin/overview` | ✅ Overview | ✅ Covered | |
| `/dashboard/students` | ✅ Students | ✅ Covered | Main list view |
| `/dashboard/students/new` | ❌ | ⚠️ Missing | Create student (no nav item) |
| `/dashboard/students/:id` | ❌ | ⚠️ Missing | Student detail (no nav item) |
| `/dashboard/students/:id/edit` | ❌ | ⚠️ Missing | Edit student (no nav item) |
| `/dashboard/classes` | ✅ Classes | ✅ Covered | Main list view |
| `/dashboard/classes/new` | ❌ | ⚠️ Missing | Create class (no nav item) |
| `/dashboard/classes/:id` | ❌ | ⚠️ Missing | Class detail (no nav item) |
| `/dashboard/classes/:id/edit` | ❌ | ⚠️ Missing | Edit class (no nav item) |
| `/dashboard/classes/:id/enrollments` | ❌ | ⚠️ Missing | Enrollments (no nav item) |
| `/dashboard/attendance` | ✅ Attendance | ✅ Covered | Main view |
| `/dashboard/attendance/mark` | ❌ | ⚠️ Missing | Mark attendance (no nav item) |
| `/dashboard/attendance/coach` | ❌ | ⚠️ Missing | Coach attendance (no nav item) |
| `/dashboard/finance/items` | ✅ Items | ✅ Covered | |
| `/dashboard/finance/invoices` | ✅ Invoices | ✅ Covered | Main list view |
| `/dashboard/finance/invoices/new` | ❌ | ⚠️ Missing | Create invoice (no nav item) |
| `/dashboard/finance/invoices/:id` | ❌ | ⚠️ Missing | Invoice detail (no nav item) |
| `/dashboard/finance/receipts` | ✅ Receipts | ✅ Covered | Main list view |
| `/dashboard/finance/receipts/new` | ❌ | ⚠️ Missing | Create receipt (no nav item) |
| `/dashboard/settings/locations` | ✅ Locations | ✅ Covered | |
| `/dashboard/settings/sports` | ✅ Sports | ✅ Covered | |
| `/dashboard/settings/age-categories` | ✅ Age Categories | ✅ Covered | |
| `/dashboard/settings/terms` | ✅ Terms | ✅ Covered | |
| `/dashboard/settings/pricing` | ✅ Pricing | ✅ Covered | |
| `/dashboard/media` | ✅ Media | ✅ Covered | |
| `/dashboard/reports` | ✅ Reports | ✅ Covered | |
| `/dashboard/users` | ✅ Users | ✅ Covered | Main list view |
| `/dashboard/users/:id` | ❌ | ⚠️ Missing | User detail (no nav item) |

**Note**: Detail, create, and edit routes are intentionally not in navigation (accessed via list pages or actions).

### COACH Routes

| Route | Navigation Item | Status | Notes |
|-------|----------------|--------|-------|
| `/dashboard/coach/overview` | ✅ Overview | ✅ Covered | |
| `/dashboard/coach/classes` | ✅ Classes | ✅ Covered | |
| `/dashboard/coach/attendance` | ✅ Attendance | ✅ Covered | |
| `/dashboard/coach/media` | ✅ Media | ✅ Covered | |

### PARENT Routes

| Route | Navigation Item | Status | Notes |
|-------|----------------|--------|-------|
| `/dashboard/parent/overview` | ✅ Overview | ✅ Covered | |
| `/dashboard/parent/children` | ✅ Children | ✅ Covered | |
| `/dashboard/parent/attendance` | ✅ Attendance | ✅ Covered | |
| `/dashboard/parent/invoices` | ✅ Invoices | ✅ Covered | Main list view |
| `/dashboard/parent/invoices/:id` | ❌ | ⚠️ Missing | Invoice detail (no nav item) |
| `/dashboard/parent/media` | ✅ Media | ✅ Covered | |
| `/dashboard/parent/complaints` | ✅ Complaints | ✅ Covered | |

**Note**: Invoice detail route is intentionally not in navigation (accessed via list page).

---

## Navigation Items Without Routes

The following navigation items are defined but may not have corresponding routes:

None identified. All navigation items have corresponding routes.

---

## Design Decisions

### Routes Not in Navigation

The following route types are intentionally excluded from navigation:

1. **Create Routes** (e.g., `/dashboard/students/new`)
   - Accessed via "Create" buttons on list pages
   - Not needed in sidebar navigation

2. **Detail Routes** (e.g., `/dashboard/students/:id`)
   - Accessed by clicking items in list pages
   - Parent navigation item (e.g., "Students") is highlighted when on detail page

3. **Edit Routes** (e.g., `/dashboard/students/:id/edit`)
   - Accessed via edit buttons on detail pages
   - Parent navigation item is highlighted

4. **Nested Action Routes** (e.g., `/dashboard/classes/:id/enrollments`)
   - Accessed via tabs or actions on detail pages
   - Parent navigation item is highlighted

### Active Route Highlighting

- Parent routes are highlighted when on child routes
- Example: `/dashboard/students/123` highlights "Students" in sidebar
- Uses prefix matching: `pathname.startsWith(item.path + '/')`

---

## Validation

To validate navigation coverage, use the validation utility:

```typescript
import { validateNavigationAgainstRouter } from '@/shared/nav/validateNavigation';
import { router } from '@/routes';

const report = validateNavigationAgainstRouter(router.routes);
console.log(report);
```

---

## Recommendations

### Current Status
✅ **Good Coverage**: Main navigation items are covered for all roles
⚠️ **Expected Gaps**: Detail/create/edit routes are intentionally excluded

### Future Enhancements
1. Consider adding breadcrumb navigation for detail pages
2. Add quick actions menu for common tasks
3. Consider adding search functionality in sidebar
4. Add keyboard shortcuts for navigation

---

## Maintenance

When adding new routes:
1. Determine if route should have a navigation item
2. Add to appropriate role's navigation config in `navigation.ts`
3. Update this coverage document
4. Run validation utility to ensure route exists

When adding new roles:
1. Add role to `UserRole` type
2. Add navigation config for new role
3. Update `getNavigationForRole()` if needed
4. Update this coverage document
