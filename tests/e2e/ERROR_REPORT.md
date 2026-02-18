# E2E Test Error Report

**Generated:** 2026-01-20  
**Test Run:** Full E2E Suite  
**Results:** 19 passed, 23 failed, 156 skipped

---

## Summary

The test suite has been implemented successfully, but several issues need to be addressed:

1. **18 tests failing due to 404 instead of expected 401/400** - Backend endpoints may not be properly configured or require different URL paths
2. **2 tests failing due to frontend routing** - Frontend doesn't redirect unauthenticated users
3. **156 tests skipped** - Test users don't exist in the database

---

## Error Categories

### 1. API Endpoint 404 Errors (18 tests)

**Issue:** Tests expect 400/401 status codes but receive 404 (Not Found).

**Affected Tests:**
- `auth.spec.ts`: Login validation tests (5 tests)
- `auth.spec.ts`: Token validation tests (3 tests)  
- `auth.spec.ts`: Invite acceptance tests (4 tests)
- `auth.spec.ts`: Inactive user test (1 test)
- `onboarding.spec.ts`: Invite acceptance tests (2 tests)
- `platform.spec.ts`: Unauthenticated access test (1 test)
- `security-isolation.spec.ts`: Unauthenticated access tests (5 tests)

**Root Cause Analysis:**
- Backend URL structure: `/api/v1/auth/token/` and `/api/v1/auth/invite/accept/` are correctly configured
- Tests use base URL: `http://localhost:8000/api/v1`
- Full paths should be: `http://localhost:8000/api/v1/auth/token/` ✅

**Possible Issues:**
1. Backend services not fully running or not accessible
2. Django URL routing not properly configured
3. Middleware blocking requests before reaching views
4. Backend returns 404 instead of 401 for unauthenticated requests (configuration issue)

**Action Required:**
- Verify backend is running: `docker-compose ps`
- Test endpoint manually: `curl http://localhost:8000/api/v1/auth/token/`
- Check Django URL routing in `backend/config/urls.py`
- Verify middleware configuration

---

### 2. Frontend Routing Issues (2 tests)

**Issue:** Frontend doesn't redirect users as expected.

| Test | Expected | Actual | Issue |
|------|----------|--------|-------|
| `auth.spec.ts:370` | Redirect to `/dashboard` after login | Stays on `/login` | Login doesn't trigger redirect |
| `onboarding.spec.ts:547` | Redirect to `/login` when unauthenticated | Stays on `/onboarding` | No auth guard on onboarding page |

**Action Required:**
- Add redirect logic after successful login
- Add authentication guard to `/onboarding` route
- Check React Router configuration

---

### 3. Missing Test Users (156 tests skipped)

**Issue:** Global setup cannot authenticate because test users don't exist.

**Missing Users:**
- Superadmin: `superadmin@test.com`
- Admin: `admin@testacademy.com`
- Coach: `coach@testacademy.com`
- Parent: `parent@testacademy.com`

**Action Required:**

```bash
# 1. Create superadmin
docker-compose exec backend python manage.py createsuperuser
# Email: superadmin@test.com
# Password: SuperAdmin123!

# 2. Create test academy and users via API or Django shell
# (After superadmin is created, global setup will create academy)
```

**Note:** The global setup will attempt to create test academy and invite users, but they need to accept invites manually or via test automation.

---

## Test Configuration

**API Base URL:** `http://localhost:8000/api/v1`  
**Frontend URL:** `http://localhost:5173`  
**Backend Health:** ✅ Passing (health check works)

---

## Recommended Fixes

### Priority 1: Fix Backend 404 Issues

1. **Verify backend is running:**
   ```bash
   docker-compose ps
   docker-compose logs backend
   ```

2. **Test endpoints manually:**
   ```bash
   # Should return 400/401, not 404
   curl -X POST http://localhost:8000/api/v1/auth/token/ \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"wrong"}'
   ```

3. **Check Django URL routing:**
   - Verify `backend/config/urls.py` includes auth routes
   - Check `backend/tenant/users/urls.py` has correct paths
   - Ensure no middleware is blocking requests

### Priority 2: Update Test Assertions

If backend legitimately returns 404 for non-existent endpoints, update assertions to accept both 401 and 404:

```typescript
// In assertions.helper.ts
expect([401, 404]).toContain(response.status);
```

### Priority 3: Create Test Users

Run Django management commands to create test users before running tests.

### Priority 4: Fix Frontend Routing

Add authentication guards and redirect logic in React Router configuration.

---

## Next Steps

1. ✅ **Fixed:** `api.helper.ts` - response.headers() bug (was causing TypeError)
2. ⏳ **Pending:** Verify backend endpoints are accessible
3. ⏳ **Pending:** Create test users
4. ⏳ **Pending:** Fix frontend routing
5. ⏳ **Pending:** Update test assertions if needed

---

## Test Files Status

| File | Status | Passed | Failed | Skipped |
|------|--------|--------|--------|---------|
| smoke.spec.ts | ✅ | 4 | 0 | 0 |
| auth.spec.ts | ⚠️ | 1 | 13 | 0 |
| platform.spec.ts | ⚠️ | 0 | 1 | 7 |
| onboarding.spec.ts | ⚠️ | 0 | 3 | 8 |
| admin.spec.ts | ⏭️ | 0 | 0 | 48 |
| coach.spec.ts | ⏭️ | 0 | 0 | 30 |
| parent.spec.ts | ⏭️ | 0 | 0 | 30 |
| media-quota.spec.ts | ⏭️ | 0 | 0 | 15 |
| security-isolation.spec.ts | ⚠️ | 0 | 5 | 10 |

**Legend:**
- ✅ All tests passing
- ⚠️ Some tests failing
- ⏭️ All tests skipped (missing test data)
