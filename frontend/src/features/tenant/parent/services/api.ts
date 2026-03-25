import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type { PortalStudentDetail, PortalStudentPatchPayload } from '../types';

export async function getPortalStudent(studentId: number | string): Promise<PortalStudentDetail> {
  const response = await apiClient.get<PortalStudentDetail>(
    API_ENDPOINTS.TENANT.PORTAL.STUDENT_DETAIL(studentId)
  );
  return response.data;
}

export async function patchPortalStudent(
  studentId: number | string,
  data: Partial<PortalStudentPatchPayload>
): Promise<PortalStudentDetail> {
  const response = await apiClient.patch<PortalStudentDetail>(
    API_ENDPOINTS.TENANT.PORTAL.STUDENT_DETAIL(studentId),
    data
  );
  return response.data;
}
