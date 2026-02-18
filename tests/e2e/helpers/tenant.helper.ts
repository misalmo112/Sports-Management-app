import { ApiHelper, createApiHelper, ApiResponseWrapper } from './api.helper';
import { TokenStorage } from './auth.helper';
import testData from '../fixtures/test-data.json';

/**
 * Academy creation response
 */
export interface Academy {
  id: string;
  name: string;
  email: string;
  phone?: string;
  timezone: string;
  onboarding_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Onboarding state response
 */
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
}

/**
 * Academy creation payload
 */
export interface CreateAcademyPayload {
  name: string;
  owner_email: string;
  plan_id?: string;
}

/**
 * Onboarding step payloads
 */
export interface ProfilePayload {
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
}

export interface LocationPayload {
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

export interface SportPayload {
  name: string;
  description?: string;
  age_min?: number;
  age_max?: number;
}

export interface AgeCategoryPayload {
  name: string;
  age_min: number;
  age_max: number;
  description?: string;
}

export interface TermPayload {
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface PricingPayload {
  name: string;
  description?: string;
  duration_type: 'MONTHLY' | 'WEEKLY' | 'SESSION' | 'CUSTOM';
  duration_value: number;
  price: number;
  currency: string;
}

/**
 * Tenant helper class for managing academies and onboarding
 */
export class TenantHelper {
  private apiHelper: ApiHelper;

  constructor(apiHelper?: ApiHelper) {
    this.apiHelper = apiHelper || createApiHelper();
  }

  /**
   * Initialize the helper
   */
  async init(): Promise<void> {
    await this.apiHelper.init();
  }

  /**
   * Cleanup
   */
  async dispose(): Promise<void> {
    await this.apiHelper.dispose();
  }

  /**
   * Set authentication from token storage
   */
  setAuth(tokenStorage: TokenStorage): void {
    this.apiHelper.setAuth(tokenStorage);
  }

  /**
   * Set token directly
   */
  setToken(token: string): void {
    this.apiHelper.setToken(token);
  }

  /**
   * Set academy context
   */
  setAcademyId(academyId: string): void {
    this.apiHelper.setAcademyId(academyId);
  }

  /**
   * Create an academy as superadmin
   */
  async createAcademy(
    payload: CreateAcademyPayload,
    token?: string
  ): Promise<ApiResponseWrapper<Academy>> {
    return this.apiHelper.post<Academy>('/platform/academies/', payload, { token });
  }

  /**
   * Create an academy as superadmin with default test data
   */
  async createAcademyAsSuperadmin(
    token: string,
    ownerEmail: string,
    academyData?: Partial<CreateAcademyPayload>
  ): Promise<ApiResponseWrapper<Academy>> {
    const payload: CreateAcademyPayload = {
      name: academyData?.name || testData.testAcademy.name,
      owner_email: ownerEmail,
      ...academyData,
    };

    return this.createAcademy(payload, token);
  }

  /**
   * Get academy details
   */
  async getAcademy(
    academyId: string,
    token?: string
  ): Promise<ApiResponseWrapper<Academy>> {
    return this.apiHelper.get<Academy>(`/platform/academies/${academyId}/`, { token });
  }

  /**
   * List all academies (superadmin only)
   */
  async listAcademies(
    token?: string,
    params?: { slug?: string; page_size?: number }
  ): Promise<ApiResponseWrapper<{ results: Academy[]; count: number }>> {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.slug) queryParams.append('slug', params.slug);
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `/platform/academies/?${queryString}` : '/platform/academies/';
    
    return this.apiHelper.get(url, { token });
  }

  /**
   * Update academy quota
   */
  async updateAcademyQuota(
    academyId: string,
    quota: Record<string, number>,
    token?: string
  ): Promise<ApiResponseWrapper<Academy>> {
    // Backend expects { overrides_json: { ... } }
    return this.apiHelper.patch<Academy>(
      `/platform/academies/${academyId}/quota/`,
      { overrides_json: quota },
      { token }
    );
  }

  /**
   * Update academy plan
   */
  async updateAcademyPlan(
    academyId: string,
    planId: string,
    token?: string
  ): Promise<ApiResponseWrapper<Academy>> {
    return this.apiHelper.patch<Academy>(
      `/platform/academies/${academyId}/plan/`,
      { plan_id: planId },
      { token }
    );
  }

  /**
   * Get onboarding state
   */
  async getOnboardingState(
    token?: string,
    academyId?: string
  ): Promise<ApiResponseWrapper<OnboardingState>> {
    return this.apiHelper.get<OnboardingState>('/tenant/onboarding/state/', {
      token,
      academyId,
    });
  }

  /**
   * Submit onboarding step 1 - Profile
   */
  async submitOnboardingStep1(
    profile: ProfilePayload,
    token?: string,
    academyId?: string
  ): Promise<ApiResponseWrapper<{ status: string; step: number; next_step: number }>> {
    return this.apiHelper.post('/tenant/onboarding/step/1/', profile, {
      token,
      academyId,
    });
  }

  /**
   * Submit onboarding step 2 - Locations
   */
  async submitOnboardingStep2(
    locations: LocationPayload[],
    token?: string,
    academyId?: string
  ): Promise<ApiResponseWrapper<{ status: string; step: number; next_step: number }>> {
    return this.apiHelper.post('/tenant/onboarding/step/2/', { locations }, {
      token,
      academyId,
    });
  }

