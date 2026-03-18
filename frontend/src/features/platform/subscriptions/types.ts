/**
 * TypeScript types for Platform Plans feature
 */

/** Plan quota limits (keys match backend limits_json). */
export interface PlanLimits {
  storage_bytes?: number;
  max_students?: number;
  max_coaches?: number;
  max_admins?: number;
  max_classes?: number;
}

/** Normalize plan.limits_json (or {}) into PlanLimits for form state. */
export function limitsFromJson(json: Record<string, unknown> | undefined): PlanLimits {
  if (!json || typeof json !== 'object') return {};
  return {
    storage_bytes: typeof json.storage_bytes === 'number' ? json.storage_bytes : undefined,
    max_students: typeof json.max_students === 'number' ? json.max_students : undefined,
    max_coaches: typeof json.max_coaches === 'number' ? json.max_coaches : undefined,
    max_admins: typeof json.max_admins === 'number' ? json.max_admins : undefined,
    max_classes: typeof json.max_classes === 'number' ? json.max_classes : undefined,
  };
}

/** Build object for limits_json API: only include keys with number >= 0. */
export function limitsToJson(limits: PlanLimits): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof limits.storage_bytes === 'number' && limits.storage_bytes >= 0) {
    out.storage_bytes = Math.floor(limits.storage_bytes);
  }
  if (typeof limits.max_students === 'number' && limits.max_students >= 0) {
    out.max_students = Math.floor(limits.max_students);
  }
  if (typeof limits.max_coaches === 'number' && limits.max_coaches >= 0) {
    out.max_coaches = Math.floor(limits.max_coaches);
  }
  if (typeof limits.max_admins === 'number' && limits.max_admins >= 0) {
    out.max_admins = Math.floor(limits.max_admins);
  }
  if (typeof limits.max_classes === 'number' && limits.max_classes >= 0) {
    out.max_classes = Math.floor(limits.max_classes);
  }
  return out;
}

/** Format storage bytes for display (e.g. "10 GB"). */
export function formatStorageBytes(bytes: number): string {
  if (bytes === 0) return '0 GB';
  const gb = bytes / (1024 ** 3);
  return `${gb % 1 === 0 ? gb : gb.toFixed(2)} GB`;
}

/** Labels and values for plan limits display. */
export interface PlanLimitDisplayItem {
  label: string;
  value: string;
}

/** Build list of limit label/value for detail view. */
export function formatLimitsForDisplay(limits: Record<string, unknown> | undefined): PlanLimitDisplayItem[] {
  if (!limits || typeof limits !== 'object') return [];
  const items: PlanLimitDisplayItem[] = [];
  if (typeof limits.max_students === 'number') {
    items.push({ label: 'Max students', value: String(limits.max_students) });
  }
  if (typeof limits.max_coaches === 'number') {
    items.push({ label: 'Max coaches', value: String(limits.max_coaches) });
  }
  if (typeof limits.max_admins === 'number') {
    items.push({ label: 'Max admins', value: String(limits.max_admins) });
  }
  if (typeof limits.max_classes === 'number') {
    items.push({ label: 'Max classes', value: String(limits.max_classes) });
  }
  if (typeof limits.storage_bytes === 'number') {
    items.push({ label: 'Storage', value: formatStorageBytes(limits.storage_bytes) });
  }
  return items;
}

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
