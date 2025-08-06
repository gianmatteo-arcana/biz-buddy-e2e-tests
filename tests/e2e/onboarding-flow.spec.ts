import { test, expect, Page } from '@playwright/test';

/**
 * Onboarding Flow E2E Tests
 * Based on PRD: https://docs.google.com/document/d/1kNk0Nw4An2Y3tEPOFPfhKdTJGlzCIL04UGSc7tHFGfY/edit
 * 
 * Expected flow for first-time users:
 * 1. Sign in with Google
 * 2. Welcome screen with value props
 * 3. Business information collection
 * 4. Business goals/priorities
 * 5. Confirmation and dashboard access
 */

// Helper to check if user is in onboarding
async function isInOnboarding(page: Page): Promise<boolean> {
  const onboardingIndicators = [
    'text=Welcome to BizBuddy',
    'text=Let\'s get started',
    'text=Tell us about your business',
    '[data-testid="onboarding-container"]',
    'text=Set up your business'
  ];
  
  for (const selector of onboardingIndicators) {
    if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

// Start fresh - no saved auth for true first-time experience
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Onboarding Flow - First Time User', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console logging to debug issues
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });
  });

  test('should redirect new users to onboarding after OAuth', async ({ page }) => {
    console.log('🧪 Testing onboarding redirect for new users\n');
    
    // Navigate to BizBuddy
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Should see sign in page
    await expect(page.locator('text=Sign in with Google')).toBeVisible();
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/onboarding-1-signin.png' });
    
    // Click sign in (this will require manual interaction or test credentials)
    console.log('📝 Manual step: Complete Google OAuth login');
    console.log('   Using: gianmatteo.allyn.test@gmail.com\n');
    
    // For now, we'll document what SHOULD happen
    test.skip(); // Remove this when we have automated OAuth
  });

  test.skip('complete onboarding flow - manual test', async ({ page }) => {
    // This is a manual test to document expected behavior
    test.setTimeout(5 * 60 * 1000); // 5 minutes
    
    console.log('\n🎯 Manual Onboarding Flow Test\n');
    console.log('Steps to test:');
    console.log('1. Sign in with test account');
    console.log('2. Should see onboarding welcome screen');
    console.log('3. Complete business information');
    console.log('4. Set business goals');
    console.log('5. Reach dashboard\n');
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for manual completion
    let onboardingComplete = false;
    const startTime = Date.now();
    
    while (!onboardingComplete && (Date.now() - startTime) < 300000) {
      // Check if still in onboarding
      const inOnboarding = await isInOnboarding(page);
      const onDashboard = await page.locator('text=Dashboard').isVisible().catch(() => false);
      
      if (onDashboard && !inOnboarding) {
        onboardingComplete = true;
        console.log('\n✅ Onboarding completed - reached dashboard!');
      } else if (inOnboarding) {
        console.log('📍 Still in onboarding...');
        // Take screenshot of current step
        const timestamp = Date.now();
        await page.screenshot({ 
          path: `test-results/onboarding-step-${timestamp}.png`,
          fullPage: true 
        });
      }
      
      await page.waitForTimeout(3000);
    }
    
    expect(onboardingComplete).toBe(true);
  });
});

test.describe('Onboarding Flow - Expected Steps', () => {
  // These tests document what we expect to build
  
  test.skip('Step 1: Welcome screen shows value propositions', async ({ page }) => {
    // After OAuth, user should see welcome screen
    // Expected elements:
    // - Welcome message with user's name
    // - 3 value props (compliance, time-saving, peace of mind)
    // - "Get Started" CTA button
    
    await expect(page.locator('text=Welcome to BizBuddy')).toBeVisible();
    await expect(page.locator('text=Stay compliant')).toBeVisible();
    await expect(page.locator('text=Save time')).toBeVisible();
    await expect(page.locator('text=Peace of mind')).toBeVisible();
    await expect(page.locator('button:has-text("Get Started")')).toBeVisible();
  });
  
  test.skip('Step 2: Business information form', async ({ page }) => {
    // Expected fields:
    // - Business name (required)
    // - Business type (dropdown)
    // - Industry (dropdown)
    // - State (dropdown)
    // - Number of employees (optional)
    
    await expect(page.locator('input[placeholder="Your Business Name"]')).toBeVisible();
    await expect(page.locator('select[name="businessType"]')).toBeVisible();
    await expect(page.locator('select[name="industry"]')).toBeVisible();
    await expect(page.locator('select[name="state"]')).toBeVisible();
  });
  
  test.skip('Step 3: Business goals and priorities', async ({ page }) => {
    // Expected elements:
    // - Multiple choice for main goals
    // - Checkbox list for compliance areas of concern
    // - Optional text area for other concerns
    
    await expect(page.locator('text=What are your main business goals?')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(5); // At least 5 options
  });
  
  test.skip('Step 4: Confirmation and dashboard redirect', async ({ page }) => {
    // Expected flow:
    // - Show confirmation message
    // - Auto-redirect to dashboard after 2 seconds
    // - Dashboard shows personalized welcome
    
    await expect(page.locator('text=All set!')).toBeVisible();
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });
});

test.describe('Onboarding Flow - Edge Cases', () => {
  test.skip('returning user should skip onboarding', async ({ page }) => {
    // Users who have completed onboarding should go straight to dashboard
    // This requires a user that has already completed onboarding
  });
  
  test.skip('partial onboarding completion should resume', async ({ page }) => {
    // If user abandons onboarding midway, they should resume where they left off
    // This tests onboarding state persistence
  });
  
  test.skip('onboarding can be skipped with minimum info', async ({ page }) => {
    // User should be able to skip optional fields
    // Only business name should be truly required
  });
});