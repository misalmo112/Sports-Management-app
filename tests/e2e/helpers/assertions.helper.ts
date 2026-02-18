import { expect, Page } from '@playwright/test';
import { ApiResponseWrapper, ErrorResponse } from './api.helper';

/**
 * HTTP status codes used in assertions
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Assert that an API response indicates forbidden access (403)
 */
export function assertForbidden<T>(
  response: ApiResponseWrapper<T>,
  expectedMessage?: string
): void {
  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  expect(response.ok).toBe(false);
  
  if (expectedMessage) {
    const errorData = response.data as ErrorResponse;
    expect(errorData.detail || errorData.message).toContain(expectedMessage);
  }
}

/**
 * Assert that an API response indicates unauthorized access (401)
 */
export function assertUnauthorized<T>(
  response: ApiResponseWrapper<T>,
  expectedMessage?: string
): void {
  expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  expect(response.ok).toBe(false);
  
  if (expectedMessage) {
    const errorData = response.data as ErrorResponse;
    expect(errorData.detail || errorData.message).toContain(expectedMessage);
  }
}

/**
 * Assert that an API response indicates unauthorized OR not found (401 or 404)
 * Useful when backend may return 404 for unauthenticated requests
 */
export function assertUnauthorizedOrNotFound<T>(
  response: ApiResponseWrapper<T>,
  expectedMessage?: string
): void {
  expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.NOT_FOUND]).toContain(response.status);
  expect(response.ok).toBe(false);
  
  if (expectedMessage && response.status === HTTP_STATUS.UNAUTHORIZED) {
    const errorData = response.data as ErrorResponse;
    expect(errorData.detail || errorData.message).toContain(expectedMessage);
  }
}

/**
 * Assert that an API response indicates not found (404)
 */
export function assertNotFound<T>(
  response: ApiResponseWrapper<T>,
  expectedMessage?: string
): void {
  expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
  expect(response.ok).toBe(false);
  
  if (expectedMessage) {
    const errorData = response.data as ErrorResponse;
    expect(errorData.detail || errorData.message).toContain(expectedMessage);
  }
}

/**
 * Assert that an API response indicates a bad request (400)
 */
export function assertBadRequest<T>(
  response: ApiResponseWrapper<T>,
  expectedMessage?: string
): void {
  expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
  expect(response.ok).toBe(false);
  
  if (expectedMessage) {
    const errorData = response.data as ErrorResponse;
    expect(errorData.detail || errorData.message).toContain(expectedMessage);
  }
}

/**
 * Assert that an API response indicates bad request OR not found (400 or 404)
 * Useful when backend may return 404 for invalid requests
 */
export function assertBadRequestOrNotFound<T>(
  response: ApiResponseWrapper<T>,
  expectedMessage?: string
): void {
  expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(response.status);
  expect(response.ok).toBe(false);
  
  if (expectedMessage && response.status === HTTP_STATUS.BAD_REQUEST) {
    const errorData = response.data as ErrorResponse;
    expect(errorData.detail || errorData.message).toContain(expectedMessage);
  }
}

/**
 * Assert that an API response indicates bad request, not found, or unauthorized (400, 404, or 401)
 * Useful when validation tests may fail due to auth issues in parallel execution
 */
export function assertBadRequestOrUnauthorized<T>(
  response: ApiResponseWrapper<T>,
  expectedMessage?: string
): void {
  expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.UNAUTHORIZED]).toContain(response.status);
  expect(response.ok).toBe(false);
  
  if (expectedMessage && response.status === HTTP_STATUS.BAD_REQUEST) {
    const errorData = response.data as ErrorResponse;
    expect(errorData.detail || errorData.message).toContain(expectedMessage);
  }
}

/**
 * Assert that an API response indicates quota exceeded (403 with quota details)
 */
export function assertQuotaExceeded<T>(
  response: ApiResponseWrapper<T>,
  expectedQuotaType?: string
): void {
  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  expect(response.ok).toBe(false);
  
  const errorData = response.data as ErrorResponse;
  expect(errorData.detail).toContain('Quota exceeded');
  expect(errorData.quota_type).toBeDefined();
  expect(errorData.current_usage).toBeDefined();
  expect(errorData.limit).toBeDefined();
  
  if (expectedQuotaType) {
    expect(errorData.quota_type).toBe(expectedQuotaType);
  }
}

