import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Sports Academy E2E tests.
 * 
 * Environment variables:
 * - FRONTEND_URL: Frontend base URL (default: http://localhost:5173)
 * - API_BASE_URL: Backend API base URL (default: http://localhost:8000/api/v1)
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'on-first-retry',
    
    /* Custom test context options */
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    /* Setup project for global test data */
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    
    /* Chromium - Primary browser */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

    // Note: Firefox and WebKit disabled - run `npx playwright install` to enable
    // /* Firefox */
    // {
    //   name: 'firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //   },
    //   dependencies: ['setup'],
    // },

    // /* Webkit */
    // {
    //   name: 'webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //   },
    //   dependencies: ['setup'],
    // },
  ],

  /* Global timeout settings */
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  /* Run local dev server before starting the tests */
  // Uncomment if you want Playwright to start the servers
  // webServer: [
  //   {
  //     command: 'docker-compose up',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120000,
  //   },
  // ],
});

/**
 * Custom test configuration constants
 */
export const TEST_CONFIG = {
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000/api/v1',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  /* Default test credentials - these should be seeded in global setup */
  SUPERADMIN: {
    email: 'superadmin@test.com',
    password: 'SuperAdmin123!',
  },
  ADMIN: {
    email: 'admin@testacademy.com',
    password: 'Admin123!',
  },
  COACH: {
    email: 'coach@testacademy.com',
    password: 'Coach123!',
  },
  PARENT: {
    email: 'parent@testacademy.com',
    password: 'Parent123!',
  },
  
  /* Admin panel E2E - set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in env (e.g. .env.e2e) */
  ADMIN_PANEL: {
    email: process.env.E2E_ADMIN_EMAIL || '',
    password: process.env.E2E_ADMIN_PASSWORD || '',
  },

  /* Default test academy */
  TEST_ACADEMY: {
    name: 'Test Academy',
    email: 'contact@testacademy.com',
  },
  
  /* Timeouts */
  TIMEOUTS: {
    API: 10000,
    PAGE_LOAD: 15000,
    ANIMATION: 500,
  },
};
