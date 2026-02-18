/**
 * API service functions for Tenant Classes and Enrollments
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Class,
  ClassesListResponse,
  CreateClassRequest,
  UpdateClassRequest,
  Enrollment,
  EnrollmentsListResponse,
  CreateEnrollmentRequest,
  EnrollStudentRequest,
  UpdateEnrollmentRequest,
} from '../types';

/**
 * List classes with optional filters
 */
export const getClasses = async (
  params?: {
    coach?: number;
    is_active?: boolean;
    search?: string;
    sport?: number;
    location?: number;
    page?: number;
    page_size?: number;
  }
): Promise<ClassesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.coach) {
    queryParams.append('coach', params.coach.toString());
  }
  if (params?.is_active !== undefined) {
    queryParams.append('is_active', params.is_active.toString());
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.sport) {
    queryParams.append('sport', params.sport.toString());
  }
  if (params?.location) {
    queryParams.append('location', params.location.toString());
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.CLASSES.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.CLASSES.LIST;

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:57',message:'Calling getClasses API',data:{url,params},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<ClassesListResponse>(url);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:61',message:'getClasses API success',data:{status:response.status,dataCount:response.data?.results?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:65',message:'getClasses API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Get class details by ID
 */
export const getClass = async (id: number | string): Promise<Class> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:80',message:'Calling getClass API',data:{id,idType:typeof id,url:API_ENDPOINTS.TENANT.CLASSES.DETAIL(id),hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<Class>(
      API_ENDPOINTS.TENANT.CLASSES.DETAIL(id)
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:84',message:'getClass API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:88',message:'getClass API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Create a new class
 */
export const createClass = async (
  data: CreateClassRequest
): Promise<Class> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:90',message:'Calling createClass API',data:{url:API_ENDPOINTS.TENANT.CLASSES.CREATE,dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.post<Class>(
      API_ENDPOINTS.TENANT.CLASSES.CREATE,
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:96',message:'createClass API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:100',message:'createClass API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Update class
 */
export const updateClass = async (
  id: number | string,
  data: UpdateClassRequest
): Promise<Class> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:103',message:'Calling updateClass API',data:{id,url:API_ENDPOINTS.TENANT.CLASSES.UPDATE(id),dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.patch<Class>(
      API_ENDPOINTS.TENANT.CLASSES.UPDATE(id),
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:109',message:'updateClass API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:113',message:'updateClass API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Delete class
 */
export const deleteClass = async (id: number | string): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:117',message:'Calling deleteClass API',data:{id,url:API_ENDPOINTS.TENANT.CLASSES.DELETE(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    await apiClient.delete(API_ENDPOINTS.TENANT.CLASSES.DELETE(id));
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:120',message:'deleteClass API success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:122',message:'deleteClass API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Enroll a student in a class
 */
export const enrollStudent = async (
  classId: number | string,
  data: EnrollStudentRequest
): Promise<Enrollment> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:124',message:'Calling enrollStudent API',data:{classId,url:API_ENDPOINTS.TENANT.CLASSES.ENROLL(classId),dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.post<Enrollment>(
      API_ENDPOINTS.TENANT.CLASSES.ENROLL(classId),
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:130',message:'enrollStudent API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:134',message:'enrollStudent API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * List enrollments with optional filters
 */
export const getEnrollments = async (
  params?: {
    student?: number;
    class_obj?: number;
    status?: string;
    page?: number;
    page_size?: number;
  }
): Promise<EnrollmentsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.student) {
    queryParams.append('student', params.student.toString());
  }
  if (params?.class_obj) {
    queryParams.append('class_obj', params.class_obj.toString());
  }
  if (params?.status) {
    queryParams.append('status', params.status);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.ENROLLMENTS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.ENROLLMENTS.LIST;

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:164',message:'Calling getEnrollments API',data:{url,params,hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<EnrollmentsListResponse>(url);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:168',message:'getEnrollments API success',data:{status:response.status,dataCount:response.data?.results?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'classes/api.ts:172',message:'getEnrollments API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Get enrollment details by ID
 */
export const getEnrollment = async (
  id: number | string
): Promise<Enrollment> => {
  const response = await apiClient.get<Enrollment>(
    API_ENDPOINTS.TENANT.ENROLLMENTS.DETAIL(id)
  );
  return response.data;
};

/**
 * Create a new enrollment
 */
export const createEnrollment = async (
  data: CreateEnrollmentRequest
): Promise<Enrollment> => {
  const response = await apiClient.post<Enrollment>(
    API_ENDPOINTS.TENANT.ENROLLMENTS.CREATE,
    data
  );
  return response.data;
};

/**
 * Update enrollment
 */
export const updateEnrollment = async (
  id: number | string,
  data: UpdateEnrollmentRequest
): Promise<Enrollment> => {
  const response = await apiClient.patch<Enrollment>(
    API_ENDPOINTS.TENANT.ENROLLMENTS.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Delete enrollment (unenroll)
 */
export const deleteEnrollment = async (id: number | string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.ENROLLMENTS.DELETE(id));
};
