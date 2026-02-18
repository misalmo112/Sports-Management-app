/**
 * TypeScript types for Tenant Classes and Enrollments feature
 */

export interface Class {
  id: number;
  academy: number;
  name: string;
  description?: string;
  coach?: number;
  coach_name?: string; // Used in list serializer
  coach_detail?: {
    id: number;
    full_name: string;
    email?: string;
  };
  sport?: number;
  sport_name?: string; // Used in list serializer
  sport_detail?: {
    id: number;
    name: string;
  };
  location?: number;
  location_name?: string; // Used in list serializer
  location_detail?: {
    id: number;
    name: string;
  };
  max_capacity: number;
  current_enrollment: number;
  available_spots: number;
  is_full: boolean;
  schedule?: Record<string, any>;
  start_date?: string;
  end_date?: string;
  enrolled_students?: Array<{
    id: number;
    full_name: string;
    email?: string;
  }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Class[];
}

export interface CreateClassRequest {
  name: string;
  description?: string;
  coach?: number;
  sport?: number;
  location?: number;
  max_capacity?: number;
  schedule?: Record<string, any>;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  coach?: number;
  sport?: number;
  location?: number;
  max_capacity?: number;
  schedule?: Record<string, any>;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface Enrollment {
  id: number;
  academy: number;
  student: number;
  student_detail?: {
    id: number;
    full_name: string;
    email?: string;
  };
  class_obj: number;
  class_detail?: {
    id: number;
    name: string;
  };
  status: 'ENROLLED' | 'COMPLETED' | 'DROPPED';
  enrolled_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Enrollment[];
}

export interface CreateEnrollmentRequest {
  student: number;
  class_obj: number;
  notes?: string;
}

export interface EnrollStudentRequest {
  student_id: number;
  notes?: string;
}

export interface UpdateEnrollmentRequest {
  status?: 'ENROLLED' | 'COMPLETED' | 'DROPPED';
  notes?: string;
}