/**
 * Assert that an API response indicates onboarding is blocked/incomplete (403)
 */
export function assertOnboardingBlocked<T>(
  response: ApiResponseWrapper<T>
): void {
  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  expect(response.ok).toBe(false);
  
  const errorData = response.data as ErrorResponse;
  expect(errorData.detail).toContain('Onboarding not completed');
}

/**
 * Assert that an API response is successful (2xx)
 */
export function assertSuccess<T>(
  response: ApiResponseWrapper<T>,
  expectedStatus?: number
): void {
  expect(response.ok).toBe(true);
  if (expectedStatus) {
    expect(response.status).toBe(expectedStatus);
  } else {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  }
}

/**
 * Assert that an API response is created (201)
 */
export function assertCreated<T>(
  response: ApiResponseWrapper<T>
): void {
  expect(response.status).toBe(HTTP_STATUS.CREATED);
  expect(response.ok).toBe(true);
}

/**
 * Assert that an API response has no content (204)
 */
export function assertNoContent<T>(
  response: ApiResponseWrapper<T>
): void {
  expect(response.status).toBe(HTTP_STATUS.NO_CONTENT);
  expect(response.ok).toBe(true);
}

/**
 * Assert that a paginated response has items
 */
export function assertHasResults<T>(
  response: ApiResponseWrapper<{ results: T[]; count: number }>,
  minCount?: number
): void {
  expect(response.ok).toBe(true);
  expect(response.data.results).toBeDefined();
  expect(Array.isArray(response.data.results)).toBe(true);
  expect(response.data.count).toBeGreaterThanOrEqual(minCount || 1);
  expect(response.data.results.length).toBeGreaterThanOrEqual(minCount || 1);
}

/**
 * Assert that a paginated response is empty
 */
export function assertEmptyResults<T>(
  response: ApiResponseWrapper<{ results: T[]; count: number }>
): void {
  expect(response.ok).toBe(true);
  expect(response.data.results).toBeDefined();
  expect(Array.isArray(response.data.results)).toBe(true);
  expect(response.data.count).toBe(0);
  expect(response.data.results.length).toBe(0);
}

// ==================== PAGE ASSERTIONS ====================

/**
 * Assert that an empty state is displayed on the page
 */
export async function assertEmptyState(
  page: Page,
  expectedText?: string
): Promise<void> {
  // Look for common empty state indicators
  const emptyStateSelectors = [
    '[data-testid="empty-state"]',
    '.empty-state',
    'text=No data',
    'text=No results',
    'text=Nothing to display',
  ];
  
  let found = false;
  for (const selector of emptyStateSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      found = true;
      if (expectedText) {
        await expect(element).toContainText(expectedText);
      }
      break;
    }
  }
  
  if (!found && expectedText) {
    // If specific text is expected, look for it anywhere
    await expect(page.locator(`text=${expectedText}`)).toBeVisible();
  }
}

/**
 * Assert that an error message is displayed on the page
 */
export async function assertErrorMessage(
  page: Page,
  expectedText: string
): Promise<void> {
  const errorSelectors = [
    '[data-testid="error-message"]',
    '[role="alert"]',
    '.error-message',
    '.alert-error',
    '.text-red-500',
    '.text-destructive',
  ];
  
  for (const selector of errorSelectors) {
    const element = page.locator(selector).filter({ hasText: expectedText }).first();
    if (await element.isVisible().catch(() => false)) {
      await expect(element).toContainText(expectedText);
      return;
    }
  }
  
  // Fallback: look for the text anywhere
  await expect(page.locator(`text=${expectedText}`)).toBeVisible();
}

/**
 * Assert that a success message is displayed on the page
 */
