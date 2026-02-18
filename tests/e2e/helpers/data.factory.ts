import { ApiHelper, createApiHelper, ApiResponseWrapper } from './api.helper';
import { TokenStorage } from './auth.helper';
import testData from '../fixtures/test-data.json';

/**
 * Student entity
 */
export interface Student {
  id: string;
  academy_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Class entity
 */
export interface Class {
  id: string;
  academy_id: string;
  name: string;
  description?: string;
  coach_id?: string;
  location_id?: string;
  sport_id?: string;
  age_category_id?: string;
  term_id?: string;
  max_capacity: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Enrollment entity
 */
export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrolled_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Attendance record
 */
export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes?: string;
  marked_by_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Billing item
 */
export interface BillingItem {
  id: string;
  academy_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  academy_id: string;
  parent_id?: string;
  student_id?: string;
  invoice_number: string;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  total_amount: number;
  paid_amount: number;
  due_date: string;
  items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  id: string;
  item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * Receipt
 */
export interface Receipt {
  id: string;
  academy_id: string;
  invoice_id: string;
  receipt_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Media file
 */
export interface MediaFile {
  id: string;
  academy_id: string;
  class_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  file_url?: string;
}

/**
 * User invite response
 */
export interface UserInvite {
  id: number;
  email: string;
  role: string;
  academy_id: string;
  is_active: boolean;
  is_verified: boolean;
  invite_sent: boolean;
  invite_token?: string; // Only returned in test mode
}

/**
 * Create student payload
 */
export interface CreateStudentPayload {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  parent_id?: string;
}

/**
 * Create class payload
 */
export interface CreateClassPayload {
  name: string;
  description?: string;
  coach_id?: string;
  location_id?: string;
  sport_id?: string;
  age_category_id?: string;
  term_id?: string;
  max_capacity: number;
  schedule?: {
    recurring?: boolean;
    days_of_week?: string[];
    start_time?: string;
    end_time?: string;
    timezone?: string;
  };
  start_date?: string;
  end_date?: string;
  // Legacy fields (for backwards compatibility)
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
}

/**
 * Create enrollment payload
 */
export interface CreateEnrollmentPayload {
  student_id: string;
  class_id: string;
}

/**
 * Create attendance payload
 */
export interface CreateAttendancePayload {
  student: string;  // Backend uses 'student' not 'student_id'
  class_obj: string;  // Backend uses 'class_obj' not 'class_id'
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes?: string;
  // Legacy fields for compatibility
  student_id?: string;
  class_id?: string;
}

/**
 * Create billing item payload
 */
export interface CreateBillingItemPayload {
  name: string;
  description?: string;
  price: number;
  currency?: string;
}

/**
 * Create invoice payload
 */
export interface CreateInvoicePayload {
  parent_id?: string;
  student_id?: string;
  due_date: string;
  items: {
    item_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
  }[];
}

/**
 * Create receipt payload
 */
export interface CreateReceiptPayload {
  invoice_id?: string;
  invoice?: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
}

/**
 * Create user invite payload
 */
export interface CreateUserInvitePayload {
  email: string;
  profile?: Record<string, unknown>;
}

/**
 * Create parent payload
 */
export interface CreateParentPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

/**
 * Data factory class for creating test data
 */
export class DataFactory {
  private apiHelper: ApiHelper;
  private counter = 0;

  constructor(apiHelper?: ApiHelper) {
    this.apiHelper = apiHelper || createApiHelper();
  }

  /**
   * Initialize the factory
   */
  async init(): Promise<void> {
    await this.apiHelper.init();
  }

  /**
   * Cleanup
   */
  async dispose(): Promise<void> {
    await this.apiHelper.dispose();
  }

  /**
   * Set authentication from token storage
   */
  setAuth(tokenStorage: TokenStorage): void {
    this.apiHelper.setAuth(tokenStorage);
  }

  /**
   * Set token directly
   */
  setToken(token: string): void {
    this.apiHelper.setToken(token);
  }

  /**
   * Set academy context
   */
  setAcademyId(academyId: string): void {
    this.apiHelper.setAcademyId(academyId);
  }

