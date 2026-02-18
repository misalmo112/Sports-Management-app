import { test as setup, expect } from '@playwright/test';
import { TEST_CONFIG } from './playwright.config';
import { createAuthHelper, TokenStorage, ensureUserAuthenticated } from './helpers/auth.helper';
import { createApiHelper, ApiHelper } from './helpers/api.helper';
import { createTenantHelper, TenantHelper } from './helpers/tenant.helper';
import { createDataFactory, DataFactory } from './helpers/data.factory';
import testData from './fixtures/test-data.json';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Setup for E2E Tests
 * 
 * This setup runs once before all tests to:
 * 1. Verify services are healthy
 * 2. Create or verify superadmin exists
 * 3. Create test academy and complete onboarding
 * 4. Create test users (admin, coach, parent)
 * 5. Create reference data (students, classes, etc.)
 * 
 * The created data is stored in .auth/ directory for test use.
 */

const AUTH_DIR = path.join(__dirname, '.auth');
const STATE_FILE = path.join(AUTH_DIR, 'test-state.json');

interface TestState {
  superadmin?: TokenStorage;
  admin?: TokenStorage;
  coach?: TokenStorage;
  parent?: TokenStorage;
  academyId?: string;
  studentId?: string;
  classId?: string;
  setupComplete: boolean;
  setupTimestamp: string;
}

setup.describe.configure({ mode: 'serial' });

