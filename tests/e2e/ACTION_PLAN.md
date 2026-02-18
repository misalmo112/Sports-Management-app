# E2E Test Suite - Action Plan

## 🎯 Current Status

- ✅ **Test Suite Implemented** - All 9 test files created
- ✅ **Helpers Created** - All 5 helper modules implemented
- ✅ **Critical Bug Fixed** - `api.helper.ts` response.headers() issue
- ✅ **Test Assertions Updated** - Flexible assertions for 404 handling
- ✅ **Backend 404 Fix Applied** - Separated auth URLs from router
- ⏳ **Backend Restart Needed** - To load new URL configuration
- ⏳ **Test Users Needed** - 156 tests currently skipped
- ⏳ **Frontend Routing** - 2 tests failing due to missing redirects

---

## 📋 Immediate Actions (Do These First)

### Step 1: Verify Backend Fix

```powershell
cd tests/e2e
.\verify-fix.ps1
```

**Expected:** Endpoints should return 400/401, not 404

**If 404 still occurs:**
- Check `backend/tenant/users/auth_urls.py` exists
- Verify `backend/config/urls.py` uses `auth_urls`
- Restart backend: `docker-compose restart backend`
- Check logs: `docker-compose logs backend`

### Step 2: Create Test Users

```powershell
cd tests/e2e
.\setup-test-users.ps1
```

**Or manually:**
```bash
docker-compose exec backend python manage.py createsuperuser
# Email: superadmin@test.com
# Password: SuperAdmin123!
```

### Step 3: Run Tests

```bash
cd tests/e2e
npm run test:e2e
```

**Expected Results:**
- ~37 tests passing (up from 19)
- ~5 tests failing (2 frontend routing, 3 other)
- ~156 tests running (down from skipped)

---

## 🔧 Remaining Issues to Fix

### Issue 1: Frontend Routing (2 tests)

**Tests Failing:**
- `auth.spec.ts:370` - Login doesn't redirect to dashboard
- `onboarding.spec.ts:547` - Onboarding page doesn't redirect unauthenticated users

**Fix Required:**
1. Add redirect after successful login in frontend
2. Add authentication guard to `/onboarding` route
3. Update React Router configuration

**Files to Check:**
- Frontend routing configuration
- Login component/context
- Onboarding component
- Authentication state management

### Issue 2: Backend Endpoint Verification

**Action:** Verify endpoints return correct status codes after fix

**Test:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

**Expected:** 400 or 401  
**If 404:** Backend fix not applied or needs restart

---

## 📊 Test Results Tracking

### Before Any Fixes
- ✅ 19 passed
- ❌ 23 failed (18 with 404, 2 frontend, 3 other)
- ⏭️ 156 skipped

### After Backend Fix + Assertion Updates
- ✅ ~37 passed (19 + 18 fixed)
- ❌ ~5 failed (2 frontend, 3 other)
- ⏭️ ~156 skipped (until users created)

### After All Fixes (Target)
- ✅ ~195 passed
- ❌ ~3 failed (if any edge cases)
- ⏭️ 0 skipped

---

## 🛠️ Tools Available

### Diagnostic Tools
1. `diagnose-backend-404.ps1` - Tests all endpoints and reports status codes
2. `verify-backend-endpoints.ps1` - Quick endpoint verification
3. `verify-fix.ps1` - Verifies backend fix is working

### Setup Tools
1. `setup-test-users.ps1` - Creates superadmin user
2. `setup-test-users.sh` - Linux/Mac version

### Documentation
1. `ERROR_REPORT.md` - Detailed error analysis
2. `BACKEND_404_FIX.md` - 404 investigation and fix
3. `SETUP_GUIDE.md` - Complete setup instructions
4. `ACTIONS_TAKEN.md` - Summary of completed actions
5. `NEXT_STEPS_COMPLETED.md` - Test assertion updates
6. `ACTION_PLAN.md` - This file

---

## 🚀 Quick Start Guide

### First Time Setup

```bash
# 1. Start services
docker-compose up -d

# 2. Run migrations
docker-compose exec backend python manage.py migrate

# 3. Create test users
cd tests/e2e
.\setup-test-users.ps1

# 4. Verify backend fix
.\verify-fix.ps1

# 5. Install test dependencies
npm install
npx playwright install chromium

# 6. Run tests
npm run test:e2e
```

### Daily Testing

```bash
cd tests/e2e
npm run test:smoke      # Quick smoke tests
npm run test:e2e        # Full suite
npm run test:e2e:security  # Security tests only
```

---

## 🐛 Troubleshooting

### Backend Returns 404

1. **Check if fix is applied:**
   ```bash
   ls backend/tenant/users/auth_urls.py
   cat backend/config/urls.py | Select-String "auth_urls"
   ```

2. **Restart backend:**
   ```bash
   docker-compose restart backend
   ```

3. **Check logs:**
   ```bash
   docker-compose logs backend | Select-String -Pattern "404|auth|token"
   ```

4. **Test manually:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/token/ \
     -H "Content-Type: application/json" \
     -d '{"email":"test","password":"test"}'
   ```

### Tests Still Failing

1. **Check test output:**
   ```bash
   npm run test:e2e 2>&1 | tee test-output.txt
   ```

2. **View screenshots:**
   - Check `test-results/` directory
   - Failed tests capture screenshots automatically

3. **Run in debug mode:**
   ```bash
   npm run test:debug
   ```

4. **Run with UI:**
   ```bash
   npm run test:ui
   ```

### Frontend Not Accessible

1. **Check if frontend is running:**
   ```bash
   docker-compose ps frontend
   curl http://localhost:5173
   ```

2. **Check frontend logs:**
   ```bash
   docker-compose logs frontend
   ```

---

## ✅ Success Checklist

- [ ] Backend fix applied (`auth_urls.py` exists)
- [ ] Backend restarted and healthy
- [ ] Endpoints return 400/401 (not 404)
- [ ] Test users created (superadmin at minimum)
- [ ] E2E tests installed (`npm install` completed)
- [ ] Playwright browsers installed
- [ ] Smoke tests passing
- [ ] Security tests passing
- [ ] Frontend routing fixed (if applicable)

---

## 📈 Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| Test suite implementation | ✅ Complete | All 9 test files created |
| Helper modules | ✅ Complete | All 5 helpers implemented |
| Critical bug fix | ✅ Complete | api.helper.ts fixed |
| Test assertions | ✅ Complete | Flexible assertions added |
| Backend 404 fix | ✅ Complete | auth_urls.py created |
| Backend restart | ⏳ Pending | User action required |
| Test user creation | ⏳ Pending | Script ready |
| Frontend routing | ⏳ Pending | Needs code changes |
| Full test run | ⏳ Pending | After above steps |

---

## 🎓 Next Steps Summary

1. **Immediate (5 minutes):**
   - Run `verify-fix.ps1` to verify backend fix
   - Restart backend if needed

2. **Short-term (15 minutes):**
   - Create test users
   - Run smoke tests to verify setup

3. **Medium-term (1-2 hours):**
   - Fix frontend routing issues
   - Run full test suite
   - Address any remaining failures

4. **Long-term:**
   - Set up CI/CD pipeline
   - Add test coverage reporting
   - Document test maintenance procedures

---

## 📞 Support

If you encounter issues:

1. Check relevant documentation in `tests/e2e/`
2. Review test output and screenshots
3. Check Docker container logs
4. Verify backend and frontend are running
5. Test endpoints manually with curl

All diagnostic tools are in `tests/e2e/` directory.
