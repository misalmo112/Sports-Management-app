/**
 * API service functions for Tenant Attendance
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  Attendance,
  AttendanceListResponse,
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  CoachAttendance,
  CoachAttendanceListResponse,
  CreateCoachAttendanceRequest,
  UpdateCoachAttendanceRequest,
} from '../types';

/**
 * List attendance records with optional filters
 */
export const getAttendance = async (
  params?: {
    student?: number;
    class_obj?: number;
    date?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }
): Promise<AttendanceListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.student) {
    queryParams.append('student', params.student.toString());
  }
  if (params?.class_obj) {
    queryParams.append('class_obj', params.class_obj.toString());
  }
  if (params?.date) {
    queryParams.append('date', params.date);
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
    ? `${API_ENDPOINTS.TENANT.ATTENDANCE.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.ATTENDANCE.LIST;

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:57',message:'Calling getAttendance API',data:{url,params},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<AttendanceListResponse>(url);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:61',message:'getAttendance API success',data:{status:response.status,dataCount:response.data?.results?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:65',message:'getAttendance API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Get attendance details by ID
 */
export const getAttendanceById = async (
  id: number | string
): Promise<Attendance> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:77',message:'Calling getAttendanceById API',data:{id,url:API_ENDPOINTS.TENANT.ATTENDANCE.DETAIL(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.get<Attendance>(
      API_ENDPOINTS.TENANT.ATTENDANCE.DETAIL(id)
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:81',message:'getAttendanceById API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:85',message:'getAttendanceById API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Create a new attendance record
 */
export const createAttendance = async (
  data: CreateAttendanceRequest
): Promise<Attendance> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:89',message:'Calling createAttendance API',data:{url:API_ENDPOINTS.TENANT.ATTENDANCE.CREATE,dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.post<Attendance>(
      API_ENDPOINTS.TENANT.ATTENDANCE.CREATE,
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:95',message:'createAttendance API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:99',message:'createAttendance API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Update attendance record
 */
export const updateAttendance = async (
  id: number | string,
  data: UpdateAttendanceRequest
): Promise<Attendance> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:102',message:'Calling updateAttendance API',data:{id,url:API_ENDPOINTS.TENANT.ATTENDANCE.UPDATE(id),dataKeys:Object.keys(data),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.patch<Attendance>(
      API_ENDPOINTS.TENANT.ATTENDANCE.UPDATE(id),
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:108',message:'updateAttendance API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:112',message:'updateAttendance API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Delete attendance record
 */
export const deleteAttendance = async (id: number | string): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:116',message:'Calling deleteAttendance API',data:{id,url:API_ENDPOINTS.TENANT.ATTENDANCE.DELETE(id),hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    await apiClient.delete(API_ENDPOINTS.TENANT.ATTENDANCE.DELETE(id));
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:119',message:'deleteAttendance API success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:121',message:'deleteAttendance API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * Mark attendance for multiple students in a class (bulk)
 */
export const markAttendance = async (
  data: MarkAttendanceRequest
): Promise<MarkAttendanceResponse> => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:123',message:'Calling markAttendance API',data:{url:API_ENDPOINTS.TENANT.ATTENDANCE.MARK,dataKeys:Object.keys(data),recordsCount:data?.attendance_records?.length,hasToken:!!localStorage.getItem('auth_token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    const response = await apiClient.post<MarkAttendanceResponse>(
      API_ENDPOINTS.TENANT.ATTENDANCE.MARK,
      data
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:129',message:'markAttendance API success',data:{status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attendance/api.ts:133',message:'markAttendance API error',data:{errorType:error?.constructor?.name,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

/**
 * List coach attendance records with optional filters
 */
export const getCoachAttendance = async (
  params?: {
    coach?: number;
    class_obj?: number;
    date?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }
): Promise<CoachAttendanceListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.coach) {
    queryParams.append('coach', params.coach.toString());
  }
  if (params?.class_obj) {
    queryParams.append('class_obj', params.class_obj.toString());
  }
  if (params?.date) {
    queryParams.append('date', params.date);
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
    ? `${API_ENDPOINTS.TENANT.COACH_ATTENDANCE.LIST}?${queryString}`
    : API_ENDPOINTS.TENANT.COACH_ATTENDANCE.LIST;

  const response = await apiClient.get<CoachAttendanceListResponse>(url);
  return response.data;
};

/**
 * Get coach attendance details by ID
 */
export const getCoachAttendanceById = async (
  id: number | string
): Promise<CoachAttendance> => {
  const response = await apiClient.get<CoachAttendance>(
    API_ENDPOINTS.TENANT.COACH_ATTENDANCE.DETAIL(id)
  );
  return response.data;
};

/**
 * Create a new coach attendance record
 */
export const createCoachAttendance = async (
  data: CreateCoachAttendanceRequest
): Promise<CoachAttendance> => {
  const response = await apiClient.post<CoachAttendance>(
    API_ENDPOINTS.TENANT.COACH_ATTENDANCE.CREATE,
    data
  );
  return response.data;
};

/**
 * Update coach attendance record
 */
export const updateCoachAttendance = async (
  id: number | string,
  data: UpdateCoachAttendanceRequest
): Promise<CoachAttendance> => {
  const response = await apiClient.patch<CoachAttendance>(
    API_ENDPOINTS.TENANT.COACH_ATTENDANCE.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Delete coach attendance record
 */
export const deleteCoachAttendance = async (
  id: number | string
): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.TENANT.COACH_ATTENDANCE.DELETE(id));
};
