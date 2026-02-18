/**
 * TypeScript types for Tenant Media feature
 */

export interface ClassDetail {
  id: number;
  name: string;
  coach_name?: string;
  max_capacity: number;
  current_enrollment: number;
  available_spots: number;
  is_full: boolean;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

export interface MediaFile {
  id: string; // UUID
  academy: number;
  class_obj?: number;
  class_detail?: ClassDetail;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaFilesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MediaFile[];
}

export interface UploadMediaRequest {
  file: File;
  class_id?: number;
  description?: string;
  onProgress?: (progress: number) => void;
}

export interface QuotaError {
  detail: string;
  quota_type?: string;
  current_usage?: number;
  limit?: number;
  requested?: number;
}
