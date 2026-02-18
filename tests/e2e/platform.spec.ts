import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './playwright.config';
import { createAuthHelper, TokenStorage } from './helpers/auth.helper';
import { createApiHelper, ApiHelper } from './helpers/api.helper';
import { createTenantHelper, Academy } from './helpers/tenant.helper';
import { 
  assertSuccess, 
  assertCreated, 
  assertForbidden, 
  assertHasResults,
  assertUnauthorized,
  assertUnauthorizedOrNotFound
} from './helpers/assertions.helper';

/**
 * Platform Tests - Superadmin operations
 * 
 * Tests for platform-level operations that only superadmin can perform:
 * - Academy management (CRUD)
 * - Plan management
 * - Stats and analytics
 * - Audit logs
 * 
 * @tag platform
 */
test.describe('@platform Superadmin Platform Operations', () => {
  let superadminToken: TokenStorage;
  let apiHelper: ApiHelper;
  
  test.beforeAll(async () => {
    const authHelper = createAuthHelper();
    await authHelper.init();
    
    try {
      superadminToken = await authHelper.loginAsSuperadmin();
    } catch (error) {
      console.log('Superadmin login failed - tests will be skipped');
    } finally {
      await authHelper.dispose();
    }
  });
  
  test.beforeEach(async () => {
    apiHelper = createApiHelper();
    await apiHelper.init();
    
    if (superadminToken) {
      apiHelper.setToken(superadminToken.accessToken);
    }
  });
  
  test.afterEach(async () => {
    await apiHelper.dispose();
  });
  
  test.describe('Academy Management', () => {
    let createdAcademyId: string;
    let academyPlanId: string;

    test.beforeAll(async () => {
      if (!superadminToken) return;

      const helper = createApiHelper();
      await helper.init();
      helper.setToken(superadminToken.accessToken);

      try {
        const uniqueSuffix = Date.now();
        const academyData = {
          name: `Seed Academy ${uniqueSuffix}`,
          owner_email: `seed-owner-${uniqueSuffix}@test.com`,
        };

        const response = await helper.post<Academy>(
          '/platform/academies/',
          academyData
        );

        if (response.ok) {
          createdAcademyId = response.data.id;
        }

        const planResponse = await helper.post<{ id: string }>(
          '/platform/plans/',
          {
            name: `Seed Plan ${uniqueSuffix}`,
            description: 'Seed plan for academy update tests',
            price: 49.99,
            currency: 'USD',
            billing_cycle: 'MONTHLY',
            limits_json: {
              storage_bytes: 1073741824,
              max_students: 50,
              max_coaches: 5,
              max_admins: 2,
              max_classes: 20,
            },
          }
        );

        if (planResponse.ok) {
          academyPlanId = planResponse.data.id;
        }

        if (createdAcademyId && academyPlanId) {
          const planAssignResponse = await helper.patch(
            `/platform/academies/${createdAcademyId}/plan/`,
            { plan_id: academyPlanId }
          );
          if (!planAssignResponse.ok) {
            console.log(`Failed to assign plan to academy: ${planAssignResponse.status} - ${JSON.stringify(planAssignResponse.data)}`);
          }
        }
      } finally {
        await helper.dispose();
      }
    });
    
    test('superadmin can list academies', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const response = await apiHelper.get<{ results: Academy[]; count: number }>(
        '/platform/academies/'
      );
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      expect(response.data).toHaveProperty('count');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
    
    test('superadmin can create academy with admin invite', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const uniqueSuffix = Date.now();
      const academyData = {
        name: `Test Academy ${uniqueSuffix}`,
        owner_email: `owner${uniqueSuffix}@test.com`,
      };
      
      const response = await apiHelper.post<Academy>(
        '/platform/academies/',
        academyData
      );
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(academyData.name);
      expect(response.data.onboarding_completed).toBe(false);
      
      createdAcademyId = response.data.id;
    });
    
    test('superadmin can view academy detail', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      test.skip(!createdAcademyId, 'No academy created');
      
      const response = await apiHelper.get<Academy>(
        `/platform/academies/${createdAcademyId}/`
      );
      
      assertSuccess(response);
      expect(response.data.id).toBe(createdAcademyId);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('onboarding_completed');
    });
    
    test('superadmin can update academy quota', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      test.skip(!createdAcademyId, 'No academy created');
      
      const quotaUpdate = {
        storage_bytes: 5368709120, // 5GB
        max_students: 50,
        max_coaches: 5,
      };
      
      const response = await apiHelper.patch<Academy>(
        `/platform/academies/${createdAcademyId}/quota/`,
        { overrides_json: quotaUpdate }
      );
      
      assertSuccess(response);
    });
    
    test('superadmin can update academy plan', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      test.skip(!createdAcademyId, 'No academy created');
      test.skip(!academyPlanId, 'No plan available to assign');

      const response = await apiHelper.patch<Academy>(
        `/platform/academies/${createdAcademyId}/plan/`,
        { plan_id: academyPlanId }
      );
      
      assertSuccess(response);
    });
    
  });
  
  test.describe('Plan Management', () => {
    let createdPlanId: string;

    test.beforeAll(async () => {
      if (!superadminToken) return;

      const helper = createApiHelper();
      await helper.init();
      helper.setToken(superadminToken.accessToken);

      try {
        const uniqueSuffix = Date.now();
        const planData = {
          name: `Seed Plan ${uniqueSuffix}`,
          description: 'Seed plan for view/update tests',
          price: 19.99,
          currency: 'USD',
          billing_cycle: 'MONTHLY',
          limits_json: {
            storage_bytes: 2147483648,
            max_students: 25,
            max_coaches: 3,
            max_admins: 1,
            max_classes: 10,
          },
        };

        const response = await helper.post<{ id: string; name: string }>(
          '/platform/plans/',
          planData
        );

        if (response.ok) {
          createdPlanId = response.data.id;
        }
      } finally {
        await helper.dispose();
      }
    });
    
    test('superadmin can list plans', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const response = await apiHelper.get<{ results: Array<{ id: string; name: string }>; count: number }>(
        '/platform/plans/'
      );
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
    
    test('superadmin can create a plan', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const uniqueSuffix = Date.now();
      const planData = {
        name: `Test Plan ${uniqueSuffix}`,
        description: 'A test plan for E2E testing',
        price: 99.99,
        currency: 'USD',
        billing_cycle: 'MONTHLY',
        limits_json: {
          storage_bytes: 10737418240, // 10GB
          max_students: 100,
          max_coaches: 10,
          max_admins: 5,
          max_classes: 50,
        },
      };
      
      const response = await apiHelper.post<{ id: string; name: string }>(
        '/platform/plans/',
        planData
      );
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(planData.name);
      
      createdPlanId = response.data.id;
    });
    
    test('superadmin can view plan detail', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      test.skip(!createdPlanId, 'No plan created');
      
      const response = await apiHelper.get<{ id: string; name: string }>(
        `/platform/plans/${createdPlanId}/`
      );
      
      assertSuccess(response);
      expect(response.data.id).toBe(createdPlanId);
    });
    
    test('superadmin can update a plan', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      test.skip(!createdPlanId, 'No plan created');
      
      const updateData = {
        description: 'Updated description for E2E testing',
      };
      
      const response = await apiHelper.patch<{ id: string }>(
        `/platform/plans/${createdPlanId}/`,
        updateData
      );
      
      assertSuccess(response);
    });
    
  });
  
  test.describe('Platform Stats', () => {
    
    test('superadmin can view platform stats', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const response = await apiHelper.get<{
        total_academies?: number;
        active_academies?: number;
        total_users?: number;
      }>('/platform/stats/');
      
      assertSuccess(response);
      expect(response.data).toBeDefined();
    });
    
  });
  
  test.describe('Audit Logs', () => {
    
    test('superadmin can view audit logs', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const response = await apiHelper.get<{ results: Array<unknown>; count: number }>(
        '/platform/audit-logs/'
      );
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
    
    test('superadmin can filter audit logs by action', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const response = await apiHelper.get<{ results: Array<unknown>; count: number }>(
        '/platform/audit-logs/',
        { params: { action: 'CREATE' } }
      );
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
  });
  
  test.describe('Platform Errors', () => {
    
    test('superadmin can view platform errors', async () => {
      test.skip(!superadminToken, 'Superadmin not available');
      
      const response = await apiHelper.get<{ results: Array<unknown>; count: number }>(
        '/platform/errors/'
      );
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
    
  });
  
  test.describe('Access Control', () => {
    
    test('non-superadmin cannot access platform endpoints', async () => {
      // Login as regular admin
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      let adminToken: TokenStorage;
      try {
        adminToken = await authHelper.loginAsAdmin();
      } catch {
        test.skip(true, 'Admin user not available');
        return;
      } finally {
        await authHelper.dispose();
      }
      
      const adminApiHelper = createApiHelper();
      await adminApiHelper.init();
      adminApiHelper.setToken(adminToken.accessToken);
      
      try {
        // Admin should NOT be able to list all academies
        const response = await adminApiHelper.get('/platform/academies/');
        assertForbidden(response);
      } finally {
        await adminApiHelper.dispose();
      }
    });
    
    test('coach cannot access platform endpoints', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      let coachToken: TokenStorage;
      try {
        coachToken = await authHelper.loginAsCoach();
      } catch {
        test.skip(true, 'Coach user not available');
        return;
      } finally {
        await authHelper.dispose();
      }
      
      const coachApiHelper = createApiHelper();
      await coachApiHelper.init();
      coachApiHelper.setToken(coachToken.accessToken);
      
      try {
        const response = await coachApiHelper.get('/platform/academies/');
        assertForbidden(response);
      } finally {
        await coachApiHelper.dispose();
      }
    });
    
    test('parent cannot access platform endpoints', async () => {
      const authHelper = createAuthHelper();
      await authHelper.init();
      
      let parentToken: TokenStorage;
      try {
        parentToken = await authHelper.loginAsParent();
      } catch {
        test.skip(true, 'Parent user not available');
        return;
      } finally {
        await authHelper.dispose();
      }
      
      const parentApiHelper = createApiHelper();
      await parentApiHelper.init();
      parentApiHelper.setToken(parentToken.accessToken);
      
      try {
        const response = await parentApiHelper.get('/platform/academies/');
        assertForbidden(response);
      } finally {
        await parentApiHelper.dispose();
      }
    });
    
    test('unauthenticated user cannot access platform endpoints', async () => {
      const unauthApiHelper = createApiHelper();
      await unauthApiHelper.init();
      
      try {
        const response = await unauthApiHelper.get('/platform/academies/');
        // Accept 401 (unauthorized) or 404 (endpoint not found/not configured)
        assertUnauthorizedOrNotFound(response);
      } finally {
        await unauthApiHelper.dispose();
      }
    });
    
  });
  
});
