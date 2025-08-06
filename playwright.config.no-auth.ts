import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  
  use: {
    baseURL: 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    
    // NO auth state - start fresh
    storageState: undefined,
  },
  
  timeout: 60000, // 1 minute timeout for OAuth flow
  
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Launch browser in non-headless mode for OAuth
        headless: false,
        // Slower actions for OAuth forms
        actionTimeout: 30000,
      },
    },
  ],
});