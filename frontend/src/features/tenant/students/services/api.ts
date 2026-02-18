/**
 * API service functions for Tenant Students
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Student,
  StudentsListResponse,
  CreateStudentRequest,
  UpdateStudentRequest,
} from '../types';

/**
 * List students with optional filters
 */
export const getStudents = async (
  params?: {
    parent?: number;
    is_active?: boolean;
    gender?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }
): Promise<StudentsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.parent) {
    queryParams.append('parent', params.parent.toString());
  }
  if (params?.is_active !== undefined) {
    queryParams.append('is_active', params.is_active.toString());
  }
  if (params?.gender) {
    queryParams.append('gender', params.gender);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.TENANT.STUDENTS.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.STUDENTS.LIST;

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:51',message:'Calling getStudents API',data:{url,params},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<StudentsListResponse>(url);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:55',message:'getStudents API success',data:{status:response.status,dataCount:response.data?.results?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:59',message:'getStudents API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Get student details by ID
 */
export const getStudent = async (id: number | string): Promise<Student> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:71',message:'Calling getStudent API',data:{id,idType:typeof id,url:API_ENDPOINTS.TENANT.STUDENTS.DETAIL(id),hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  // Validate ID - prevent route parameter strings like ":1"
  if (typeof id === 'string' && (id.startsWith(':') || isNaN(Number(id)))) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:73',message:'getStudent invalid ID error',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    throw new Error(`Invalid student ID: ${id}`);
  }
  try {
    const response = await apiClient.get<Student>(
      API_ENDPOINTS.TENANT.STUDENTS.DETAIL(id)
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:79',message:'getStudent API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:83',message:'getStudent API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Create a new student
 */
export const createStudent = async (
  data: CreateStudentRequest
): Promise<Student> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:85',message:'Calling createStudent API',data:{url:API_ENDPOINTS.TENANT.STUDENTS.CREATE,dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.post<Student>(
      API_ENDPOINTS.TENANT.STUDENTS.CREATE,
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:91',message:'createStudent API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:95',message:'createStudent API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Update student
 */
export const updateStudent = async (
  id: number | string,
  data: UpdateStudentRequest
): Promise<Student> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:99',message:'Calling updateStudent API',data:{id,url:API_ENDPOINTS.TENANT.STUDENTS.UPDATE(id),dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.patch<Student>(
      API_ENDPOINTS.TENANT.STUDENTS.UPDATE(id),
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:105',message:'updateStudent API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:109',message:'updateStudent API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Delete student
 */
export const deleteStudent = async (id: number | string): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:113',message:'Calling deleteStudent API',data:{id,url:API_ENDPOINTS.TENANT.STUDENTS.DELETE(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    await apiClient.delete(API_ENDPOINTS.TENANT.STUDENTS.DELETE(id));
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:116',message:'deleteStudent API success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'students/api.ts:118',message:'deleteStudent API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};
