# Failed E2E Tests - Fix Plan

**Test Run Date:** January 20, 2026  
**Total Tests:** 198  
**Passed:** 123  
**Failed:** 19  
**Skipped:** 56  

---

## Summary of Failed Tests by Category

| Category | Count | Priority |
|----------|-------|----------|
| UI/Frontend Issues | 4 | High |
| Missing Backend Endpoints | 3 | Medium |
| Onboarding Validation | 7 | Medium |
| Backend API Issues | 4 | High |
| Security Tests | 1 | Low |

---

## 1. UI/Frontend Issues (4 tests) - **HIGH PRIORITY**

### 1.1 Auth UI Tests (3 tests)

**Files:** `auth.spec.ts:377`, `auth.spec.ts:386`, `auth.spec.ts:411`

**Tests:**
- `login page shows form`
- `successful login redirects to dashboard`
- `failed login shows error message`

**Root Cause:** The frontend may not be running or the login page elements don't match the selectors.

**Fix Plan:**
1. Verify frontend dev server is running at `http://localhost:5173`
2. Check that login page has:
   - Input with `type="email"` or `name="email"`
   - Input with `type="password"` or `name="password"`
   - Submit button with `type="submit"`
3. Verify the page renders the form correctly

**Assignee:** Frontend Developer  
**Effort:** Low

---

### 1.2 Onboarding UI Redirect (1 test)

**File:** `onboarding.spec.ts:559`

**Test:** `completed academy redirects from onboarding to dashboard`

**Root Cause:** The test uses wrong localStorage keys (`accessToken` instead of `auth_token`)

**Fix Plan:**
1. Update the test to use correct localStorage keys:
   ```typescript
   localStorage.setItem('auth_token', token.accessToken);
   localStorage.setItem('refresh_token', token.refreshToken);
   ```
2. Verify `RequireOnboardingIncomplete` component is working correctly

**Assignee:** Test Engineer or Frontend Developer  
**Effort:** Low

---

## 2. Missing Backend Endpoints (3 tests) - **MEDIUM PRIORITY**

### 2.1 Complaints Endpoint

**File:** `parent.spec.ts:307`

**Test:** `parent can submit a complaint`

**Root Cause:** Missing `/api/v1/tenant/complaints/` endpoint

**Fix Plan:**
1. Create `tenant/communication/` app (if not exists)
2. Create `Complaint` model with fields:
   - `academy` (FK)
   - `parent` (FK to Parent or User)
   - `subject` (CharField)
   - `description` (TextField)
   - `category` (CharField with choices: GENERAL, BILLING, COACH, FACILITY, OTHER)
   - `status` (CharField: OPEN, IN_PROGRESS, RESOLVED, CLOSED)
   - `created_at`, `updated_at`
3. Create serializer and viewset
4. Add URL routes under `/api/v1/tenant/complaints/`
5. Add permissions: Parents can create/view own, Admins can view all

**Assignee:** Backend Developer  
**Effort:** Medium

---

### 2.2 Platform Academy Creation

**File:** `platform.spec.ts:72`

**Test:** `superadmin can create academy with admin invite`

**Root Cause:** Academy creation endpoint may not accept `owner_email` field or response format differs

**Fix Plan:**
1. Check `/api/v1/platform/academies/` POST endpoint
2. Verify it accepts `name` and `owner_email` fields
3. Verify it creates the academy and sends invite to owner
4. Response should include: `id`, `name`, `onboarding_completed`

**Assignee:** Backend Developer  
**Effort:** Low

---

### 2.3 Platform Plan Creation

**File:** `platform.spec.ts:167`

**Test:** `superadmin can create a plan`

**Root Cause:** Plan creation endpoint validation or field naming issue

**Fix Plan:**
1. Check `/api/v1/platform/plans/` POST endpoint
2. Verify it accepts:
   - `name`, `description`, `price`, `currency`, `billing_cycle`
   - `limits_json` (object with quota limits)
3. Fix any serializer validation issues

**Assignee:** Backend Developer  
**Effort:** Low

---

## 3. Onboarding Validation Tests (6 tests) - **MEDIUM PRIORITY**

**Files:** `onboarding.spec.ts:341-441`

**Tests:**
- `step 1 requires valid email`
- `step 2 requires at least one location`
- `step 3 requires at least one sport`
- `step 4 requires valid age range`
- `step 5 requires valid date range`
- `step 6 requires valid pricing`

**Root Cause:** Onboarding step endpoints (`/api/v1/tenant/onboarding/step/{n}/`) either:
- Don't exist
- Return 404 instead of 400 for validation errors
- Have different URL structure