setup.describe('Global Setup', () => {
  let state: TestState = {
    setupComplete: false,
    setupTimestamp: new Date().toISOString(),
  };
  
  setup('verify services are healthy', async ({ request }) => {
    // Check backend health
    const healthResponse = await request.get(
      `${TEST_CONFIG.API_BASE_URL.replace('/api/v1', '')}/health/`
    );
    
    expect(healthResponse.ok()).toBe(true);
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    
    console.log('✓ Backend is healthy');
  });
  
  setup('setup superadmin authentication', async () => {
    const authHelper = createAuthHelper();
    await authHelper.init();
    
    try {
      // Try to login as superadmin
      console.log(`  Attempting login for: ${TEST_CONFIG.SUPERADMIN.email}`);
      console.log(`  API URL: ${TEST_CONFIG.API_BASE_URL}`);
      state.superadmin = await authHelper.loginAsSuperadmin();
      console.log('✓ Superadmin authenticated');
      console.log(`  User: ${state.superadmin.user.email}, Academy: ${state.superadmin.user.academy_id}`);
    } catch (error: any) {
      console.log('⚠ Superadmin login failed - may need to create via Django admin');
      console.log(`  Error: ${error.message}`);
      console.log('  Run: docker-compose exec backend python manage.py createsuperuser');
      console.log(`  Email: ${TEST_CONFIG.SUPERADMIN.email}`);
      console.log(`  Password: ${TEST_CONFIG.SUPERADMIN.password}`);
      
      // Don't fail - some tests can still run
    } finally {
      await authHelper.dispose();
    }
  });
  
  setup('setup test academy', async () => {
    if (!state.superadmin) {
      console.log('⚠ Skipping academy setup - no superadmin');
      return;
    }
    
    const tenantHelper = createTenantHelper();
    await tenantHelper.init();
    tenantHelper.setToken(state.superadmin.accessToken);
    
    try {
      // Known test academy ID with completed onboarding - try it first
      const knownTestAcademyId = 'f48d1cd0-aa77-4f95-a8f7-c2a26275e1dd';
      
      // Verify the known academy exists and has completed onboarding
      const knownResponse = await tenantHelper.getAcademy(knownTestAcademyId);
      if (knownResponse.ok && knownResponse.data.onboarding_completed === true) {
        state.academyId = knownTestAcademyId;
        console.log(`✓ Using known test academy (completed): ${state.academyId}`);
        return;
      }
      
      // Fallback: search with larger page size to find any matching completed academy
      const listResponse = await tenantHelper.listAcademies(undefined, { page_size: 500 });
      
      if (listResponse.ok) {
        // Find any academy with matching name and completed onboarding
        const existingAcademy = listResponse.data.results.find(
          (a: any) => a.name === TEST_CONFIG.TEST_ACADEMY.name && a.onboarding_completed === true
        );
        
        if (existingAcademy) {
          state.academyId = existingAcademy.id;
          console.log(`✓ Using existing test academy: ${state.academyId}`);
          return;
        }
      }
      
      // Create new test academy
      const createResponse = await tenantHelper.createAcademyAsSuperadmin(
        state.superadmin.accessToken,
        testData.admin.email,
        { name: TEST_CONFIG.TEST_ACADEMY.name }
      );
      
      if (createResponse.ok) {
        state.academyId = createResponse.data.id;
        console.log(`✓ Created test academy: ${state.academyId}`);
        
        // Complete onboarding
        try {
          await tenantHelper.completeOnboardingAsAdmin(
            state.superadmin.accessToken,
            state.academyId
          );
          console.log('✓ Completed academy onboarding');
        } catch (error) {
          console.log('⚠ Onboarding may already be complete or failed');
        }
      } else {
        console.log('⚠ Failed to create test academy:', createResponse.data);
      }
    } finally {
      await tenantHelper.dispose();
    }
  });
  
  setup('setup admin user', async () => {
    if (!state.superadmin || !state.academyId) {
      console.log('⚠ Skipping admin setup - no superadmin or academy');
      return;
    }
    
    const authHelper = createAuthHelper();
    await authHelper.init();
    
    try {
      // Try to login as admin first
      try {
        state.admin = await authHelper.loginAsAdmin();
        console.log('✓ Admin authenticated');
      } catch (error) {
        console.log('⚠ Admin login failed - attempting to create/accept invite...');
        
        // Use ensureUserAuthenticated to create user and accept invite
        const adminToken = await ensureUserAuthenticated(
          testData.admin.email,
          testData.admin.password,
          'ADMIN',
          state.academyId,
          state.superadmin.accessToken
        );
        
        if (adminToken) {
          state.admin = adminToken;
          console.log('✓ Admin created and authenticated');
        } else {
          console.log('⚠ Failed to create/authenticate admin user');
        }
      }
    } finally {
      await authHelper.dispose();
    }
  });
  
  setup('setup coach user', async () => {
    if (!state.admin || !state.academyId) {
      console.log('⚠ Skipping coach setup - no admin or academy');
      return;
    }
    
    const authHelper = createAuthHelper();
    await authHelper.init();
    
    try {
      // Try to login as coach first
      try {
        state.coach = await authHelper.loginAsCoach();
        console.log('✓ Coach authenticated');
      } catch (error) {
        console.log('⚠ Coach login failed - attempting to create/accept invite...');
        
        // Use ensureUserAuthenticated to create user and accept invite
        const coachToken = await ensureUserAuthenticated(
          testData.coach.email,
          testData.coach.password,
          'COACH',
          state.academyId,
          state.admin.accessToken
        );
        
        if (coachToken) {
          state.coach = coachToken;
          console.log('✓ Coach created and authenticated');
        } else {
          console.log('⚠ Failed to create/authenticate coach user');
        }
      }
    } finally {
      await authHelper.dispose();
    }
  });
  
  setup('setup parent user', async () => {
    if (!state.admin || !state.academyId) {
      console.log('⚠ Skipping parent setup - no admin or academy');
      return;
    }
    
    const authHelper = createAuthHelper();
    await authHelper.init();
    
    try {
      // Try to login as parent first
      try {
        state.parent = await authHelper.loginAsParent();
        console.log('✓ Parent authenticated');
      } catch (error) {
        console.log('⚠ Parent login failed - attempting to create/accept invite...');
        
        // Use ensureUserAuthenticated to create user and accept invite
        const parentToken = await ensureUserAuthenticated(
          testData.parent.email,
          testData.parent.password,
          'PARENT',
          state.academyId,
          state.admin.accessToken
        );
        
        if (parentToken) {
          state.parent = parentToken;
          console.log('✓ Parent created and authenticated');
        } else {
          console.log('⚠ Failed to create/authenticate parent user');
        }
      }
    } finally {
      await authHelper.dispose();
    }
  });
  
  setup('setup reference data', async () => {
    if (!state.admin || !state.academyId) {
      console.log('⚠ Skipping reference data setup - no admin or academy');
      return;
    }
    
    const dataFactory = createDataFactory();
    await dataFactory.init();
    dataFactory.setToken(state.admin.accessToken);
    dataFactory.setAcademyId(state.academyId);
    
    try {
      // Clean up old test classes to free up quota before creating new ones
      console.log('  Cleaning up old test classes...');
      const cleanupResult = await dataFactory.cleanupTestClasses({
        token: state.admin.accessToken,
        academyId: state.academyId,
        keepCount: 5, // Keep only 5 most recent test classes
        pattern: 'Test Class'
      });
      if (cleanupResult.deleted > 0) {
        console.log(`  ✓ Deleted ${cleanupResult.deleted} old test classes, kept ${cleanupResult.kept}`);
      }
      
      // Create a test student
      const studentResponse = await dataFactory.createStudent({
        first_name: testData.student.first_name,
        last_name: testData.student.last_name,
        date_of_birth: testData.student.date_of_birth,
        gender: testData.student.gender,
      });
      
      if (studentResponse.ok) {
        state.studentId = studentResponse.data.id;
        console.log(`✓ Created test student: ${state.studentId}`);
      } else {
        console.log(`⚠ Failed to create student: ${studentResponse.status} - ${JSON.stringify(studentResponse.data)}`);
      }
      
      // Create a test class (with retry if quota exceeded)
      let classResponse = await dataFactory.createClass({
        name: testData.class.name,
        description: testData.class.description,
        max_capacity: testData.class.max_capacity,
        day_of_week: testData.class.day_of_week,
        start_time: testData.class.start_time,
        end_time: testData.class.end_time,
      });
      
      // If quota exceeded, try to increase quota or clean up more
      if (!classResponse.ok && classResponse.status === 403) {
        const errorData = classResponse.data as any;
        if (errorData.detail?.includes('Quota exceeded')) {
          console.log('  Quota exceeded, attempting to increase quota...');
          
          // Try to increase quota via superadmin
          if (state.superadmin) {
            const tenantHelper = createTenantHelper();
            await tenantHelper.init();
            tenantHelper.setToken(state.superadmin.accessToken);
            
            try {
              // Increase max_classes quota significantly
              const quotaResponse = await tenantHelper.updateAcademyQuota(
                state.academyId,
                { max_classes: 10000 }, // Very high quota for test academy
                state.superadmin.accessToken
              );
              
              if (quotaResponse.ok) {
                console.log('  ✓ Increased academy quota');
                // Retry class creation
                classResponse = await dataFactory.createClass({
                  name: testData.class.name,
                  description: testData.class.description,
                  max_capacity: testData.class.max_capacity,
                  day_of_week: testData.class.day_of_week,
                  start_time: testData.class.start_time,
                  end_time: testData.class.end_time,
                });
              }
            } catch (quotaError) {
              console.log('  ⚠ Could not increase quota (may need subscription)');
            } finally {
              await tenantHelper.dispose();
            }
          }
        }
      }
      
      if (classResponse.ok) {
        state.classId = classResponse.data.id;
        console.log(`✓ Created test class: ${state.classId}`);
        
        // Enroll student in class
        if (state.studentId) {
          const enrollResponse = await dataFactory.enrollStudent({
            student_id: state.studentId,
            class_id: state.classId,
          });
          
          if (enrollResponse.ok) {
            console.log('✓ Enrolled student in class');
          } else {
            console.log(`⚠ Failed to enroll student: ${enrollResponse.status} - ${JSON.stringify(enrollResponse.data)}`);
          }
        }
      } else {
        console.log(`⚠ Failed to create class: ${classResponse.status} - ${JSON.stringify(classResponse.data)}`);
      }
      
      // Create billing item
      const itemResponse = await dataFactory.createBillingItem({
        name: testData.billingItem.name,
        description: testData.billingItem.description,
        price: testData.billingItem.price,
        currency: testData.billingItem.currency,
      });
      
      if (itemResponse.ok) {
        console.log('✓ Created test billing item');
      } else {
        console.log(`⚠ Failed to create billing item: ${itemResponse.status} - ${JSON.stringify(itemResponse.data)}`);
      }
    } finally {
      await dataFactory.dispose();
    }
  });
  
  setup('save test state', async () => {
    // Ensure auth directory exists
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    
    state.setupComplete = true;
    state.setupTimestamp = new Date().toISOString();
    
    // Save state for tests to use
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    
    console.log('\n=== Global Setup Complete ===');
    console.log(`Academy ID: ${state.academyId || 'Not created'}`);
    console.log(`Superadmin: ${state.superadmin ? '✓' : '✗'}`);
    console.log(`Admin: ${state.admin ? '✓' : '✗'}`);
    console.log(`Coach: ${state.coach ? '✓' : '✗'}`);
    console.log(`Parent: ${state.parent ? '✓' : '✗'}`);
    console.log(`Student ID: ${state.studentId || 'Not created'}`);
    console.log(`Class ID: ${state.classId || 'Not created'}`);
    console.log('==============================\n');
  });
});

/**
 * Load saved test state
 */
export function loadTestState(): TestState | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // State file doesn't exist or is invalid
  }
  return null;
}
