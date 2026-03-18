/**
 * TypeScript types for onboarding wizard
 */

// Onboarding state from API
export interface OnboardingState {
  academy_id: string;
  current_step: number;
  is_completed: boolean;
  steps: {
    step_1: { name: string; completed: boolean };
    step_2: { name: string; completed: boolean };
    step_3: { name: string; completed: boolean };
    step_4: { name: string; completed: boolean };
    step_5: { name: string; completed: boolean };
  };
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  completed_at: string | null;
  /** Current academy profile for Step 1 pre-fill (from GET onboarding/state/) */
  profile?: Step1Profile;
}

// API response wrapper
export interface OnboardingStateResponse {
  status: 'success' | 'error';
  data: OnboardingState;
}

// Step 1: Academy Profile
export interface Step1Profile {
  name: string;
  email: string;
  phone: string;
  website?: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone: string;
  currency: string;
}

// Step 2: Locations
export interface Location {
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  capacity?: number;
}

export interface Step2Locations {
  locations: Location[];
}

// Step 3: Sports
export interface Sport {
  name: string;
  description?: string;
  age_min?: number;
  age_max?: number;
}

export interface Step3Sports {
  sports: Sport[];
}

// Legacy (optional): Age Categories (not part of activation wizard)
export interface AgeCategory {
  name: string;
  age_min: number;
  age_max: number;
  description?: string;
}

export interface AgeCategoriesPayload {
  age_categories: AgeCategory[];
}

// Step 4: Terms
export interface Term {
  name: string;
  start_date: string; // ISO date string YYYY-MM-DD
  end_date: string; // ISO date string YYYY-MM-DD
  description?: string;
}

export interface Step4Terms {
  terms: Term[];
}

// Step 5: Pricing
export type DurationType = 'MONTHLY' | 'WEEKLY' | 'SESSION' | 'CUSTOM';

export interface PricingItem {
  name: string;
  description?: string;
  duration_type: DurationType;
  duration_value: number;
  price: number;
  // Currency is determined server-side from the academy profile.
  currency?: string;
}

export interface Step5Pricing {
  pricing_items: PricingItem[];
}

// Union type for all step data
export type StepData = 
  | Step1Profile 
  | Step2Locations 
  | Step3Sports 
  | Step4Terms 
  | Step5Pricing;

export interface OnboardingChecklistState {
  academy_id: string;
  members_imported: boolean;
  staff_invited: boolean;
  first_program_created: boolean;
  age_categories_configured: boolean;
  attendance_defaults_configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingChecklistResponse {
  status: 'success' | 'error';
  data: OnboardingChecklistState;
}

export interface OnboardingTemplatesResponse {
  status: 'success' | 'error';
  data: {
    timezone: string;
    currency: string;
    suggested_term: Term;
    suggested_pricing_items: PricingItem[];
  };
}

// Step response from API
export interface StepResponse {
  status: 'success' | 'error';
  step: number;
  message: string;
  data?: any;
  next_step?: number | null;
  onboarding_complete?: boolean;
  errors?: Record<string, string[]>;
}

// API error response
export interface OnboardingError {
  status: 'error';
  step?: number;
  message: string;
  errors?: Record<string, string[]>;
  detail?: string;
  locked_by?: string;
  locked_at?: string;
}
