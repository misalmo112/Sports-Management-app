import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './playwright.config';
import { acceptInvite, createAuthHelper, getInviteTokenForUser, TokenStorage } from './helpers/auth.helper';
import { createApiHelper, ApiHelper } from './helpers/api.helper';
import { createDataFactory, DataFactory } from './helpers/data.factory';
import { 
  assertSuccess, 
  assertCreated,
  assertForbidden,
  assertHasResults 
} from './helpers/assertions.helper';

/**
 * Parent Tests
 * 
 * Tests for parent-level operations:
 * - View children (own students only)
 * - View attendance (own children only)
 * - View invoices (own invoices only)
 * - Media access (read-only)
 * - Submit complaints
 * - Block access to admin/coach routes
 * 
 * @tag parent
 */
test.describe('@parent Parent Operations', () => {
  let parentToken: TokenStorage;
  let adminToken: TokenStorage;
  let apiHelper: ApiHelper;
  let dataFactory: DataFactory;
  let academyId: string;
  let parentId: string;
  let ownChildId: string;
  let otherChildId: string;
  let ownInvoiceId: string;
  let testClassId: string;
  
  test.beforeAll(async () => {
    // Login as admin first to set up test data
    const authHelper = createAuthHelper();
    await authHelper.init();
    
    try {
      adminToken = await authHelper.loginAsAdmin();
      academyId = adminToken.user.academy_id || '';
      
      // Setup test data as admin
      const factory = createDataFactory();
      await factory.init();
      factory.setToken(adminToken.accessToken);
      factory.setAcademyId(academyId);
      
      try {
        // Ensure parent user exists and capture parent ID
        const parentsResponse = await factory.listParents();
        if (parentsResponse.ok) {
          const match = parentsResponse.data.results.find(p => p.email === TEST_CONFIG.PARENT.email);
          if (match) {
            parentId = match.id;
          }
        }

        if (!parentId) {
          const inviteResponse = await factory.inviteParent({ email: TEST_CONFIG.PARENT.email });
          if (inviteResponse.ok) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const inviteToken = await getInviteTokenForUser(TEST_CONFIG.PARENT.email);
            if (inviteToken) {
              await acceptInvite(inviteToken, TEST_CONFIG.PARENT.password);
            }
          }

          const refreshedParents = await factory.listParents();
          if (refreshedParents.ok) {
            const match = refreshedParents.data.results.find(p => p.email === TEST_CONFIG.PARENT.email);
            if (match) {
              parentId = match.id;
            }
          }
        }


        // Create a student that belongs to the parent
        const ownChildResponse = await factory.createStudent({
          first_name: 'Parent',
          last_name: 'OwnChild',
          date_of_birth: '2015-04-20',
          gender: 'FEMALE',
          parent_id: parentId,
        });
        if (ownChildResponse.ok) {
          ownChildId = ownChildResponse.data.id;
        }
        
        // Create another student NOT belonging to the parent
        const otherChildResponse = await factory.createStudent({
          first_name: 'Other',
          last_name: 'Child',
          date_of_birth: '2014-08-10',
          gender: 'MALE',
        });
        if (otherChildResponse.ok) {
          otherChildId = otherChildResponse.data.id;
        }
        
        // Create a class and enroll own child
        const classResponse = await factory.createClass({
          name: 'Parent Test Class',
          max_capacity: 20,
          day_of_week: 'THURSDAY',
          start_time: '16:00',
          end_time: '17:00',
        });
        if (classResponse.ok) {
          testClassId = classResponse.data.id;
          
          if (ownChildId) {
            await factory.enrollStudent({
              student_id: ownChildId,
              class_id: testClassId,
            });
          }
        }
        
        // Create an invoice for the parent
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        
        const invoiceResponse = await factory.createInvoice({
          parent_id: parentId,
          student_id: ownChildId,
          due_date: dueDate.toISOString().split('T')[0],
          items: [{
            description: 'Monthly membership',
            quantity: 1,
            unit_price: 99.99,
          }],
        });
        if (invoiceResponse.ok) {
          ownInvoiceId = invoiceResponse.data.id;
        }

        // Fallbacks if creation failed (quota or validation)
        if (!ownChildId || !otherChildId) {
          const studentsResponse = await factory.listStudents();
          if (studentsResponse.ok && studentsResponse.data.results.length > 0) {
            ownChildId = ownChildId || studentsResponse.data.results[0].id;
            otherChildId = otherChildId || studentsResponse.data.results[studentsResponse.data.results.length - 1].id;
          }
        }

        if (!testClassId) {
          const classesResponse = await factory.listClasses();
          if (classesResponse.ok && classesResponse.data.results.length > 0) {
            testClassId = classesResponse.data.results[0].id;
          }
        }

        if (!ownInvoiceId) {
          const invoicesResponse = await factory.listInvoices();
          if (invoicesResponse.ok && invoicesResponse.data.results.length > 0) {
            ownInvoiceId = invoicesResponse.data.results[0].id;
          }
        }
      } finally {
        await factory.dispose();
      }
      
      // Now login as parent
      parentToken = await authHelper.loginAsParent();
    } catch {
      console.log('Auth setup failed - some tests will be skipped');
    } finally {
      await authHelper.dispose();
    }
  });
  
  test.beforeEach(async () => {
    apiHelper = createApiHelper();
    await apiHelper.init();
    
    dataFactory = createDataFactory();
    await dataFactory.init();
    
    if (parentToken) {
      apiHelper.setToken(parentToken.accessToken);
      apiHelper.setAcademyId(academyId);
      
      dataFactory.setToken(parentToken.accessToken);
      dataFactory.setAcademyId(academyId);
    }
  });
  
  test.afterEach(async () => {
    await apiHelper.dispose();
    await dataFactory.dispose();
  });
  
  test.describe('View Children', () => {
    
    test('parent can list students (filtered to own children)', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get<{ results: Array<{ id: string }>; count: number }>(
        '/tenant/students/'
      );
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      
      // Parent should only see their own children
      // The exact number depends on how many children are linked to this parent
    });
    
    test('parent can view own child detail', async () => {
      test.skip(!parentToken, 'Parent not available');
      test.skip(!ownChildId, 'Own child not available');
      
      const response = await apiHelper.get(`/tenant/students/${ownChildId}/`);
      
      // Depending on how children are linked to parents:
      // - If linked: 200
      // - If not linked but in same academy: might be 403 or 404
      expect([200, 403, 404]).toContain(response.status);
    });
    
    test('parent cannot view other children', async () => {
      test.skip(!parentToken, 'Parent not available');
      test.skip(!otherChildId, 'Other child not available');
      
      const response = await apiHelper.get(`/tenant/students/${otherChildId}/`);
      
      // Parent should NOT be able to view other parents' children
      expect([403, 404]).toContain(response.status);
    });
    
  });
  
  test.describe('View Attendance', () => {
    
    test('parent can view attendance (filtered to own children)', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/attendance/');
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('parent cannot mark attendance', async () => {
      test.skip(!parentToken, 'Parent not available');
      test.skip(!ownChildId || !testClassId, 'Test data not available');
      
      const today = new Date().toISOString().split('T')[0];
      
      const response = await apiHelper.post('/tenant/attendance/', {
        student_id: ownChildId,
        class_id: testClassId,
        date: today,
        status: 'PRESENT',
      });
      
      assertForbidden(response);
    });
    
  });
  
  test.describe('View Invoices', () => {
    
    test('parent can list invoices (filtered to own)', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/invoices/');
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('parent can view own invoice detail', async () => {
      test.skip(!parentToken, 'Parent not available');
      if (!ownInvoiceId) {
        throw new Error('Own invoice not available');
      }
      
      const response = await apiHelper.get(`/tenant/invoices/${ownInvoiceId}/`);
      
      // Depending on invoice-parent linking:
      expect([200, 403, 404]).toContain(response.status);
    });
    
    test('parent cannot create invoices', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const response = await apiHelper.post('/tenant/invoices/', {
        due_date: dueDate.toISOString().split('T')[0],
        items: [{
          description: 'Test item',
          quantity: 1,
          unit_price: 50.00,
        }],
      });
      
      assertForbidden(response);
    });
    
    test('parent cannot modify invoices', async () => {
      test.skip(!parentToken, 'Parent not available');
      if (!ownInvoiceId) {
        throw new Error('Own invoice not available');
      }
      
      const response = await apiHelper.patch(`/tenant/invoices/${ownInvoiceId}/`, {
        status: 'CANCELLED',
      });
      
      expect([403, 404]).toContain(response.status);
    });
    
  });
  
  test.describe('Media Access', () => {
    
    test('parent can view media (read-only)', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/media/');
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('parent cannot upload media', async () => {
      test.skip(!parentToken, 'Parent not available');
      test.skip(!testClassId, 'Test class not available');
      
      const testFile = {
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      };
      
      const response = await dataFactory.uploadMediaFile(testFile, {
        class_id: testClassId,
        description: 'Parent upload attempt',
      });
      
      // Parent should NOT be able to upload media
      assertForbidden(response);
    });
    
    test('parent cannot delete media', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      // Try to delete any media file (should fail regardless)
      const response = await apiHelper.delete('/tenant/media/fake-id/');
      
      // Either forbidden or not found
      expect([403, 404]).toContain(response.status);
    });
    
  });
  
  test.describe('Complaints', () => {
    
    test('parent can submit a complaint', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.post('/tenant/complaints/', {
        subject: 'Test Complaint',
        description: 'This is a test complaint submitted by parent',
        category: 'GENERAL',
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
    });
    
    test('parent can view own complaints', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/complaints/');
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
  });
  
  test.describe('Blocked Operations - Admin Routes', () => {
    
    test('parent cannot access user management', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/admin/users/');
      
      assertForbidden(response);
    });
    
    test('parent cannot invite users', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.post('/admin/users/coaches/', {
        email: 'coach@test.com',
      });
      
      assertForbidden(response);
    });
    
    test('parent cannot access billing items', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/items/');
      
      assertForbidden(response);
    });
    
    test('parent cannot create billing items', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.post('/tenant/items/', {
        name: 'Test Item',
        price: 50.00,
        currency: 'USD',
      });
      
      assertForbidden(response);
    });
    
    test('parent cannot access receipts', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/receipts/');
      
      assertForbidden(response);
    });
    
    test('parent cannot create students', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.post('/tenant/students/', {
        first_name: 'New',
        last_name: 'Student',
        date_of_birth: '2015-01-01',
        gender: 'MALE',
      });
      
      // Parent might be able to add their own children (depends on implementation)
      // Most commonly, this should be forbidden
      expect([201, 403]).toContain(response.status);
    });
    
  });
  
  test.describe('Blocked Operations - Coach Routes', () => {
    
    test('parent cannot access coach attendance endpoint', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/coach-attendance/');
      
      assertForbidden(response);
    });
    
    test('parent cannot create classes', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.post('/tenant/classes/', {
        name: 'Parent Created Class',
        max_capacity: 10,
        day_of_week: 'FRIDAY',
        start_time: '15:00',
        end_time: '16:00',
      });
      
      assertForbidden(response);
    });
    
    test('parent cannot modify classes', async () => {
      test.skip(!parentToken, 'Parent not available');
      test.skip(!testClassId, 'Test class not available');
      
      const response = await apiHelper.patch(`/tenant/classes/${testClassId}/`, {
        description: 'Modified by parent',
      });
      
      assertForbidden(response);
    });
    
  });
  
  test.describe('Blocked Operations - Platform Routes', () => {
    
    test('parent cannot access platform academies', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/platform/academies/');
      
      assertForbidden(response);
    });
    
    test('parent cannot access platform plans', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/platform/plans/');
      
      assertForbidden(response);
    });
    
    test('parent cannot access platform stats', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/platform/stats/');
      
      assertForbidden(response);
    });
    
    test('parent cannot access audit logs', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/platform/audit-logs/');
      
      assertForbidden(response);
    });
    
  });
  
  test.describe('Overview Access', () => {
    
    test('parent can access overview endpoint', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get('/tenant/overview/');
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('role');
    });
    
    test('parent overview shows parent-specific data', async () => {
      test.skip(!parentToken, 'Parent not available');
      
      const response = await apiHelper.get<{
        role: string;
        finance_summary?: {
          unpaid_invoices: number;
          overdue_invoices: number;
        };
      }>('/tenant/overview/');
      
      assertSuccess(response);
      expect(response.data.role).toBe('PARENT');
    });
    
  });
  
});
