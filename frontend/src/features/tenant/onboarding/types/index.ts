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
    step_6: { name: string; completed: boolean };
  };
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  completed_at: string | null;
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
  phone?: string;
  website?: string;
  address_line1?: string;
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

// Step 4: Age Categories
export interface AgeCategory {
  name: string;
  age_min: number;
  age_max: number;
  description?: string;
}

export interface Step4AgeCategories {
  age_categories: AgeCategory[];
}

// Step 5: Terms
export interface Term {
  name: string;
  start_date: string; // ISO date string YYYY-MM-DD
  end_date: string; // ISO date string YYYY-MM-DD
  description?: string;
}

export interface Step5Terms {
  terms: Term[];
}

// Step 6: Pricing
export type DurationType = 'MONTHLY' | 'WEEKLY' | 'SESSION' | 'CUSTOM';

export interface PricingItem {
  name: string;
  description?: string;
  duration_type: DurationType;
  duration_value: number;
  price: number;
  currency: string;
}

export interface Step6Pricing {
  pricing_items: PricingItem[];
}

// Union type for all step data
export type StepData = 
  | Step1Profile 
  | Step2Locations 
  | Step3Sports 
  | Step4AgeCategories 
  | Step5Terms 
  | Step6Pricing;

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
