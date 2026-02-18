/**
 * TypeScript types for Tenant Attendance feature
 */

export interface Attendance {
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
  date: string;
  status: 'PRESENT' | 'ABSENT';
  notes?: string;
  marked_by?: number;
  marked_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Attendance[];
}

export interface CreateAttendanceRequest {
  student: number;
  class_obj: number;
  date: string;
  status: 'PRESENT' | 'ABSENT';
  notes?: string;
}

export interface UpdateAttendanceRequest {
  status?: 'PRESENT' | 'ABSENT';
  notes?: string;
}

export interface MarkAttendanceRequest {
  class_id: number;
  date: string; // YYYY-MM-DD
  attendance_records: Array<{
    student_id: number;
    status: 'PRESENT' | 'ABSENT';
    notes?: string;
  }>;
}

export interface MarkAttendanceResponse {
  message: string;
  attendance_records: Attendance[];
}

export interface CoachAttendance {
  id: number;
  academy: number;
  coach: number;
  coach_detail?: {
    id: number;
    full_name: string;
    email?: string;
  };
  class_obj: number;
  class_detail?: {
    id: number;
    name: string;
  };
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  notes?: string;
  marked_by?: number;
  marked_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CoachAttendanceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CoachAttendance[];
}

export interface CreateCoachAttendanceRequest {
  coach: number;
  class_obj: number;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  notes?: string;
}

export interface UpdateCoachAttendanceRequest {
  status?: 'PRESENT' | 'ABSENT' | 'LATE';
  notes?: string;
}
