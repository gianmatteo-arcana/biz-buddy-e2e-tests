import { test, expect } from '@playwright/test';

// This test does NOT use saved auth state - it tests fresh signup
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Fresh User Signup Flow', () => {
  test('new user can sign up through Google OAuth', async ({ page }) => {
    console.log('\n🆕 Testing fresh user signup flow\n');
    
    // Start fresh - no auth state
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Should see sign in page
    console.log('📍 Looking for sign in button...');
    const signInButton = page.locator('text=Sign in with Google').first();
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Sign in button found - clicking...');
    await signInButton.click();
    
    // Now we're on Google's OAuth page
    console.log('🔐 Navigated to Google OAuth...');
    
    // Wait for Google login page
    await page.waitForURL(/accounts\.google\.com/, { timeout: 30000 });
    
    // Take screenshot of Google login page
    await page.screenshot({ path: 'test-results/google-login-page.png' });
    
    // Fill in email
    console.log('📧 Entering email...');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // NOTE: You'll need to provide test credentials
    const testEmail = process.env.TEST_GOOGLE_EMAIL || 'your-test-email@gmail.com';
    const testPassword = process.env.TEST_GOOGLE_PASSWORD || 'your-test-password';
    
    await emailInput.fill(testEmail);
    await page.keyboard.press('Enter');
    
    // Wait for password page
    console.log('🔑 Waiting for password page...');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Fill in password
    console.log('🔑 Entering password...');
    await passwordInput.fill(testPassword);
    await page.keyboard.press('Enter');
    
    // Handle potential 2FA or additional security
    // This might vary based on account settings
    try {
      // Check if we're asked for 2FA
      const twoFactorPrompt = page.locator('text=/verify|verification|code/i');
      if (await twoFactorPrompt.isVisible({ timeout: 5000 })) {
        console.log('⚠️  2FA detected - manual intervention may be needed');
        // In a real test environment, you'd handle 2FA programmatically
      }
    } catch (e) {
      // No 2FA, continue
    }
    
    // Wait for redirect back to BizBuddy
    console.log('🔄 Waiting for redirect to BizBuddy...');
    await page.waitForURL(/lovableproject\.com/, { timeout: 30000 });
    
    // Wait for dashboard to load
    console.log('📊 Waiting for dashboard...');
    await page.waitForTimeout(5000); // Give time for auth to process
    
    // Check for successful signup/login
    const dashboardIndicators = [
      'text=Welcome back',
      'text=Chat with Ally',
      'text=Business Snapshot',
      'text=Priority Tasks'
    ];
    
    let foundDashboard = false;
    for (const indicator of dashboardIndicators) {
      if (await page.locator(indicator).isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`✅ Found dashboard element: ${indicator}`);
        foundDashboard = true;
        break;
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/fresh-signup-complete.png' });
    
    // Verify we made it to the dashboard
    expect(foundDashboard).toBe(true);
    console.log('\n🎉 Fresh signup flow completed successfully!');
  });
  
  test('sign in button redirects to Google OAuth', async ({ page }) => {
    // Simpler test just to verify the OAuth redirect works
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    const signInButton = page.locator('text=Sign in with Google').first();
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    
    // Click and verify redirect
    await signInButton.click();
    
    // Should redirect to Google
    await expect(page).toHaveURL(/accounts\.google\.com/, { timeout: 30000 });
    console.log('✅ Successfully redirected to Google OAuth');
  });
});