  /**
   * Submit onboarding step 3 - Sports
   */
  async submitOnboardingStep3(
    sports: SportPayload[],
    token?: string,
    academyId?: string
  ): Promise<ApiResponseWrapper<{ status: string; step: number; next_step: number }>> {
    return this.apiHelper.post('/tenant/onboarding/step/3/', { sports }, {
      token,
      academyId,
    });
  }

  /**
   * Submit onboarding step 4 - Age Categories
   */
  async submitOnboardingStep4(
    ageCategories: AgeCategoryPayload[],
    token?: string,
    academyId?: string
  ): Promise<ApiResponseWrapper<{ status: string; step: number; next_step: number }>> {
    return this.apiHelper.post('/tenant/onboarding/step/4/', { age_categories: ageCategories }, {
      token,
      academyId,
    });
  }

  /**
   * Submit onboarding step 5 - Terms
   */
  async submitOnboardingStep5(
    terms: TermPayload[],
    token?: string,
    academyId?: string
  ): Promise<ApiResponseWrapper<{ status: string; step: number; next_step: number }>> {
    return this.apiHelper.post('/tenant/onboarding/step/5/', { terms }, {
      token,
      academyId,
    });
  }

  /**
   * Submit onboarding step 6 - Pricing
   */
  async submitOnboardingStep6(
    pricingItems: PricingPayload[],
    token?: string,
    academyId?: string
  ): Promise<ApiResponseWrapper<{ status: string; step: number; onboarding_complete: boolean }>> {
    return this.apiHelper.post('/tenant/onboarding/step/6/', { pricing_items: pricingItems }, {
      token,
      academyId,
    });
  }

  /**
   * Complete full onboarding with default test data
   */
  async completeOnboardingAsAdmin(
    token: string,
    academyId: string,
    customData?: Partial<typeof testData.onboarding>
  ): Promise<void> {
    const onboardingData = { ...testData.onboarding, ...customData };

    // Step 1 - Profile
    const step1Response = await this.submitOnboardingStep1(
      onboardingData.profile as ProfilePayload,
      token,
      academyId
    );
    if (!step1Response.ok) {
      throw new Error(`Onboarding step 1 failed: ${JSON.stringify(step1Response.data)}`);
    }

    // Step 2 - Locations
    const step2Response = await this.submitOnboardingStep2(
      onboardingData.locations as LocationPayload[],
      token,
      academyId
    );
    if (!step2Response.ok) {
      throw new Error(`Onboarding step 2 failed: ${JSON.stringify(step2Response.data)}`);
    }

    // Step 3 - Sports
    const step3Response = await this.submitOnboardingStep3(
      onboardingData.sports as SportPayload[],
      token,
      academyId
    );
    if (!step3Response.ok) {
      throw new Error(`Onboarding step 3 failed: ${JSON.stringify(step3Response.data)}`);
    }

    // Step 4 - Age Categories
    const step4Response = await this.submitOnboardingStep4(
      onboardingData.ageCategories as AgeCategoryPayload[],
      token,
      academyId
    );
    if (!step4Response.ok) {
      throw new Error(`Onboarding step 4 failed: ${JSON.stringify(step4Response.data)}`);
    }

    // Step 5 - Terms
    const step5Response = await this.submitOnboardingStep5(
      onboardingData.terms as TermPayload[],
      token,
      academyId
    );
    if (!step5Response.ok) {
      throw new Error(`Onboarding step 5 failed: ${JSON.stringify(step5Response.data)}`);
    }

    // Step 6 - Pricing
    const step6Response = await this.submitOnboardingStep6(
      onboardingData.pricing as PricingPayload[],
      token,
      academyId
    );
    if (!step6Response.ok) {
      throw new Error(`Onboarding step 6 failed: ${JSON.stringify(step6Response.data)}`);
    }
  }
}

/**
 * Create a new tenant helper instance
 */
export function createTenantHelper(): TenantHelper {
  return new TenantHelper();
}

/**
 * Convenience function to create academy as superadmin
 */
export async function createAcademyAsSuperadmin(
  token: string,
  ownerEmail: string,
  academyData?: Partial<CreateAcademyPayload>
): Promise<ApiResponseWrapper<Academy>> {
  const helper = createTenantHelper();
  await helper.init();
  try {
    return await helper.createAcademyAsSuperadmin(token, ownerEmail, academyData);
  } finally {
    await helper.dispose();
  }
}

/**
 * Convenience function to complete onboarding as admin
 */
export async function completeOnboardingAsAdmin(
  token: string,
  academyId: string,
  customData?: Partial<typeof testData.onboarding>
): Promise<void> {
  const helper = createTenantHelper();
  await helper.init();
  try {
    await helper.completeOnboardingAsAdmin(token, academyId, customData);
  } finally {
    await helper.dispose();
  }
}

/**
 * Convenience function to select academy context
 * Returns headers with X-Academy-ID set
 */
export function selectAcademyContext(academyId: string): Record<string, string> {
  return {
    'X-Academy-ID': academyId,
  };
}
