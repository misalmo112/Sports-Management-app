/**
 * Parent dashboard — portal student API (subset used for safety/medical edits).
 */
export interface PortalStudentDetail {
  id: number;
  academy: number;
  parent: number;
  is_active: boolean;
  emirates_id: string | null;
  created_at: string;
  updated_at: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  medical_notes: string;
  allergies: string;
}

export type PortalStudentPatchPayload = Pick<
  PortalStudentDetail,
  | 'emergency_contact_name'
  | 'emergency_contact_phone'
  | 'emergency_contact_relationship'
  | 'medical_notes'
  | 'allergies'
>;
