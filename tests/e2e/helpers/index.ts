/**
 * E2E Test Helpers - Central Export
 * 
 * Import all helpers from this file:
 * import { loginAsAdmin, createStudent, assertForbidden } from './helpers';
 */

// Auth helpers
export {
  AuthHelper,
  createAuthHelper,
  loginAsSuperadmin,
  loginAsAdmin,
  loginAsCoach,
  loginAsParent,
  acceptInvite,
  getInviteTokenForUser,
  ensureUserAuthenticated,
  TokenStorage,
  AuthResponse,
} from './auth.helper';

// API helpers
export {
  ApiHelper,
  createApiHelper,
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  ApiResponseWrapper,
  PaginatedResponse,
  ErrorResponse,
} from './api.helper';

// Tenant helpers
export {
  TenantHelper,
  createTenantHelper,
  createAcademyAsSuperadmin,
  completeOnboardingAsAdmin,
  selectAcademyContext,
  Academy,
  OnboardingState,
  CreateAcademyPayload,
  ProfilePayload,
  LocationPayload,
  SportPayload,
  AgeCategoryPayload,
  TermPayload,
  PricingPayload,
} from './tenant.helper';

// Data factory
export {
  DataFactory,
  createDataFactory,
  createStudent,
  createClass,
  enrollStudent,
  createInvoice,
  createReceipt,
  uploadMediaFile,
  Student,
  Class,
  Enrollment,
  AttendanceRecord,
  BillingItem,
  Invoice,
  Receipt,
  MediaFile,
  UserInvite,
} from './data.factory';

// Assertions
export {
  HTTP_STATUS,
  assertForbidden,
  assertUnauthorized,
  assertUnauthorizedOrNotFound,
  assertNotFound,
  assertBadRequest,
  assertBadRequestOrNotFound,
  assertQuotaExceeded,
  assertOnboardingBlocked,
  assertSuccess,
  assertCreated,
  assertNoContent,
  assertHasResults,
  assertEmptyResults,
  assertEmptyState,
  assertErrorMessage,
  assertSuccessMessage,
  assertOnPage,
  assertRedirectedToLogin,
  assertRedirectedToDashboard,
  assertRedirectedToOnboarding,
  assertSidebarContains,
  assertSidebarDoesNotContain,
  assertLoading,
  assertNotLoading,
  assertTableHasRows,
  assertTableEmpty,
  assertFormError,
} from './assertions.helper';

// UI helpers
export {
  UIHelper,
  createUIHelper,
  waitForAPIResponse,
  fillForm,
} from './ui.helper';

// Frontend helpers
export {
  isFrontendAvailable,
  loginViaUI,
} from './frontend.helper';
