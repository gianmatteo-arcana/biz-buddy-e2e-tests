import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const environments = {
  staging: 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com',
  production: process.env.PRODUCTION_URL || 'https://your-production-url.com',
  local: 'http://localhost:5173'
};

const currentEnv = process.env.ENVIRONMENT || 'staging';
const baseURL = environments[currentEnv as keyof typeof environments];

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  
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
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ...(process.env.CI ? [['github']] : [])
  ] as any,
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Maximum time each action can take */
    actionTimeout: 30000,
    
    /* Viewport size */
    viewport: { width: 1280, height: 720 },
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Test setup */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    /* Main tests - depend on setup */
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user-state.json',
      },
      testIgnore: /auth\.setup\.ts/,
    },

    {
      name: 'firefox',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/user-state.json',
      },
      testIgnore: /auth\.setup\.ts/,
    },

    /* Mobile testing */
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: {
        ...devices['iPhone 13'],
        storageState: '.auth/user-state.json',
      },
      testIgnore: /auth\.setup\.ts/,
    },

    /* Visual regression testing */
    {
      name: 'visual',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user-state.json',
      },
      testMatch: /visual\.spec\.ts/,
    },
  ],

  /* Timeouts */
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
});