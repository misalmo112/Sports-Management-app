/**
 * TypeScript types for Tenant Feedback feature
 */

export type FeedbackStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Feedback {
  id: number;
  academy: string;
  parent: number;
  parent_email: string;
  parent_name: string;
  student: number | null;
  student_name: string | null;
  subject: string;
  message: string;
  status: FeedbackStatus;
  status_display: string;
  priority: FeedbackPriority;
  priority_display: string;
  assigned_to: number | null;
  assigned_to_email: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Feedback[];
}

export interface CreateFeedbackRequest {
  /** Omit or null for feedback not about a specific child */
  student?: number | null;
  subject: string;
  message: string;
  priority: FeedbackPriority;
}

export interface UpdateFeedbackRequest {
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  assigned_to?: number | null;
  resolution_notes?: string | null;
}
