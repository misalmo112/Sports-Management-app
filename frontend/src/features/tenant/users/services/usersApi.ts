/**
 * API service functions for user management
 */
import apiClient from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants/api';
import type {
  UsersListResponse,
  User,
  CoachManagementRow,
  ParentManagementRow,
  InviteUserRequest,
  InviteUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  ValidateInviteResponse,
  AcceptInviteRequest,
  AcceptInviteResponse,
  LoginRequest,
  LoginResponse,
} from '../types';

/**
 * List users with optional filters
 */
export const getUsers = async (
  role?: string,
  status?: string
): Promise<UsersListResponse> => {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (status) params.append('status', status);

  const queryString = params.toString();
  const url = queryString
    ? `${API_ENDPOINTS.USERS.LIST}?${queryString}`
    : API_ENDPOINTS.USERS.LIST;

  const response = await apiClient.get<UsersListResponse>(url);
  return response.data;
};

/**
 * Get unified coaches list for User Management Coaches tab (users + staff not invited).
 */
export const getCoachesForManagement = async (): Promise<CoachManagementRow[]> => {
  const response = await apiClient.get<CoachManagementRow[]>(
    API_ENDPOINTS.USERS.COACHES_FOR_MANAGEMENT
  );
  return response.data;
};

/**
 * Unified parents list for User Management Parents tab (guardians + PARENT users).
 */
export const getParentsForManagement = async (): Promise<ParentManagementRow[]> => {
  const response = await apiClient.get<ParentManagementRow[]>(
    API_ENDPOINTS.USERS.PARENTS_FOR_MANAGEMENT
  );
  return response.data;
};

/**
 * Create PARENT user from guardian record and send invite email.
 */
export const inviteGuardianParent = async (
  parentId: number
): Promise<{ invite_sent: boolean } & User> => {
  const response = await apiClient.post<{ invite_sent: boolean } & User>(
    API_ENDPOINTS.TENANT.PARENTS.INVITE(parentId)
  );
  return response.data;
};

/**
 * Invite an existing staff coach (create user, link, send invite email).
 */
export const inviteStaffCoach = async (
  coachId: number
): Promise<{ invite_sent: boolean } & User> => {
  const response = await apiClient.post<{ invite_sent: boolean } & User>(
    API_ENDPOINTS.TENANT.COACHES.INVITE(coachId)
  );
  return response.data;
};

/**
 * Get user details by ID
 */
export const getUser = async (id: number): Promise<User> => {
  const response = await apiClient.get<User>(API_ENDPOINTS.USERS.DETAIL(id));
  return response.data;
};

/**
 * Invite a new user
 */
export const inviteUser = async (
  data: InviteUserRequest
): Promise<InviteUserResponse> => {
  const response = await apiClient.post<InviteUserResponse>(
    API_ENDPOINTS.USERS.INVITE,
    data
  );
  return response.data;
};

/**
 * Update user
 */
export const updateUser = async (
  id: number,
  data: UpdateUserRequest
): Promise<UpdateUserResponse> => {
  const response = await apiClient.patch<UpdateUserResponse>(
    API_ENDPOINTS.USERS.UPDATE(id),
    data
  );
  return response.data;
};

/**
 * Disable user (soft delete)
 */
export const disableUser = async (id: number): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.USERS.DISABLE(id));
};

/**
 * Resend invite for a user
 */
export const resendInvite = async (id: number): Promise<{ detail: string; invite_sent: boolean }> => {
  const response = await apiClient.post<{ detail: string; invite_sent: boolean }>(
    API_ENDPOINTS.USERS.RESEND_INVITE(id)
  );
  return response.data;
};

/**
 * Validate invite token
 */
export const validateInviteToken = async (
  token: string
): Promise<ValidateInviteResponse> => {
  const response = await apiClient.get<ValidateInviteResponse>(
    API_ENDPOINTS.AUTH.VALIDATE_INVITE(token)
  );
  return response.data;
};

/**
 * Accept invitation with password
 */
export const acceptInvite = async (
  token: string,
  data: AcceptInviteRequest
): Promise<AcceptInviteResponse> => {
  const response = await apiClient.post<AcceptInviteResponse>(
    API_ENDPOINTS.AUTH.ACCEPT_INVITE,
    {
      token,
      ...data,
    }
  );
  return response.data;
};

/**
 * Login with email and password
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    data
  );
  return response.data;
};

/**
 * Request password reset email
 */
export const forgotPassword = async (email: string): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
    { email }
  );
  return response.data;
};

/**
 * Reset password with token
 */
export const resetPassword = async (data: {
  token: string;
  password: string;
  password_confirm: string;
}): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    API_ENDPOINTS.AUTH.RESET_PASSWORD,
    data
  );
  return response.data;
};
