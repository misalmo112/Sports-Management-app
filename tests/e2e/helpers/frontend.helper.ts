import { Page } from '@playwright/test';
import { TEST_CONFIG } from '../playwright.config';
import { createUIHelper } from './ui.helper';

export async function isFrontendAvailable(
  url: string = TEST_CONFIG.FRONTEND_URL,
  timeoutMs = 3000
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, { method: 'GET', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Login via UI with email and password
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const uiHelper = createUIHelper(page);
  await uiHelper.login(email, password);
}
