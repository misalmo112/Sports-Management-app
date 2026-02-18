/**
 * TypeScript types for Tenant Students feature
 */

export interface Student {
  id: number;
  academy: number;
  parent?: number;
  parent_detail?: {
    id: number;
    full_name: string;
    email: string;
    phone?: string;
    is_active: boolean;
  };
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  email?: string;
  phone?: string;
  emirates_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_notes?: string;
  allergies?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Student[];
}

export interface CreateParentData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface CreateStudentRequest {
  parent?: number;
  parent_data?: CreateParentData;
  enroll_class_id?: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  email?: string;
  phone?: string;
  emirates_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_notes?: string;
  allergies?: string;
  is_active?: boolean;
}

export interface UpdateStudentRequest {
  parent?: number;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  email?: string;
  phone?: string;
  emirates_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_notes?: string;
  allergies?: string;
  is_active?: boolean;
}