**Fix Plan:**
1. Verify onboarding endpoints exist at `/api/v1/tenant/onboarding/step/{1-6}/`
2. Implement proper validation that returns 400 status:
   - Step 1: Validate email format
   - Step 2: Require non-empty `locations` array
   - Step 3: Require non-empty `sports` array
   - Step 4: Validate `age_min` < `age_max`
   - Step 5: Validate `start_date` < `end_date`
   - Step 6: Validate `price` >= 0
3. Return proper error messages in response body

**Assignee:** Backend Developer  
**Effort:** Medium

---

## 4. Backend API Issues (4 tests) - **HIGH PRIORITY**

### 4.1 Student Deletion

**File:** `admin.spec.ts:122`

**Test:** `admin can delete a student`

**Root Cause:** Test expects `gender: 'F'` but backend expects `gender: 'FEMALE'`

**Fix Plan:**
1. Update test to use `gender: 'FEMALE'` instead of `gender: 'F'`

**Assignee:** Test Engineer  
**Effort:** Very Low

---

### 4.2 Class Creation

**File:** `admin.spec.ts:150`

**Test:** `admin can create a class`

**Root Cause:** Class model may require additional fields or has different field names

**Fix Plan:**
1. Check Class model required fields
2. Update test data to include all required fields:
   - May need `schedule` instead of separate `day_of_week`, `start_time`, `end_time`
   - May need `start_date`, `end_date`
3. Verify serializer accepts the payload format

**Assignee:** Test Engineer or Backend Developer  
**Effort:** Low

---

### 4.3 Invoice Creation

**File:** `admin.spec.ts:457`

**Test:** `admin can create invoice`

**Root Cause:** Invoice creation serializer may require additional fields

**Fix Plan:**
1. Check `CreateInvoiceSerializer` required fields
2. May need to include `parent_id` or `student_id`
3. Items may need `item_id` reference

**Assignee:** Backend Developer  
**Effort:** Low

---

### 4.4 Media Upload

**Files:** `media-quota.spec.ts:80`, `coach.spec.ts:396`

**Tests:**
- `admin can upload media when within quota`
- `coach can upload media if permitted`

**Root Cause:** Media upload may require `class_id` parameter or MinIO configuration issue

**Fix Plan:**
1. Check `/api/v1/tenant/media/upload/` endpoint requirements
2. Verify MinIO is running and accessible
3. May need to provide `class_id` in the upload request
4. Check file upload multipart form handling

**Assignee:** Backend Developer / DevOps  
**Effort:** Medium

---

## 5. Security Tests (1 test) - **LOW PRIORITY**

### 5.1 Parent Permission Check

**File:** `security-isolation.spec.ts:392`

**Test:** `parent cannot perform admin or coach operations`

**Root Cause:** Attendance endpoint returns 400 (validation error) instead of 403 (forbidden) when parent tries to create attendance with invalid IDs

**Fix Plan:**
1. The attendance endpoint should check permissions BEFORE validating the payload
2. Update `AttendanceViewSet.create()` to:
   - First check if user is admin or coach
   - Return 403 if parent tries to create
   - Only then validate the payload

**Assignee:** Backend Developer  
**Effort:** Low

---

## Implementation Priority

### Phase 1 - Quick Wins (1-2 hours)
1. ✅ Fix `gender: 'F'` → `gender: 'FEMALE'` in tests
2. ✅ Fix localStorage keys in onboarding UI test
3. Verify frontend is running for UI tests

### Phase 2 - Backend Fixes (2-4 hours)
1. Fix attendance permission check (return 403 before validation)
2. Fix class creation API/test alignment
3. Fix invoice creation API requirements
4. Review platform academy/plan creation endpoints

### Phase 3 - New Features (4-8 hours)
1. Implement `/tenant/complaints/` endpoint
2. Implement onboarding step validation endpoints
3. Fix media upload endpoint requirements

---

## Files to Modify

### Test Files
- `tests/e2e/admin.spec.ts` - Fix gender values
- `tests/e2e/onboarding.spec.ts` - Fix localStorage keys

### Backend Files
- `backend/tenant/attendance/views.py` - Permission check before validation
- `backend/tenant/classes/serializers.py` - Review required fields
- `backend/tenant/billing/serializers.py` - Review invoice creation
- `backend/tenant/communication/` - New complaints module (if creating)
- `backend/tenant/onboarding/views.py` - Step validation endpoints

### Frontend Files
- `frontend/src/features/tenant/users/pages/LoginPage.tsx` - Verify form structure
- `frontend/src/shared/components/common/RequireOnboardingIncomplete.tsx` - Verify exists

---

## Verification Commands

After fixes, run specific test groups:

```bash
# Test auth flows
npx playwright test auth.spec.ts --reporter=list

# Test admin operations
npx playwright test admin.spec.ts --reporter=list

# Test onboarding
npx playwright test onboarding.spec.ts --reporter=list

# Test all
npm run test:e2e
```
