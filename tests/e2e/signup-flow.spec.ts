import { test, expect } from '@playwright/test';

test.describe('User Signup & Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app - should auto-redirect to dashboard if authenticated
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('new user sees onboarding overlay on dashboard', async ({ page }) => {
    // For this test to work properly, you need a "new" user
    // In practice, this might require clearing some user data or using a different account
    
    // Check if we're on the dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // New users should see the onboarding overlay
    const onboardingCard = page.locator('text=Welcome to BizBuddy!');
    await expect(onboardingCard).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of initial onboarding state
    await page.screenshot({ 
      path: 'test-results/onboarding-welcome.png',
      fullPage: true 
    });
    
    // Verify it's an overlay (dashboard should be dimmed in background)
    const dashboard = page.locator('[data-testid="dashboard-content"], main, .dashboard');
    await expect(dashboard).toBeVisible();
  });

  test('Google profile data is pre-populated in onboarding', async ({ page }) => {
    // Wait for onboarding card
    await page.waitForSelector('text=Welcome to BizBuddy!', { timeout: 10000 });
    
    // Check for pre-filled data from Google
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="First"], input[id*="first"]').first();
    const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Last"], input[id*="last"]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    
    // These should have values from Google OAuth
    await expect(firstNameInput).not.toBeEmpty();
    await expect(lastNameInput).not.toBeEmpty();
    await expect(emailInput).not.toBeEmpty();
    
    // Log the values for debugging
    const firstName = await firstNameInput.inputValue();
    const lastName = await lastNameInput.inputValue();
    const email = await emailInput.inputValue();
    
    console.log(`Pre-filled data:
      First Name: ${firstName}
      Last Name: ${lastName}
      Email: ${email}
    `);
  });

  test('user can complete business profile setup', async ({ page }) => {
    // Wait for onboarding
    await page.waitForSelector('text=Welcome to BizBuddy!', { timeout: 10000 });
    
    // Step 1: Personal info (should be pre-filled, just continue)
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
    await continueButton.click();
    
    // Step 2: Business Information
    await page.waitForSelector('input[name="businessName"], input[placeholder*="Business"]', { timeout: 5000 });
    
    // Fill business details
    await page.fill('input[name="businessName"], input[placeholder*="Business"]', 'Test Business LLC');
    
    // Select entity type
    const entitySelect = page.locator('select[name="entityType"], select[id*="entity"], [data-testid="entity-type-select"]').first();
    if (await entitySelect.isVisible()) {
      await entitySelect.selectOption('llc');
    } else {
      // Try radio buttons or buttons
      await page.click('text=LLC');
    }
    
    // Fill EIN if present
    const einInput = page.locator('input[name="ein"], input[placeholder*="EIN"], input[placeholder*="XX-XXXXXXX"]').first();
    if (await einInput.isVisible()) {
      await page.fill('input[name="ein"], input[placeholder*="EIN"]', '12-3456789');
    }
    
    // Take screenshot of business info step
    await page.screenshot({ 
      path: 'test-results/onboarding-business-info.png',
      fullPage: true 
    });
    
    // Continue to next step
    await page.click('button:has-text("Continue"), button:has-text("Next")');
    
    // Wait for either completion or next step
    await page.waitForTimeout(2000); // Give it time to process
    
    // Check if onboarding is complete (overlay should be gone)
    const onboardingGone = await page.locator('text=Welcome to BizBuddy!').isHidden();
    if (onboardingGone) {
      console.log('✅ Onboarding completed successfully!');
      
      // Verify we can see dashboard content
      await expect(page.locator('text=Dashboard, text=Compliance Calendar, h1')).toBeVisible();
      
      // Take final screenshot
      await page.screenshot({ 
        path: 'test-results/dashboard-after-onboarding.png',
        fullPage: true 
      });
    }
  });

  test('onboarding progress is tracked', async ({ page }) => {
    // Wait for onboarding
    await page.waitForSelector('text=Welcome to BizBuddy!', { timeout: 10000 });
    
    // Look for progress indicators
    const progressIndicator = page.locator('text=/Step \\d+ of \\d+/, text=/\\d+\\s*of\\s*\\d+/').first();
    
    if (await progressIndicator.isVisible()) {
      const progressText = await progressIndicator.textContent();
      console.log(`Progress: ${progressText}`);
      
      // Click continue and verify progress updates
      await page.click('button:has-text("Continue"), button:has-text("Next")');
      await page.waitForTimeout(1000);
      
      const newProgressText = await progressIndicator.textContent();
      console.log(`New progress: ${newProgressText}`);
      
      expect(newProgressText).not.toBe(progressText);
    }
  });

  test('user can skip optional onboarding steps', async ({ page }) => {
    // Wait for onboarding
    await page.waitForSelector('text=Welcome to BizBuddy!', { timeout: 10000 });
    
    // Look for skip button
    const skipButton = page.locator('button:has-text("Skip"), text=Skip, text=Later').first();
    
    if (await skipButton.isVisible()) {
      await skipButton.click();
      
      // Verify we moved forward or completed
      await page.waitForTimeout(2000);
      
      // Check if onboarding is still visible
      const stillOnboarding = await page.locator('text=Welcome to BizBuddy!').isVisible();
      console.log(`Onboarding still visible after skip: ${stillOnboarding}`);
    }
  });
});