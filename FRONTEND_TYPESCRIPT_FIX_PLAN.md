# Fix Frontend TypeScript Build Errors

## Overview

The frontend build fails with 100+ TypeScript errors across 5 main categories. This plan addresses all errors systematically to enable successful builds.

## Error Categories

### 1. Unused Variables/Imports (TS6133) - ~30 errors
**Root Cause:** TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters` flags enabled.

**Files Affected:**
- `src/features/platform/subscriptions/components/PlanTable.tsx` - unused `Edit` import
- `src/features/platform/tenants/hooks/hooks.ts` - unused `data` variables (3 instances)
- `src/features/platform/tenants/pages/AcademyDetailPage.tsx` - unused `formatDate`
- `src/features/platform/tenants/pages/AcademyQuotaPage.tsx` - unused `useEffect`
- `src/features/tenant/attendance/hooks/hooks.ts` - unused `data` (2 instances)
- `src/features/tenant/attendance/pages/*.tsx` - unused `ErrorState`, `Search` imports
- `src/features/tenant/billing/hooks/hooks.ts` - unused `data` (2 instances)
- `src/features/tenant/billing/pages/InvoiceCreatePage.tsx` - unused `useEffect`
- `src/features/tenant/billing/pages/ReceiptCreatePage.tsx` - unused `receipt`
- `src/features/tenant/classes/components/AddStudentModal.tsx` - unused `useEffect`, `Enrollment`
- `src/features/tenant/classes/hooks/hooks.ts` - unused `data` (3 instances)
- `src/features/tenant/classes/pages/EnrollmentPage.tsx` - unused `Users2`
- `src/features/tenant/communication/pages/ComplaintsPage.tsx` - unused `complaintId`
- `src/features/tenant/onboarding/components/OnboardingWizard.tsx` - unused `formData`
- `src/features/tenant/onboarding/components/steps/*.tsx` - unused `isLoading`, `Button`

**Fix Strategy:**
- Remove unused imports
- Prefix unused variables with `_` if they're required by interface/API
- Remove unused variables if truly not needed
- Use `// eslint-disable-next-line @typescript-eslint/no-unused-vars` for intentional unused params

### 2. Error State Management (TS2345) - ~20 errors
**Root Cause:** Error state setters returning `{ field: undefined }` instead of removing the field. TypeScript expects `Record<string, string[]>` but receives objects with `undefined` values.

**Files Affected:**
- `src/features/tenant/billing/pages/InvoiceCreatePage.tsx` - 8 errors
- `src/features/tenant/billing/pages/ItemsPage.tsx` - 5 errors
- `src/features/tenant/billing/pages/ReceiptCreatePage.tsx` - 5 errors

**Pattern:**
```typescript
// Current (incorrect):
setErrors((prev) => ({ ...prev, field: undefined }));

// Should be:
setErrors((prev) => {
  const next = { ...prev };
  delete next.field;
  return next;
});
```

**Fix Strategy:**
- Create helper function `clearFieldError(field: string)` that properly removes field
- Update all error clearing logic to use proper deletion pattern
- Ensure type consistency: `Record<string, string[]>` for API errors

### 3. Type Mismatches (TS2345, TS2367) - ~5 errors
**Root Cause:** Type mismatches in comparisons and function arguments.

**Files Affected:**
- `src/features/platform/tenants/pages/AcademyQuotaPage.tsx` - comparing `number` with `string` (3 errors)
- `src/features/tenant/billing/pages/InvoiceCreatePage.tsx` - `number | undefined` not assignable to `string | number` (2 errors)
- `src/features/tenant/media/components/MediaUploadModal.tsx` - missing `class_id` in `UploadMediaRequest`

**Fix Strategy:**
- Fix type comparisons: convert strings to numbers or vice versa
- Add null checks and default values for optional numbers
- Add missing required properties to function calls

### 4. Missing Test Matcher Types (TS2339) - ~40 errors
**Root Cause:** `@testing-library/jest-dom` types not properly configured for Vitest.

**Files Affected:**
- `src/features/tenant/media/components/__tests__/*.test.tsx` - missing `toBeInTheDocument`, `toHaveValue`, `toBeDisabled`
- `src/features/tenant/onboarding/components/__tests__/*.test.tsx` - missing `toBeInTheDocument`

**Fix Strategy:**
- Add `@testing-library/jest-dom` type imports to test setup
- Create `src/test-setup.ts` file that imports jest-dom matchers
- Update `vitest.config.ts` to include setup file
- Alternatively, add type declarations for custom matchers

### 5. Read-Only Property Assignment (TS2540) - 2 errors
**Root Cause:** Attempting to assign to `ref.current` which is read-only in TypeScript.

**Files Affected:**
- `src/features/tenant/onboarding/pages/AgeCategoriesPage.tsx`
- `src/features/tenant/onboarding/pages/LocationsPage.tsx`

**Fix Strategy:**
- Use `useRef` with proper typing: `useRef<HTMLInputElement | null>(null)`
- Check if ref is mutable ref type
- Use conditional assignment: `if (ref.current) { ref.current.value = ... }`

## Implementation Order

### Phase 1: Quick Wins (Unused Variables)
1. Remove unused imports
2. Remove or prefix unused variables
3. Fix unused parameters in hooks

### Phase 2: Error State Management
1. Create `clearFieldError` helper utility
2. Update all form components to use proper error clearing
3. Fix type consistency issues

### Phase 3: Type Fixes
1. Fix AcademyQuotaPage type comparisons
2. Fix InvoiceCreatePage number/string mismatches
3. Fix MediaUploadModal missing property

### Phase 4: Test Configuration
1. Set up jest-dom types for Vitest
2. Update test files to use proper matchers

### Phase 5: Ref Assignments
1. Fix read-only ref assignments
2. Ensure proper ref typing

## Files to Modify

### Core Utilities:
- `frontend/src/shared/utils/errorUtils.ts` - Add `clearFieldError` helper

### Form Components (Error State Fixes):
- `frontend/src/features/tenant/billing/pages/InvoiceCreatePage.tsx`
- `frontend/src/features/tenant/billing/pages/ItemsPage.tsx`
- `frontend/src/features/tenant/billing/pages/ReceiptCreatePage.tsx`

### Type Fixes:
- `frontend/src/features/platform/tenants/pages/AcademyQuotaPage.tsx`
- `frontend/src/features/tenant/media/components/MediaUploadModal.tsx`

### Test Configuration:
- `frontend/vitest.config.ts` (or create if doesn't exist)
- `frontend/src/test-setup.ts` (create new)

### Ref Fixes:
- `frontend/src/features/tenant/onboarding/pages/AgeCategoriesPage.tsx`
- `frontend/src/features/tenant/onboarding/pages/LocationsPage.tsx`

### Cleanup (Remove Unused):
- All files listed in Category 1

## Testing Strategy

After each phase:
1. Run `npm run build` to verify errors are resolved
2. Run `npm run test:run` to ensure tests still pass
3. Check that functionality remains intact

## Success Criteria

- `npm run build` completes without TypeScript errors
- All tests pass
- No runtime errors introduced
- Code maintains existing functionality

## Detailed Error List

### Unused Imports/Variables (TS6133)
1. `PlanTable.tsx:15` - `Edit` import
2. `hooks.ts:78,99,120` - `data` variables (platform/tenants)
3. `AcademyDetailPage.tsx:20` - `formatDate`
4. `AcademyQuotaPage.tsx:5` - `useEffect`
5. `hooks.ts:89,185` - `data` variables (attendance)
6. `AttendanceMarkPage.tsx:24` - `ErrorState`
7. `AttendancePage.tsx:32` - `Search`
8. `CoachAttendanceMarkPage.tsx:24` - `ErrorState`
9. `CoachAttendancePage.tsx:32` - `Search`
10. `ParentAttendancePage.tsx:31` - `Search`
11. `hooks.ts:93,173` - `data` variables (billing)
12. `InvoiceCreatePage.tsx:5` - `useEffect`
13. `ReceiptCreatePage.tsx:113` - `receipt`
14. `AddStudentModal.tsx:5,28` - `useEffect`, `Enrollment`
15. `hooks.ts:87,123,191` - `data` variables (classes)
16. `EnrollmentPage.tsx:18` - `Users2`
17. `ComplaintsPage.tsx:90` - `complaintId`
18. `OnboardingWizard.tsx:32` - `formData`
19. `Step1Profile.tsx:5,38` - `Button`, `isLoading`
20. `Step2Locations.tsx:19` - `isLoading`
21. `Step3Sports.tsx:20` - `isLoading`
22. `Step4AgeCategories.tsx:20` - `isLoading`
23. `Step5Terms.tsx:20` - `isLoading`
24. `Step6Pricing.tsx:23` - `isLoading`

### Error State Management (TS2345)
**InvoiceCreatePage.tsx:**
- Line 276: `parent_id: undefined`
- Line 310: `issued_date: undefined`
- Line 328: `due_date: undefined`
- Line 391: `number | undefined` to `string | number`
- Line 441: `number | undefined` to `string | number`
- Line 538: `discount_type: undefined`
- Line 573: `discount_value: undefined`
- Line 603: `tax_amount: undefined`
- Line 661: `notes: undefined`

**ItemsPage.tsx:**
- Line 345: `name: undefined`
- Line 365: `description: undefined`
- Line 390: `price: undefined`
- Line 410: `currency: undefined`
- Line 433: `is_active: undefined`

**ReceiptCreatePage.tsx:**
- Line 180: `invoice: undefined`
- Line 245: `amount: undefined`
- Line 277: `payment_method: undefined`
- Line 309: `payment_date: undefined`
- Line 330: `notes: undefined`

### Type Mismatches
**AcademyQuotaPage.tsx:**
- Line 41: `number` vs `string` comparison
- Line 50: `number` vs `string` comparison
- Line 97: `number` vs `string` comparison

**MediaUploadModal.tsx:**
- Line 87: Missing `class_id` in `UploadMediaRequest`

### Test Matcher Types (TS2339)
- All test files using `toBeInTheDocument`, `toHaveValue`, `toBeDisabled` need type declarations

### Read-Only Ref (TS2540)
- `AgeCategoriesPage.tsx:96` - `ref.current` assignment
- `LocationsPage.tsx:97` - `ref.current` assignment
