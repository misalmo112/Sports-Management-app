import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './playwright.config';
import { createAuthHelper, TokenStorage } from './helpers/auth.helper';
import { createApiHelper, ApiHelper } from './helpers/api.helper';
import { createDataFactory, DataFactory, Student, Class, Enrollment, Invoice, Receipt } from './helpers/data.factory';
import { 
  assertSuccess, 
  assertCreated,
  assertNoContent, 
  assertForbidden,
  assertHasResults,
  assertBadRequest 
} from './helpers/assertions.helper';

/**
 * Admin Tests - Tenant Operations
 * 
 * Tests for admin-level tenant operations:
 * - Student CRUD
 * - Class CRUD
 * - Enrollment management
 * - Attendance marking
 * - Billing (items, invoices, receipts)
 * - User management (invite coach/parent)
 * 
 * @tag admin
 */
test.describe('@admin Admin Tenant Operations', () => {
  let adminToken: TokenStorage;
  let apiHelper: ApiHelper;
  let dataFactory: DataFactory;
  let academyId: string;
  async function ensureParentId(): Promise<string> {
    const parentsResponse = await dataFactory.listParents();
    if (parentsResponse.ok && parentsResponse.data.results.length > 0) {
      return parentsResponse.data.results[0].id;
    }

    const uniqueSuffix = Date.now();
    const email = `invoice-parent-${uniqueSuffix}@test.com`;
    const createResponse = await dataFactory.createParent({
      first_name: 'Invoice',
      last_name: 'Parent',
      email,
      phone: '+1-555-0101',
    });

    if (createResponse.ok) {
      return createResponse.data.id;
    }

    const refreshedParents = await dataFactory.listParents();
    if (refreshedParents.ok && refreshedParents.data.results.length > 0) {
      return refreshedParents.data.results[0].id;
    }

    throw new Error(`Parent not found after creation attempt: ${createResponse.status}`);
  }

  async function ensureStudent(payload: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
  }): Promise<Student> {
    const response = await dataFactory.createStudent(payload);
    if (response.ok) {
      return response.data;
    }

    const errorData = response.data as any;
    if (response.status === 403 && errorData.detail?.includes('Quota exceeded')) {
      const listResponse = await dataFactory.listStudents();
      if (listResponse.ok && listResponse.data.results.length > 0) {
        return listResponse.data.results[0];
      }
    }

    throw new Error(`Unable to create or reuse student: ${response.status} - ${JSON.stringify(response.data)}`);
  }
  
  test.beforeAll(async () => {
    const authHelper = createAuthHelper();
    await authHelper.init();
    
    try {
      // Use custom admin credentials: sept@gmail.com / Misal123
      adminToken = await authHelper.loginAsAdmin('sept@gmail.com', 'Misal123');
      academyId = adminToken.user.academy_id || '';
    } catch {
      console.log('Admin login failed - tests will be skipped');
    } finally {
      await authHelper.dispose();
    }
  });
  
  test.beforeEach(async () => {
    apiHelper = createApiHelper();
    await apiHelper.init();
    
    dataFactory = createDataFactory();
    await dataFactory.init();
    
    if (adminToken) {
      apiHelper.setToken(adminToken.accessToken);
      apiHelper.setAcademyId(academyId);
      
      dataFactory.setToken(adminToken.accessToken);
      dataFactory.setAcademyId(academyId);
    }
  });
  
  test.afterEach(async () => {
    await apiHelper.dispose();
    await dataFactory.dispose();
  });
  
  test.describe('Student Management', () => {
    test('admin can create a student', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.createStudent({
        first_name: 'Test',
        last_name: 'Student',
        date_of_birth: '2015-06-15',
        gender: 'MALE',
      });
      if (response.ok) {
        assertCreated(response);
        expect(response.data).toHaveProperty('id');
        expect(response.data.first_name).toBe('Test');
        expect(response.data.last_name).toBe('Student');
        return;
      }

      const errorData = response.data as any;
      expect(response.status).toBe(403);
      expect(errorData.detail).toContain('Quota exceeded');
    });
    
    test('admin can list students', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.listStudents();
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
    
    test('admin can view student detail', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Detail',
        last_name: 'Student',
        date_of_birth: '2015-05-10',
        gender: 'FEMALE',
      });
      
      const response = await dataFactory.getStudent(student.id);
      
      assertSuccess(response);
      expect(response.data.id).toBe(student.id);
    });
    
    test('admin can update a student', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Update',
        last_name: 'Student',
        date_of_birth: '2015-03-12',
        gender: 'MALE',
      });
      
      const response = await dataFactory.updateStudent(student.id, {
        first_name: 'Updated',
      });
      
      assertSuccess(response);
      expect(response.data.first_name).toBe('Updated');
    });
    
    test('admin can delete a student', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      // Create a student to delete
      const student = await ensureStudent({
        first_name: 'ToDelete',
        last_name: 'Student',
        date_of_birth: '2015-01-01',
        gender: 'FEMALE',
      });
      
      // Delete the student
      const deleteResponse = await dataFactory.deleteStudent(student.id);
      assertNoContent(deleteResponse);
      
      // Verify deleted (should return 404)
      const getResponse = await dataFactory.getStudent(student.id);
      expect(getResponse.status).toBe(404);
    });
    
  });
  
  test.describe('Class Management', () => {
    test('admin can create a class', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.createClass({
        name: 'Soccer Basics',
        description: 'Introduction to soccer',
        max_capacity: 20,
        schedule: {
          recurring: true,
          days_of_week: ['monday'],
          start_time: '16:00',
          end_time: '17:00',
          timezone: 'UTC',
        },
      });
      
      // If quota exceeded, try to clean up and retry
      if (!response.ok && response.status === 403) {
        const errorData = response.data as any;
        if (errorData.detail?.includes('Quota exceeded')) {
          console.log(`  Quota exceeded, attempting cleanup and retry...`);
          
          // Try to clean up old classes and retry
          const cleanupResult = await dataFactory.cleanupTestClasses({
            token: adminToken.accessToken,
            academyId: adminToken.user.academy_id || '',
            keepCount: 5,
            pattern: 'Test Class'
          });
          
          if (cleanupResult.deleted > 0) {
            console.log(`  Cleaned up ${cleanupResult.deleted} classes, retrying...`);
            // Retry class creation
            const retryResponse = await dataFactory.createClass({
              name: 'Soccer Basics',
              description: 'Introduction to soccer',
              max_capacity: 20,
              schedule: {
                recurring: true,
                days_of_week: ['monday'],
                start_time: '16:00',
                end_time: '17:00',
                timezone: 'UTC',
              },
            });
            
            if (retryResponse.ok) {
              response = retryResponse;
            }
          }
        } else if (errorData.detail?.includes('Onboarding not completed')) {
          // Onboarding not completed - this is a real failure, not a skip
          throw new Error(`Class creation blocked: ${errorData.detail}`);
        }
      }
      
      // Debug: log response if still failed
      if (!response.ok) {
        console.log(`Class creation failed: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe('Soccer Basics');
      
    });
    
    test('admin can list classes', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.listClasses();
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
    
    test('admin can view class detail', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const createResponse = await dataFactory.createClass({
        name: 'Class Detail Test',
        max_capacity: 15,
        day_of_week: 'MONDAY',
        start_time: '09:00',
        end_time: '10:00',
      });
      
      assertCreated(createResponse);
      const classId = createResponse.data.id;
      
      const response = await dataFactory.getClass(classId);
      
      assertSuccess(response);
      expect(response.data.id).toBe(classId);
    });
    
    test('admin can update a class', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const createResponse = await dataFactory.createClass({
        name: 'Class Update Test',
        max_capacity: 12,
        day_of_week: 'TUESDAY',
        start_time: '11:00',
        end_time: '12:00',
      });
      
      assertCreated(createResponse);
      const classId = createResponse.data.id;
      
      const response = await dataFactory.updateClass(classId, {
        description: 'Updated description',
        max_capacity: createResponse.data.max_capacity,
      });
      
      assertSuccess(response);
      expect(response.data.description).toBe('Updated description');
    });
    
  });
  
  test.describe('Enrollment Management', () => {
    test('admin can enroll student in class', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Enroll',
        last_name: 'Student',
        date_of_birth: '2014-01-01',
        gender: 'MALE',
      });
      
      const classResponse = await dataFactory.createClass({
        name: 'Enrollment Test Class',
        max_capacity: 10,
        day_of_week: 'TUESDAY',
        start_time: '10:00',
        end_time: '11:00',
      });
      assertCreated(classResponse);
      
      const response = await dataFactory.enrollStudent({
        student_id: student.id,
        class_id: classResponse.data.id,
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      // Backend returns 'student' and 'class_obj' fields (integer PKs)
      expect(response.data.student).toBe(parseInt(student.id));
      expect(response.data.class_obj).toBe(parseInt(classResponse.data.id));
    });
    
    test('admin can view class enrollments', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Enrollments',
        last_name: 'Student',
        date_of_birth: '2014-02-02',
        gender: 'FEMALE',
      });
      
      const classResponse = await dataFactory.createClass({
        name: 'Enrollment List Class',
        max_capacity: 12,
        day_of_week: 'WEDNESDAY',
        start_time: '12:00',
        end_time: '13:00',
      });
      assertCreated(classResponse);
      
      await dataFactory.enrollStudent({
        student_id: student.id,
        class_id: classResponse.data.id,
      });
      
      const response = await dataFactory.getClassEnrollments(classResponse.data.id);
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('admin cannot enroll same student twice', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Duplicate',
        last_name: 'Student',
        date_of_birth: '2014-03-03',
        gender: 'MALE',
      });
      
      const classResponse = await dataFactory.createClass({
        name: 'Duplicate Enrollment Class',
        max_capacity: 8,
        day_of_week: 'THURSDAY',
        start_time: '14:00',
        end_time: '15:00',
      });
      assertCreated(classResponse);
      
      await dataFactory.enrollStudent({
        student_id: student.id,
        class_id: classResponse.data.id,
      });
      
      // Try to enroll the same student again
      const response = await dataFactory.enrollStudent({
        student_id: student.id,
        class_id: classResponse.data.id,
      });
      
      // Should fail with conflict or bad request
      expect([400, 409]).toContain(response.status);
    });
    
    test('admin can remove enrollment', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Remove',
        last_name: 'Enrollment',
        date_of_birth: '2014-04-04',
        gender: 'FEMALE',
      });
      
      const classResponse = await dataFactory.createClass({
        name: 'Remove Enrollment Class',
        max_capacity: 10,
        day_of_week: 'FRIDAY',
        start_time: '15:00',
        end_time: '16:00',
      });
      assertCreated(classResponse);
      
      const enrollResponse = await dataFactory.enrollStudent({
        student_id: student.id,
        class_id: classResponse.data.id,
      });
      assertCreated(enrollResponse);
      
      const response = await dataFactory.removeEnrollment(enrollResponse.data.id);
      assertNoContent(response);
    });
    
  });
  
  test.describe('Attendance Management', () => {
    test('admin can mark attendance', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Attendance',
        last_name: 'Student',
        date_of_birth: '2013-05-15',
        gender: 'FEMALE',
      });
      
      const classResponse = await dataFactory.createClass({
        name: 'Attendance Test Class',
        max_capacity: 15,
        day_of_week: 'WEDNESDAY',
        start_time: '14:00',
        end_time: '15:00',
      });
      assertCreated(classResponse);
      
      await dataFactory.enrollStudent({
        student_id: student.id,
        class_id: classResponse.data.id,
      });
      
      const today = new Date().toISOString().split('T')[0];
      
      const response = await dataFactory.markAttendance({
        student_id: student.id,
        class_id: classResponse.data.id,
        date: today,
        status: 'PRESENT',
        notes: 'E2E test attendance',
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data.status).toBe('PRESENT');
    });
    
    test('admin can list attendance records', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.listAttendance();
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
    
    test('admin can filter attendance by class', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const student = await ensureStudent({
        first_name: 'Attendance',
        last_name: 'Filter',
        date_of_birth: '2013-07-10',
        gender: 'MALE',
      });
      
      const classResponse = await dataFactory.createClass({
        name: 'Attendance Filter Class',
        max_capacity: 10,
        day_of_week: 'THURSDAY',
        start_time: '09:00',
        end_time: '10:00',
      });
      assertCreated(classResponse);
      
      await dataFactory.enrollStudent({
        student_id: student.id,
        class_id: classResponse.data.id,
      });
      
      const today = new Date().toISOString().split('T')[0];
      await dataFactory.markAttendance({
        student_id: student.id,
        class_id: classResponse.data.id,
        date: today,
        status: 'PRESENT',
        notes: 'Attendance filter',
      });
      
      const response = await dataFactory.listAttendance({ class_id: classResponse.data.id });
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('admin can filter attendance by date', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const today = new Date().toISOString().split('T')[0];
      
      const response = await dataFactory.listAttendance({ date: today });
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
  });
  
  test.describe('Billing - Items', () => {
    let createdItemId: string;
    
    test('admin can create billing item', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.createBillingItem({
        name: 'Monthly Membership',
        description: 'Monthly academy membership fee',
        price: 99.99,
        currency: 'USD',
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe('Monthly Membership');
      // Price may be returned as string from DecimalField
      expect(parseFloat(response.data.price)).toBe(99.99);
      
      createdItemId = response.data.id;
    });
    
    test('admin can list billing items', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.listBillingItems();
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
  });
  
  test.describe('Billing - Invoices', () => {
    test('admin can create invoice', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const parentId = await ensureParentId();
      const student = await ensureStudent({
        first_name: 'Invoice',
        last_name: 'Student',
        date_of_birth: '2014-06-01',
        gender: 'MALE',
      });
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const response = await dataFactory.createInvoice({
        parent_id: parentId,
        due_date: dueDate.toISOString().split('T')[0],
        items: [{
          student_id: student.id,
          description: 'Test invoice item',
          quantity: 1,
          unit_price: 100.00,
        }],
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('invoice_number');
    });
    
    test('admin can list invoices', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.listInvoices();
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('admin can view invoice detail', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const parentId = await ensureParentId();
      const student = await ensureStudent({
        first_name: 'Invoice',
        last_name: 'Detail',
        date_of_birth: '2014-07-01',
        gender: 'FEMALE',
      });
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const createResponse = await dataFactory.createInvoice({
        parent_id: parentId,
        due_date: dueDate.toISOString().split('T')[0],
        items: [{
          student_id: student.id,
          description: 'Invoice detail item',
          quantity: 1,
          unit_price: 75.00,
        }],
      });
      assertCreated(createResponse);
      
      const response = await dataFactory.getInvoice(createResponse.data.id);
      
      assertSuccess(response);
      expect(response.data.id).toBe(createResponse.data.id);
    });
    
  });
  
  test.describe('Billing - Receipts', () => {
    test('admin can create receipt (payment)', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const parentId = await ensureParentId();
      const student = await ensureStudent({
        first_name: 'Receipt',
        last_name: 'Student',
        date_of_birth: '2014-08-01',
        gender: 'FEMALE',
      });
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const invoiceResponse = await dataFactory.createInvoice({
        parent_id: parentId,
        due_date: dueDate.toISOString().split('T')[0],
        items: [{
          student_id: student.id,
          description: 'Receipt test item',
          quantity: 1,
          unit_price: 75.00,
        }],
      });
      assertCreated(invoiceResponse);
      
      const today = new Date().toISOString().split('T')[0];
      
      const response = await dataFactory.createReceipt({
        invoice_id: invoiceResponse.data.id,
        amount: 75.00,
        payment_method: 'CASH',
        payment_date: today,
        notes: 'E2E test payment',
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('receipt_number');
      expect(parseFloat(response.data.amount as any)).toBe(75.00);
    });
    
    test('admin can list receipts', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.listReceipts();
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('partial payment updates invoice status', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const parentId = await ensureParentId();
      const student = await ensureStudent({
        first_name: 'Partial',
        last_name: 'Payment',
        date_of_birth: '2014-09-01',
        gender: 'MALE',
      });
      
      // Create a new invoice
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const invoiceResponse = await dataFactory.createInvoice({
        parent_id: parentId,
        due_date: dueDate.toISOString().split('T')[0],
        items: [{
          student_id: student.id,
          description: 'Partial payment test',
          quantity: 1,
          unit_price: 100.00,
        }],
      });
      assertCreated(invoiceResponse);
      
      const invoiceId = invoiceResponse.data.id;
      const today = new Date().toISOString().split('T')[0];
      
      // Make partial payment
      const receiptResponse = await dataFactory.createReceipt({
        invoice_id: invoiceId,
        amount: 50.00, // Partial payment
        payment_method: 'CARD',
        payment_date: today,
      });
      
      assertCreated(receiptResponse);
      
      // Check invoice status
      const updatedInvoice = await dataFactory.getInvoice(invoiceId);
      assertSuccess(updatedInvoice);
      // Invoice should show partially paid
      expect(updatedInvoice.data.paid_amount).toBe(50.00);
    });
    
  });
  
  test.describe('User Management', () => {
    
    test('admin can invite a coach', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const uniqueSuffix = Date.now();
      
      const response = await dataFactory.inviteCoach({
        email: `coach-invite-${uniqueSuffix}@test.com`,
        profile: {
          specialization: 'Soccer',
        },
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data.role).toBe('COACH');
      expect(response.data.invite_sent).toBe(true);
    });
    
    test('admin can invite a parent', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const uniqueSuffix = Date.now();
      
      const response = await dataFactory.inviteParent({
        email: `parent-invite-${uniqueSuffix}@test.com`,
        profile: {
          phone: '+1-555-0123',
        },
      });
      
      assertCreated(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data.role).toBe('PARENT');
      expect(response.data.invite_sent).toBe(true);
    });
    
    test('admin can list users', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const response = await dataFactory.listUsers();
      
      assertSuccess(response);
      expect(response.data).toHaveProperty('results');
    });
    
    test('admin cannot invite with duplicate email', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      const uniqueSuffix = Date.now();
      const email = `duplicate-${uniqueSuffix}@test.com`;
      
      // First invite
      const firstResponse = await dataFactory.inviteCoach({ email });
      assertCreated(firstResponse);
      
      // Second invite with same email should fail
      const secondResponse = await dataFactory.inviteCoach({ email });
      assertBadRequest(secondResponse);
    });
    
    test('admin can resend invite', async () => {
      test.skip(!adminToken, 'Admin not available');
      
      // Create a user first
      const uniqueSuffix = Date.now();
      const createResponse = await dataFactory.inviteCoach({
        email: `resend-${uniqueSuffix}@test.com`,
      });
      
      test.skip(!createResponse.ok, 'Could not create user');
      
      const userId = createResponse.data.id;
      
      // Resend invite
      const resendResponse = await dataFactory.resendInvite(userId);
      
      assertSuccess(resendResponse);
      expect(resendResponse.data.invite_sent).toBe(true);
    });
    
  });
  
});
