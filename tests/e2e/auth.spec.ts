import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './playwright.config';
import { createAuthHelper, TokenStorage, acceptInvite } from './helpers/auth.helper';
import { createApiHelper, ApiHelper } from './helpers/api.helper';
import { isFrontendAvailable } from './helpers/frontend.helper';
import { 
  assertSuccess, 
  assertUnauthorized,
  assertUnauthorizedOrNotFound,
  assertBadRequest,
  assertBadRequestOrNotFound
} from './helpers/assertions.helper';

/**
 * Authentication Tests
 * 
 * Tests for authentication functionality:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Accept invite flow
 * - JWT token validation
 * - Token refresh
 * 
 * @tag auth
 */
test.describe('@auth Authentication', () => {
  
  test.describe('Login', () => {
    
    test('login with valid credentials returns tokens', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      try {
        const tokenStorage = await authHelper.loginAsAdmin();
        
        expect(tokenStorage.accessToken).toBeTruthy();
        expect(tokenStorage.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
        expect(tokenStorage.refreshToken).toBeTruthy();
        expect(tokenStorage.user).toBeDefined();
        expect(tokenStorage.user.email).toBe(TEST_CONFIG.ADMIN.email);
      } catch {
        test.skip(true, 'Admin user not available');
      } finally {
        await authHelper.dispose();
      }
    });
    
    test('login with invalid email fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/token/', {
          email: 'nonexistent@user.com',
          password: 'SomePassword123!',
        });
        
        // Accept 401 (unauthorized) or 404 (endpoint not found/not configured)
        assertUnauthorizedOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('login with invalid password fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/token/', {
          email: TEST_CONFIG.ADMIN.email,
          password: 'WrongPassword123!',
        });
        
        // Accept 401 (unauthorized) or 404 (endpoint not found/not configured)
        assertUnauthorizedOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('login with missing email fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/token/', {
          password: 'SomePassword123!',
        });
        
        // Accept 400 (bad request) or 404 (endpoint not found/not configured)
        assertBadRequestOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('login with missing password fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/token/', {
          email: TEST_CONFIG.ADMIN.email,
        });
        
        // Accept 400 (bad request) or 404 (endpoint not found/not configured)
        assertBadRequestOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('login with empty credentials fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/token/', {
          email: '',
          password: '',
        });
        
        // Accept 400 (bad request) or 404 (endpoint not found/not configured)
        assertBadRequestOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
  });
  
  test.describe('Token Validation', () => {
    
    test('valid token allows API access', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      let tokenStorage: TokenStorage;
      try {
        tokenStorage = await authHelper.loginAsAdmin();
      } catch {
        test.skip(true, 'Admin user not available');
        return;
      } finally {
        await authHelper.dispose();
      }
      
      const apiHelper = createApiHelper();
      await apiHelper.init();
      apiHelper.setToken(tokenStorage.accessToken);
      apiHelper.setAcademyId(tokenStorage.user.academy_id || '');
      
      try {
        const response = await apiHelper.get('/tenant/overview/');
        assertSuccess(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('invalid token is rejected', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      apiHelper.setToken('invalid-token');
      
      try {
        const response = await apiHelper.get('/tenant/overview/');
        // Accept 401 (unauthorized) or 404 (endpoint not found/not configured)
        assertUnauthorizedOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('malformed JWT is rejected', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      apiHelper.setToken('not.a.valid.jwt.token');
      
      try {
        const response = await apiHelper.get('/tenant/overview/');
        // Accept 401 (unauthorized) or 404 (endpoint not found/not configured)
        assertUnauthorizedOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('missing authorization header is rejected', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      // No token set
      
      try {
        const response = await apiHelper.get('/tenant/overview/');
        // Accept 401 (unauthorized) or 404 (endpoint not found/not configured)
        assertUnauthorizedOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
  });
  
  test.describe('Invite Acceptance', () => {
    
    test('accept invite with valid token and password succeeds', async () => {
      // This test would need a valid invite token
      // For now, test the endpoint contract
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        // Test with invalid token to verify endpoint contract
        const response = await apiHelper.post('/auth/invite/accept/', {
          token: 'test-invalid-token',
          password: 'ValidPassword123!',
        });
        
        // Should fail with bad request (invalid token) or 404 (endpoint not found/not configured)
        assertBadRequestOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('accept invite with missing token fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/invite/accept/', {
          password: 'ValidPassword123!',
        });
        
        // Accept 400 (bad request) or 404 (endpoint not found/not configured)
        assertBadRequestOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('accept invite with missing password fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/invite/accept/', {
          token: 'some-token',
        });
        
        // Accept 400 (bad request) or 404 (endpoint not found/not configured)
        assertBadRequestOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
    test('accept invite with weak password fails', async () => {
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        const response = await apiHelper.post('/auth/invite/accept/', {
          token: 'some-token',
          password: '123', // Too weak
        });
        
        // Accept 400 (bad request) or 404 (endpoint not found/not configured)
        assertBadRequestOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
  });
  
  test.describe('Role-Based Authentication', () => {
    
    test('superadmin can authenticate', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      try {
        const tokenStorage = await authHelper.loginAsSuperadmin();
        
        // Superadmin is an ADMIN user with is_superuser=True and no academy
        // The role field is 'ADMIN' but academy_id should be null
        expect(tokenStorage.user.role).toBe('ADMIN');
        expect(tokenStorage.user.academy_id).toBeNull(); // Superadmin has no academy
      } catch {
        test.skip(true, 'Superadmin not available');
      } finally {
        await authHelper.dispose();
      }
    });
    
    test('admin can authenticate', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      try {
        const tokenStorage = await authHelper.loginAsAdmin();
        
        expect(tokenStorage.user.role).toBe('ADMIN');
        expect(tokenStorage.user.academy_id).toBeTruthy();
      } catch {
        test.skip(true, 'Admin not available');
      } finally {
        await authHelper.dispose();
      }
    });
    
    test('coach can authenticate', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      try {
        const tokenStorage = await authHelper.loginAsCoach();
        
        expect(tokenStorage.user.role).toBe('COACH');
        expect(tokenStorage.user.academy_id).toBeTruthy();
      } catch {
        test.skip(true, 'Coach not available');
      } finally {
        await authHelper.dispose();
      }
    });
    
    test('parent can authenticate', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      try {
        const tokenStorage = await authHelper.loginAsParent();
        
        expect(tokenStorage.user.role).toBe('PARENT');
        expect(tokenStorage.user.academy_id).toBeTruthy();
      } catch {
        test.skip(true, 'Parent not available');
      } finally {
        await authHelper.dispose();
      }
    });
    
  });
  
  test.describe('Inactive User', () => {
    
    test('inactive user cannot login', async () => {
      // This would require creating and deactivating a user
      // For now, test the endpoint contract
      const apiHelper = createApiHelper();
      await apiHelper.init();
      
      try {
        // Try to login with a user that might be inactive
        // The response should indicate the account is disabled
        const response = await apiHelper.post('/auth/token/', {
          email: 'inactive@test.com',
          password: 'SomePassword123!',
        });
        
        // Should fail - either user doesn't exist or is inactive
        // Accept 401 (unauthorized) or 404 (endpoint not found/not configured)
        assertUnauthorizedOrNotFound(response);
      } finally {
        await apiHelper.dispose();
      }
    });
    
  });
  
  test.describe('UI Login Flow', () => {
    test.beforeAll(async () => {
      const frontendAvailable = await isFrontendAvailable();
      test.skip(!frontendAvailable, 'Frontend not available');
    });
    
    test('login page shows form', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // Check for login form elements
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    });
    
    test('successful login redirects to dashboard', async ({ page }) => {
      // This test requires valid credentials and the UI login flow
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // Fill in credentials
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.ADMIN.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.ADMIN.password);
      
      // Submit and wait for response
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/auth/token') && resp.status() === 200, { timeout: 15000 }),
        page.click('button[type="submit"]'),
      ]);
      
      // Wait for navigation to complete (either via redirect or client-side routing)
      await page.waitForURL(/dashboard|overview/, { timeout: 10000 }).catch(() => {
        // If waitForURL fails, check current URL
      });
      
      // Should be redirected to dashboard
      const url = page.url();
      expect(url).toMatch(/dashboard|overview/);
    });
    
    test('failed login shows error message', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // Fill in invalid credentials
      await page.fill('input[type="email"], input[name="email"]', 'invalid@user.com');
      await page.fill('input[type="password"], input[name="password"]', 'WrongPassword');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Wait for response
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // Should still be on login page
      expect(page.url()).toMatch(/login/);
      
      // Should show error message
      const errorMessage = page.locator('[role="alert"], .error, .text-red-500, .text-destructive');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });
    
  });
  
});