  /**
   * Generate a unique suffix for test data
   */
  private uniqueSuffix(): string {
    this.counter++;
    return `${Date.now()}_${this.counter}`;
  }

  // ==================== STUDENTS ====================

  /**
   * Create a student with retry logic
   */
  async createStudent(
    payload?: Partial<CreateStudentPayload>,
    options?: { token?: string; academyId?: string; retries?: number }
  ): Promise<ApiResponseWrapper<Student>> {
    const retries = options?.retries ?? 3;
    const suffix = this.uniqueSuffix();
    let didCleanup = false;
    const data: CreateStudentPayload = {
      first_name: payload?.first_name || `Test${suffix}`,
      last_name: payload?.last_name || testData.student.last_name,
      date_of_birth: payload?.date_of_birth || testData.student.date_of_birth,
      gender: payload?.gender || testData.student.gender,
      ...payload,
    };

    const apiPayload: Record<string, unknown> = { ...data };
    if (apiPayload.parent_id) {
      apiPayload.parent = apiPayload.parent_id;
      delete apiPayload.parent_id;
    }

    let lastError: ApiResponseWrapper<Student> | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await this.apiHelper.post<Student>('/tenant/students/', apiPayload, options);
      
      if (response.ok) {
        return response;
      }
      
      lastError = response;
      
      // If quota exceeded or onboarding not completed, don't retry
      if (response.status === 403) {
        const errorData = response.data as any;
        if (errorData.detail?.includes('Quota exceeded')) {
          if (!didCleanup) {
            didCleanup = true;
            await this.cleanupTestStudents({ pattern: 'Student', keepCount: 20, ...options });
            continue;
          }
          break;
        }
        if (errorData.detail?.includes('Onboarding not completed')) {
          break;
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
    
    return lastError!;
  }

  /**
   * Get a student by ID
   */
  async getStudent(
    studentId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Student>> {
    return this.apiHelper.get<Student>(`/tenant/students/${studentId}/`, options);
  }

  /**
   * List students
   */
  async listStudents(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: Student[]; count: number }>> {
    return this.apiHelper.get('/tenant/students/', options);
  }

  /**
   * List parents
   */
  async listParents(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: { id: string; first_name: string; last_name: string; email: string }[]; count: number }>> {
    return this.apiHelper.get('/tenant/parents/', options);
  }

  /**
   * Create a parent
   */
  async createParent(
    payload: CreateParentPayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ id: string; email: string }>> {
    return this.apiHelper.post('/tenant/parents/', payload, options);
  }

  /**
   * List coaches
   */
  async listCoaches(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: { id: string; user: { id: string; email: string }; first_name?: string; last_name?: string }[]; count: number }>> {
    return this.apiHelper.get('/tenant/coaches/', options);
  }

  /**
   * Update a student
   */
  async updateStudent(
    studentId: string,
    payload: Partial<CreateStudentPayload>,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Student>> {
    return this.apiHelper.patch<Student>(`/tenant/students/${studentId}/`, payload, options);
  }

  /**
   * Delete a student
   */
  async deleteStudent(
    studentId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<void>> {
    return this.apiHelper.delete<void>(`/tenant/students/${studentId}/`, options);
  }

  // ==================== CLASSES ====================

  /**
   * Create a class with retry logic
   */
  async createClass(
    payload?: Partial<CreateClassPayload>,
    options?: { token?: string; academyId?: string; retries?: number }
  ): Promise<ApiResponseWrapper<Class>> {
    const retries = options?.retries ?? 3;
    const suffix = this.uniqueSuffix();
    
    // Build schedule from legacy fields if not provided directly
    const schedule = payload?.schedule || {
      recurring: true,
      days_of_week: [payload?.day_of_week?.toLowerCase() || 'monday'],
      start_time: payload?.start_time || '16:00',
      end_time: payload?.end_time || '17:00',
      timezone: 'UTC',
    };
    
    const data: Record<string, unknown> = {
      name: payload?.name || `Test Class ${suffix}`,
      description: payload?.description || testData.class.description,
      max_capacity: payload?.max_capacity || testData.class.max_capacity,
      schedule,
      ...payload,
    };
    
    // Remove legacy fields from data if schedule is provided
    if (data.coach_id) {
      data.coach = data.coach_id;
      delete data.coach_id;
    }
    delete (data as any).day_of_week;
    delete (data as any).start_time;
    delete (data as any).end_time;

    let lastError: ApiResponseWrapper<Class> | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await this.apiHelper.post<Class>('/tenant/classes/', data, options);
      
      if (response.ok) {
        return response;
      }
      
      lastError = response;
      
      // If quota exceeded or onboarding not completed, don't retry
      if (response.status === 403) {
        const errorData = response.data as any;
        if (errorData.detail?.includes('Quota exceeded') || errorData.detail?.includes('Onboarding not completed')) {
          break;
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
    
    return lastError!;
  }

  /**
   * Get a class by ID
   */
  async getClass(
    classId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Class>> {
    return this.apiHelper.get<Class>(`/tenant/classes/${classId}/`, options);
  }

  /**
   * List classes
   */
  async listClasses(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: Class[]; count: number }>> {
    return this.apiHelper.get('/tenant/classes/', options);
  }

  /**
   * Update a class
   */
  async updateClass(
    classId: string,
    payload: Partial<CreateClassPayload>,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Class>> {
    return this.apiHelper.patch<Class>(`/tenant/classes/${classId}/`, payload, options);
  }

  /**
   * Delete a class
   */
  async deleteClass(
    classId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<void>> {
    return this.apiHelper.delete<void>(`/tenant/classes/${classId}/`, options);
  }

  /**
   * Clean up old test classes to free up quota
   * Keeps only the most recent N classes or classes matching a pattern
   */
  async cleanupTestClasses(
    options?: { 
      token?: string; 
      academyId?: string;
      keepCount?: number; // Number of most recent classes to keep
      pattern?: string; // Pattern to match class names (e.g., "Test Class")
    }
  ): Promise<{ deleted: number; kept: number }> {
    const keepCount = options?.keepCount || 10;
    const pattern = options?.pattern || 'Test Class';
    
    const listResponse = await this.listClasses(options);
    if (!listResponse.ok || !listResponse.data.results) {
      return { deleted: 0, kept: 0 };
    }
    
    // Filter classes matching pattern and sort by created_at (newest first)
    const testClasses = listResponse.data.results
      .filter((cls: Class) => cls.name.includes(pattern))
      .sort((a: Class, b: Class) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    
    // Keep the most recent ones, delete the rest
    const toDelete = testClasses.slice(keepCount);
    let deleted = 0;
    
    for (const cls of toDelete) {
      const deleteResponse = await this.deleteClass(cls.id, options);
      if (deleteResponse.ok) {
        deleted++;
      }
    }
    
    return { deleted, kept: testClasses.length - deleted };
  }

  /**
   * Clean up old test students to free up quota
   * Keeps only the most recent N students matching a name pattern
   */
  async cleanupTestStudents(
    options?: {
      token?: string;
      academyId?: string;
      keepCount?: number;
      pattern?: string;
    }
  ): Promise<{ deleted: number; kept: number }> {
    const keepCount = options?.keepCount || 20;
    const pattern = options?.pattern || 'Student';

    const listResponse = await this.listStudents(options);
    if (!listResponse.ok || !listResponse.data.results) {
      return { deleted: 0, kept: 0 };
    }

    const testStudents = listResponse.data.results
      .filter((student: Student) => {
        const firstName = student.first_name || '';
        const lastName = student.last_name || '';
        return firstName.includes(pattern) || lastName.includes(pattern);
      })
      .sort((a: Student, b: Student) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    const toDelete = testStudents.slice(keepCount);
    let deleted = 0;

    for (const student of toDelete) {
      const deleteResponse = await this.deleteStudent(student.id, options);
      if (deleteResponse.ok) {
        deleted++;
      }
    }

    return { deleted, kept: testStudents.length - deleted };
  }

  // ==================== ENROLLMENTS ====================

  /**
   * Enroll a student in a class
   */
  async enrollStudent(
    payload: CreateEnrollmentPayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Enrollment>> {
    // Transform payload to match backend expected fields
    const apiPayload = {
      student: payload.student_id,
      class_obj: payload.class_id,
    };
    return this.apiHelper.post<Enrollment>('/tenant/enrollments/', apiPayload, options);
  }

  /**
   * Get enrollments for a class
   */
  async getClassEnrollments(
    classId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: Enrollment[]; count: number }>> {
    return this.apiHelper.get(`/tenant/classes/${classId}/enrollments/`, options);
  }

  /**
   * Remove enrollment
   */
  async removeEnrollment(
    enrollmentId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<void>> {
    return this.apiHelper.delete<void>(`/tenant/enrollments/${enrollmentId}/`, options);
  }

  // ==================== ATTENDANCE ====================

  /**
   * Mark attendance
   */
  async markAttendance(
    payload: CreateAttendancePayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<AttendanceRecord>> {
    // Transform legacy field names to backend field names
    const transformedPayload = {
      student: payload.student || payload.student_id,
      class_obj: payload.class_obj || payload.class_id,
      date: payload.date,
      status: payload.status,
      notes: payload.notes,
    };
    return this.apiHelper.post<AttendanceRecord>('/tenant/attendance/', transformedPayload, options);
  }

  /**
   * List attendance records
   */
  async listAttendance(
    params?: { class_id?: string; student_id?: string; date?: string },
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: AttendanceRecord[]; count: number }>> {
    return this.apiHelper.get('/tenant/attendance/', {
      ...options,
      params: params as Record<string, string>,
    });
  }

  /**
   * Update attendance record
   */
  async updateAttendance(
    attendanceId: string,
    payload: Partial<CreateAttendancePayload>,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<AttendanceRecord>> {
    return this.apiHelper.patch<AttendanceRecord>(`/tenant/attendance/${attendanceId}/`, payload, options);
  }

  // ==================== BILLING ====================

  /**
   * Create a billing item
   */
  async createBillingItem(
    payload?: Partial<CreateBillingItemPayload>,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<BillingItem>> {
    const suffix = this.uniqueSuffix();
    const data: CreateBillingItemPayload = {
      name: payload?.name || `Test Item ${suffix}`,
      description: payload?.description || testData.billingItem.description,
      price: payload?.price || testData.billingItem.price,
      currency: payload?.currency || testData.billingItem.currency,
      ...payload,
    };

    return this.apiHelper.post<BillingItem>('/tenant/items/', data, options);
  }

  /**
   * List billing items
   */
  async listBillingItems(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: BillingItem[]; count: number }>> {
    return this.apiHelper.get('/tenant/items/', options);
  }

  /**
   * Create an invoice
   */
  async createInvoice(
    payload: CreateInvoicePayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Invoice>> {
    return this.apiHelper.post<Invoice>('/tenant/invoices/', payload, options);
  }

  /**
   * Get an invoice by ID
   */
  async getInvoice(
    invoiceId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Invoice>> {
    return this.apiHelper.get<Invoice>(`/tenant/invoices/${invoiceId}/`, options);
  }

  /**
   * List invoices
   */
  async listInvoices(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: Invoice[]; count: number }>> {
    return this.apiHelper.get('/tenant/invoices/', options);
  }

  /**
   * Create a receipt (payment)
   */
  async createReceipt(
    payload: CreateReceiptPayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<Receipt>> {
    const { invoice_id, ...rest } = payload;
    const apiPayload = {
      ...rest,
      invoice: payload.invoice || invoice_id,
    };
    return this.apiHelper.post<Receipt>('/tenant/receipts/', apiPayload, options);
  }

  /**
   * List receipts
   */
  async listReceipts(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: Receipt[]; count: number }>> {
    return this.apiHelper.get('/tenant/receipts/', options);
  }

  // ==================== MEDIA ====================

  /**
   * Upload a media file
   */
  async uploadMediaFile(
    file: {
      name: string;
      mimeType: string;
      buffer: Buffer;
    },
    additionalData?: {
      class_id?: string;
      description?: string;
    },
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<MediaFile>> {
    return this.apiHelper.uploadFile<MediaFile>(
      '/tenant/media/',
      file,
      additionalData as Record<string, string>,
      options
    );
  }

  /**
   * List media files
   */
  async listMediaFiles(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: MediaFile[]; count: number }>> {
    return this.apiHelper.get('/tenant/media/', options);
  }

  /**
   * Delete a media file
   */
  async deleteMediaFile(
    mediaId: string,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<void>> {
    return this.apiHelper.delete<void>(`/tenant/media/${mediaId}/`, options);
  }

  // ==================== USERS ====================

  /**
   * Invite a coach
   */
  async inviteCoach(
    payload: CreateUserInvitePayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<UserInvite>> {
    return this.apiHelper.post<UserInvite>('/admin/users/coaches/', payload, options);
  }

  /**
   * Invite a parent
   */
  async inviteParent(
    payload: CreateUserInvitePayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<UserInvite>> {
    return this.apiHelper.post<UserInvite>('/admin/users/parents/', payload, options);
  }

  /**
   * Invite an admin
   */
  async inviteAdmin(
    payload: CreateUserInvitePayload,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<UserInvite>> {
    return this.apiHelper.post<UserInvite>('/admin/users/admins/', payload, options);
  }

  /**
   * List users
   */
  async listUsers(
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ results: UserInvite[]; count: number }>> {
    return this.apiHelper.get('/admin/users/', options);
  }

  /**
   * Resend invite
   */
  async resendInvite(
    userId: number,
    options?: { token?: string; academyId?: string }
  ): Promise<ApiResponseWrapper<{ detail: string; invite_sent: boolean }>> {
    return this.apiHelper.post(`/admin/users/${userId}/resend_invite/`, {}, options);
  }
}

/**
 * Create a new data factory instance
 */
export function createDataFactory(): DataFactory {
  return new DataFactory();
}

// ==================== CONVENIENCE FUNCTIONS ====================

export async function createStudent(
  token: string,
  academyId: string,
  payload?: Partial<CreateStudentPayload>
): Promise<ApiResponseWrapper<Student>> {
  const factory = createDataFactory();
  await factory.init();
  try {
    return await factory.createStudent(payload, { token, academyId });
  } finally {
    await factory.dispose();
  }
}

export async function createClass(
  token: string,
  academyId: string,
  payload?: Partial<CreateClassPayload>
): Promise<ApiResponseWrapper<Class>> {
  const factory = createDataFactory();
  await factory.init();
  try {
    return await factory.createClass(payload, { token, academyId });
  } finally {
    await factory.dispose();
  }
}

export async function enrollStudent(
  token: string,
  academyId: string,
  studentId: string,
  classId: string
): Promise<ApiResponseWrapper<Enrollment>> {
  const factory = createDataFactory();
  await factory.init();
  try {
    return await factory.enrollStudent({ student_id: studentId, class_id: classId }, { token, academyId });
  } finally {
    await factory.dispose();
  }
}

export async function createInvoice(
  token: string,
  academyId: string,
  payload: CreateInvoicePayload
): Promise<ApiResponseWrapper<Invoice>> {
  const factory = createDataFactory();
  await factory.init();
  try {
    return await factory.createInvoice(payload, { token, academyId });
  } finally {
    await factory.dispose();
  }
}

export async function createReceipt(
  token: string,
  academyId: string,
  payload: CreateReceiptPayload
): Promise<ApiResponseWrapper<Receipt>> {
  const factory = createDataFactory();
  await factory.init();
  try {
    return await factory.createReceipt(payload, { token, academyId });
  } finally {
    await factory.dispose();
  }
}

export async function uploadMediaFile(
  token: string,
  academyId: string,
  file: { name: string; mimeType: string; buffer: Buffer },
  additionalData?: { class_id?: string; description?: string }
): Promise<ApiResponseWrapper<MediaFile>> {
  const factory = createDataFactory();
  await factory.init();
  try {
    return await factory.uploadMediaFile(file, additionalData, { token, academyId });
  } finally {
    await factory.dispose();
  }
}
