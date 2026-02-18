/**
 * TypeScript types for user management
 */

// User status types
export type UserStatus = 'invited' | 'active' | 'disabled';

// User role types (tenant roles only)
export type UserRole = 'ADMIN' | 'COACH' | 'PARENT';

// User object
export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: UserRole;
  status: UserStatus;
  invited_at?: string;
  invited_by?: number;
  last_login?: string;
  created_at: string;
  updated_at: string;
  academy_id: number;
  // Invite token information
  invite_status?: 'accepted' | 'pending' | 'expired' | 'none';
  invite_created_at?: string;
  invite_expires_at?: string;
  invite_accepted_at?: string;
  has_active_invite?: boolean;
  invite_link?: string;
  parent_record?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    phone_numbers?: string[];
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    is_active: boolean;
  };
  parent_students?: Array<{
    id: number;
    full_name: string;
    date_of_birth?: string;
    age?: number;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
    is_active: boolean;
  }>;
}

// Unified row for User Management Coaches tab (user or staff not invited)
export type CoachManagementRow = (User & { source: 'user'; user_id: number }) | {
  source: 'staff_not_invited';
  coach_id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  invite_status: 'none';
};

// API response for list of users
export interface UsersListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

// API response wrapper
export interface UsersResponse {
  status: 'success' | 'error';
  data: UsersListResponse | User;
  message?: string;
}

// Invite user request
export interface InviteUserRequest {
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
}

// Invite user response
export interface InviteUserResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    user: User;
    invite_token: string;
  };
  errors?: Record<string, string[]>;
}

// Update user request
export interface UpdateUserRequest {
  status?: UserStatus;
  first_name?: string;
  last_name?: string;
  parent_record?: {
    phone?: string;
    phone_numbers?: string[];
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

// Update user response
export interface UpdateUserResponse {
  status: 'success' | 'error';
  message: string;
  data?: User;
  errors?: Record<string, string[]>;
}

// Validate invite token response
export interface ValidateInviteResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    email: string;
    role: UserRole;
    academy_name: string;
    expires_at: string;
  };
  errors?: Record<string, string[]>;
}

// Accept invite request
export interface AcceptInviteRequest {
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

// Accept invite response
export interface AcceptInviteResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    user: User;
    token: string;
    refresh_token: string;
  };
  errors?: Record<string, string[]>;
}

// Login request
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    role: string;
    academy_id: string | null;
  };
}

// API error response
export interface UserError {
  status: 'error';
  message: string;
  errors?: Record<string, string[]>;
  detail?: string;
}
