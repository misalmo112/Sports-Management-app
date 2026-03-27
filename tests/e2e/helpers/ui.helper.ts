import { Page, expect, Locator } from '@playwright/test';
import { TEST_CONFIG } from '../playwright.config';

/**
 * UI Helper for frontend interactions
 * Provides functions for common UI operations like login, navigation, form filling
 */
export class UIHelper {
  constructor(private page: Page) {}

  /**
   * Login via UI with email and password
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Wait for login form to be visible
    await this.page.waitForSelector('input[type="email"], input#email', { timeout: 10000 });
    
    // Fill in credentials
    await this.page.fill('input[type="email"], input#email', email);
    await this.page.fill('input[type="password"], input#password', password);
    
    // Submit form and wait for navigation
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/auth/token') && resp.status() === 200,
        { timeout: 15000 }
      ).catch(() => {}),
      this.page.click('button[type="submit"]'),
    ]);
    
    // Wait for redirect to dashboard
    await this.page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
  }

  /**
   * Navigate to a specific route
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  /**
   * Click on a navigation menu item by text
   */
  async clickNavItem(text: string): Promise<void> {
    const linkMatcher = new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const navItem = this.page.getByRole('link', { name: linkMatcher }).first();

    if (!(await navItem.isVisible().catch(() => false))) {
      const groupByItem: Record<string, string> = {
        Attendance: 'Operations',
        Classes: 'Operations',
        Invoices: 'Finance',
        Media: 'Academy',
        Overview: 'Home',
        Receipts: 'Finance',
        Reports: 'Academy',
        Settings: 'Settings',
        Staff: 'People',
        Students: 'Operations',
        Users: 'People',
      };

      const groupLabel = groupByItem[text];
      if (groupLabel) {
        const groupButton = this.page.getByRole('button', { name: new RegExp(groupLabel, 'i') }).first();
        if (await groupButton.isVisible().catch(() => false)) {
          await groupButton.click();
          await this.page.waitForTimeout(200);
        }
      }
    }

    await navItem.waitFor({ state: 'visible', timeout: 5000 });
    await navItem.click();
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  /**
   * Click a button by text
   * Supports case-insensitive and partial text matching
   */
  async clickButton(text: string): Promise<void> {
    // Strategy 1: Try exact match (case-insensitive)
    let button = this.page.getByRole('button', { name: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).first();
    
    try {
      await button.waitFor({ state: 'visible', timeout: 3000 });
      // Check if button is disabled
      const isDisabled = await button.isDisabled().catch(() => false);
      if (!isDisabled) {
        await button.click();
        await this.page.waitForTimeout(500);
        return;
      }
    } catch {
      // Try next strategy
    }
    
    // Strategy 2: Try partial text match (case-insensitive)
    button = this.page.getByRole('button', { name: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    
    try {
      await button.waitFor({ state: 'visible', timeout: 3000 });
      const isDisabled = await button.isDisabled().catch(() => false);
      if (!isDisabled) {
        await button.click();
        await this.page.waitForTimeout(500);
        return;
      }
    } catch {
      // Try next strategy
    }
    
    // Strategy 3: Try by text content (case-insensitive)
    button = this.page.locator('button').filter({ hasText: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    
    try {
      await button.waitFor({ state: 'visible', timeout: 3000 });
      const isDisabled = await button.isDisabled().catch(() => false);
      if (!isDisabled) {
        await button.click();
        await this.page.waitForTimeout(500);
        return;
      }
    } catch {
      throw new Error(`Could not find clickable button with text: ${text}`);
    }
  }

  /**
   * Fill a form field by label
   * Supports multiple strategies: by htmlFor attribute, by input ID, by input name, by placeholder, or near label
   */
  async fillField(label: string, value: string): Promise<void> {
    // Strategy 1: Find label by text (case-insensitive) and get htmlFor attribute
    const labelText = label.replace(/\*/g, '').trim(); // Remove asterisks from required fields
    const labelElement = this.page.locator('label').filter({ 
      hasText: new RegExp(labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') 
    }).first();
    
    try {
      await labelElement.waitFor({ state: 'visible', timeout: 5000 });
      const fieldId = await labelElement.getAttribute('for');
      
      if (fieldId) {
        await this.page.fill(`#${fieldId}`, value);
        return;
      }
    } catch {
      // Label not found, try other strategies
    }
    
    // Strategy 2: Try common input IDs based on label (normalize: "First Name" -> "first_name")
    const normalizedLabel = labelText.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const inputById = this.page.locator(`#${normalizedLabel}`);
    if (await inputById.isVisible().catch(() => false)) {
      await inputById.fill(value);
      return;
    }
    
    // Strategy 3: Try input by name attribute
    const inputByName = this.page.locator(`input[name="${normalizedLabel}"], input[name*="${normalizedLabel}"]`).first();
    if (await inputByName.isVisible().catch(() => false)) {
      await inputByName.fill(value);
      return;
    }
    
    // Strategy 4: Find input near label (fallback)
    try {
      const input = this.page.locator(`input, textarea, select`).near(labelElement).first();
      await input.waitFor({ state: 'visible', timeout: 3000 });
      await input.fill(value);
      return;
    } catch {
      // If all strategies fail, try to find by placeholder
      const inputByPlaceholder = this.page.locator(`input[placeholder*="${labelText}" i], textarea[placeholder*="${labelText}" i]`).first();
      if (await inputByPlaceholder.isVisible().catch(() => false)) {
        await inputByPlaceholder.fill(value);
        return;
      }
    }
    
    throw new Error(`Could not find form field for label: ${label}`);
  }

  /**
   * Fill a form field by placeholder or name
   */
  async fillFieldByPlaceholder(placeholder: string, value: string): Promise<void> {
    await this.page.fill(`input[placeholder*="${placeholder}"], textarea[placeholder*="${placeholder}"]`, value);
  }

  /**
   * Select an option from a select/dropdown
   */
  async selectOption(label: string, optionText: string): Promise<void> {
    const select = this.page.locator(`select, [role="combobox"]`).filter({ hasText: label }).first();
    await select.click();
    await this.page.getByText(optionText).first().click();
  }

  /**
   * Wait for a table to load with data
   */
  async waitForTable(): Promise<void> {
    await this.page.waitForSelector('table, [role="table"]', { timeout: 10000 });
    // Wait for table rows (at least header)
    await this.page.waitForSelector('tr, [role="row"]', { timeout: 10000 });
  }

  /**
   * Get table row count (excluding header)
   */
  async getTableRowCount(): Promise<number> {
    const rows = await this.page.locator('tbody tr, [role="row"]:not(:first-child)').count();
    return rows;
  }

  /**
   * Click on a table row by index
   * Handles different table structures and clicks on first cell if row is not directly clickable
   */
  async clickTableRow(index: number): Promise<void> {
    // Wait for table to have data rows
    await this.waitForTable();
    
    // Try to find the row
    const row = this.page.locator('tbody tr, table tr:not(:first-child), [role="row"]').nth(index);
    
    try {
      await row.waitFor({ state: 'visible', timeout: 5000 });
      
      // Try clicking the row directly first
      try {
        await row.click({ timeout: 2000 });
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        return;
      } catch {
        // Row not directly clickable, try clicking first cell
      }
      
      // Try clicking on first cell in the row
      const firstCell = row.locator('td, th').first();
      if (await firstCell.isVisible().catch(() => false)) {
        await firstCell.click();
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        return;
      }
      
      // Try clicking on any clickable element in the row
      const clickableElement = row.locator('a, button, [role="button"]').first();
      if (await clickableElement.isVisible().catch(() => false)) {
        await clickableElement.click();
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        return;
      }
      
      // Last resort: click the row anyway
      await row.click({ force: true });
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    } catch (error) {
      throw new Error(`Could not click table row at index ${index}: ${error}`);
    }
  }

  /**
   * Search in a search input
   * Tries multiple selectors to find the search input
   */
  async search(query: string): Promise<void> {
    // Strategy 1: Try input with type="search"
    let searchInput = this.page.locator('input[type="search"]').first();
    
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 3000 });
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000); // Wait for debounce
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      return;
    } catch {
      // Try next strategy
    }
    
    // Strategy 2: Try input with placeholder containing "search" (case-insensitive)
    searchInput = this.page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 3000 });
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      return;
    } catch {
      // Try next strategy
    }
    
    // Strategy 3: Try input with name or id containing "search"
    searchInput = this.page.locator('input[name*="search" i], input[id*="search" i]').first();
    
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 3000 });
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      return;
    } catch {
      // Try next strategy
    }
    
    // Strategy 4: Look for search icon and find nearby input
    const searchIcon = this.page.locator('[data-testid*="search" i], svg[class*="search" i], [aria-label*="search" i]').first();
    
    try {
      if (await searchIcon.isVisible().catch(() => false)) {
        searchInput = this.page.locator('input').near(searchIcon).first();
        await searchInput.waitFor({ state: 'visible', timeout: 3000 });
        await searchInput.fill(query);
        await this.page.waitForTimeout(1000);
        await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        return;
      }
    } catch {
      // Fall through
    }
    
    throw new Error('Could not find search input');
  }

  /**
   * Wait for loading state to disappear
   */
  async waitForLoadingToComplete(): Promise<void> {
    // Wait for common loading indicators to disappear
    await this.page.waitForSelector('[role="progressbar"], .animate-spin', { state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  /**
   * Check if element with text is visible
   */
  async isTextVisible(text: string): Promise<boolean> {
    try {
      const element = this.page.getByText(text).first();
      await element.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for success message
   */
  async waitForSuccessMessage(message?: string): Promise<void> {
    if (message) {
      await this.page.waitForSelector(`text=${message}`, { timeout: 10000 });
    } else {
      // Wait for any success indicator
      await this.page.waitForSelector('[role="alert"]:has-text("success"), .text-green-600, .text-green-500', { timeout: 10000 }).catch(() => {});
    }
  }

  /**
   * Wait for error message
   */
  async waitForErrorMessage(message?: string): Promise<void> {
    if (message) {
      await this.page.waitForSelector(`text=${message}`, { timeout: 10000 });
    } else {
      // Wait for any error indicator
      await this.page.waitForSelector('[role="alert"]:has-text("error"), .text-red-600, .text-red-500', { timeout: 10000 }).catch(() => {});
    }
  }

  /**
   * Click on a modal/dialog button
   * Tries multiple button text variations and waits for modal to be visible
   */
  async clickModalButton(text: string): Promise<void> {
    // Wait for modal to be visible first
    const modal = this.page.locator('[role="dialog"], [role="alertdialog"]').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Strategy 1: Try exact match (case-insensitive)
    let button = modal.getByRole('button', { name: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).first();
    
    try {
      await button.waitFor({ state: 'visible', timeout: 3000 });
      const isDisabled = await button.isDisabled().catch(() => false);
      if (!isDisabled) {
        await button.click();
        await this.page.waitForTimeout(500);
        return;
      }
    } catch {
      // Try next strategy
    }
    
    // Strategy 2: Try partial match (case-insensitive)
    button = modal.getByRole('button', { name: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    
    try {
      await button.waitFor({ state: 'visible', timeout: 3000 });
      const isDisabled = await button.isDisabled().catch(() => false);
      if (!isDisabled) {
        await button.click();
        await this.page.waitForTimeout(500);
        return;
      }
    } catch {
      // Try next strategy
    }
    
    // Strategy 3: Try common button text variations
    const variations = [
      text,
      `${text} Invite`,
      `Send ${text}`,
      `Submit ${text}`,
    ];
    
    for (const variation of variations) {
      button = modal.locator('button').filter({ hasText: new RegExp(variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
      try {
        if (await button.isVisible().catch(() => false)) {
          const isDisabled = await button.isDisabled().catch(() => false);
          if (!isDisabled) {
            await button.click();
            await this.page.waitForTimeout(500);
            return;
          }
        }
      } catch {
        continue;
      }
    }
    
    throw new Error(`Could not find clickable modal button with text: ${text}`);
  }

  /**
   * Close a modal/dialog
   */
  async closeModal(): Promise<void> {
    // Try clicking close button or backdrop
    const closeButton = this.page.locator('[role="dialog"] button:has-text("Close"), [aria-label="Close"]').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      // Press Escape key
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Upload a file
   */
  async uploadFile(inputSelector: string, filePath: string): Promise<void> {
    const fileInput = this.page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Verify page title/heading
   * Supports both string (case-insensitive) and regex patterns
   */
  async verifyPageTitle(title: string | RegExp): Promise<void> {
    if (typeof title === 'string') {
      // Case-insensitive string matching
      const heading = this.page.locator(`h1, h2, h3`).filter({ 
        hasText: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') 
      }).first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    } else {
      // Regex pattern
      const heading = this.page.locator(`h1, h2, h3`).filter({ 
        hasText: title 
      }).first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Verify URL contains path
   */
  async verifyURL(path: string): Promise<void> {
    expect(this.page.url()).toContain(path);
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name.replace(/\s+/g, '-')}.png`, fullPage: true });
  }
}

/**
 * Create a UI helper instance
 */
export function createUIHelper(page: Page): UIHelper {
  return new UIHelper(page);
}

/**
 * Helper function to wait for API response
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  status: number = 200,
  timeout: number = 15000
): Promise<void> {
  await page.waitForResponse(
    (resp) => {
      const url = resp.url();
      const matches = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      return matches && resp.status() === status;
    },
    { timeout }
  );
}

/**
 * Helper to fill a form with multiple fields
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    const uiHelper = createUIHelper(page);
    await uiHelper.fillField(label, value);
  }
}