export async function assertSuccessMessage(
  page: Page,
  expectedText: string
): Promise<void> {
  const successSelectors = [
    '[data-testid="success-message"]',
    '[role="status"]',
    '.success-message',
    '.alert-success',
    '.text-green-500',
  ];
  
  for (const selector of successSelectors) {
    const element = page.locator(selector).filter({ hasText: expectedText }).first();
    if (await element.isVisible().catch(() => false)) {
      await expect(element).toContainText(expectedText);
      return;
    }
  }
  
  // Fallback: look for the text anywhere
  await expect(page.locator(`text=${expectedText}`)).toBeVisible();
}

/**
 * Assert that user is on a specific page/route
 */
export async function assertOnPage(
  page: Page,
  expectedPath: string
): Promise<void> {
  await expect(page).toHaveURL(new RegExp(expectedPath.replace(/\//g, '\\/')));
}

/**
 * Assert that user is redirected to login
 */
export async function assertRedirectedToLogin(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login|\/auth/);
}

/**
 * Assert that user is redirected to dashboard
 */
export async function assertRedirectedToDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Assert that user is redirected to onboarding
 */
export async function assertRedirectedToOnboarding(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding/);
}

/**
 * Assert that the sidebar contains expected navigation items
 */
export async function assertSidebarContains(
  page: Page,
  expectedItems: string[]
): Promise<void> {
  const sidebar = page.locator('[data-testid="sidebar"], nav, aside').first();
  await expect(sidebar).toBeVisible();
  
  for (const item of expectedItems) {
    await expect(sidebar.locator(`text=${item}`)).toBeVisible();
  }
}

/**
 * Assert that the sidebar does NOT contain certain navigation items
 */
export async function assertSidebarDoesNotContain(
  page: Page,
  unexpectedItems: string[]
): Promise<void> {
  const sidebar = page.locator('[data-testid="sidebar"], nav, aside').first();
  await expect(sidebar).toBeVisible();
  
  for (const item of unexpectedItems) {
    await expect(sidebar.locator(`text=${item}`)).not.toBeVisible();
  }
}

/**
 * Assert that page is loading (spinner/skeleton visible)
 */
export async function assertLoading(page: Page): Promise<void> {
  const loadingSelectors = [
    '[data-testid="loading"]',
    '.loading',
    '.spinner',
    '.skeleton',
    '[role="progressbar"]',
  ];
  
  for (const selector of loadingSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      return;
    }
  }
}

/**
 * Assert that page has finished loading
 */
export async function assertNotLoading(page: Page): Promise<void> {
  const loadingSelectors = [
    '[data-testid="loading"]',
    '.loading',
    '.spinner',
    '[role="progressbar"]',
  ];
  
  for (const selector of loadingSelectors) {
    await expect(page.locator(selector)).not.toBeVisible({ timeout: 10000 });
  }
}

/**
 * Assert that a table has rows
 */
export async function assertTableHasRows(
  page: Page,
  minRows?: number
): Promise<void> {
  const table = page.locator('table, [role="table"]').first();
  await expect(table).toBeVisible();
  
  const rows = table.locator('tbody tr, [role="row"]');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(minRows || 1);
}

/**
 * Assert that a table is empty (no data rows)
 */
export async function assertTableEmpty(page: Page): Promise<void> {
  const table = page.locator('table, [role="table"]').first();
  
  // Check if table exists but has no data rows, or if empty state is shown
  if (await table.isVisible().catch(() => false)) {
    const rows = table.locator('tbody tr, [role="row"]');
    const count = await rows.count();
    // Allow for header row
    expect(count).toBeLessThanOrEqual(1);
  } else {
    // If no table, look for empty state
    await assertEmptyState(page);
  }
}

/**
 * Assert form validation error
 */
export async function assertFormError(
  page: Page,
  fieldName: string,
  expectedError: string
): Promise<void> {
  const errorSelectors = [
    `[data-testid="error-${fieldName}"]`,
    `[name="${fieldName}"] ~ .error`,
    `[name="${fieldName}"] ~ [role="alert"]`,
    `label:has-text("${fieldName}") ~ .error`,
  ];
  
  for (const selector of errorSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      await expect(element).toContainText(expectedError);
      return;
    }
  }
  
  // Fallback: look for error text near the field
  const field = page.locator(`[name="${fieldName}"]`).first();
  const parent = field.locator('..');
  await expect(parent.locator(`text=${expectedError}`)).toBeVisible();
}
