/**
 * TypeScript types for Platform Plans feature
 */

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  currency?: string;
  trial_days?: number;
  limits_json?: Record<string, any>;
  seat_based_pricing?: boolean;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlansListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Plan[];
}

export interface CreatePlanRequest {
  name: string;
  slug: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  currency?: string;
  trial_days?: number;
  limits_json?: Record<string, any>;
  seat_based_pricing?: boolean;
  is_active?: boolean;
  is_public?: boolean;
}

export interface UpdatePlanRequest {
  name?: string;
  slug?: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  currency?: string;
  trial_days?: number;
  limits_json?: Record<string, any>;
  seat_based_pricing?: boolean;
  is_active?: boolean;
  is_public?: boolean;
}
