import { test, expect, Page } from '@playwright/test';

// Helper function to handle Google OAuth login
async function loginWithGoogle(page: Page, email: string, password: string) {
  console.log(`🔐 Attempting Google login with: ${email}`);
  
  // Wait for and fill email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 20000 });
  await emailInput.fill(email);
  
  // Click next button or press Enter
  const nextButton = page.locator('#identifierNext, button:has-text("Next")').first();
  if (await nextButton.isVisible()) {
    await nextButton.click();
  } else {
    await page.keyboard.press('Enter');
  }
  
  // Wait for password input
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 20000 });
  await passwordInput.fill(password);
  
  // Click sign in button or press Enter
  const signInButton = page.locator('#passwordNext, button:has-text("Next")').first();
  if (await signInButton.isVisible()) {
    await signInButton.click();
  } else {
    await page.keyboard.press('Enter');
  }
}

// This test does NOT use saved auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Google OAuth Flow Tests', () => {
  test('complete OAuth flow with real credentials', async ({ page, context }) => {
    // Enable verbose logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });
    
    // Navigate to BizBuddy
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Click Sign in with Google
    const signInButton = page.locator('text=Sign in with Google').first();
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    
    console.log('🚀 Starting OAuth flow...');
    
    // Store the current page count
    const pagesBefore = context.pages().length;
    
    // Click the button - this might open a popup
    await signInButton.click();
    
    // Handle popup window
    let authPage = page;
    
    // Check if a new window/tab was opened
    if (context.pages().length > pagesBefore) {
      console.log('📄 OAuth opened in new window');
      authPage = context.pages()[context.pages().length - 1];
      await authPage.waitForLoadState();
    } else {
      console.log('📄 OAuth in same window');
      await page.waitForURL(/accounts\.google\.com/, { timeout: 30000 });
    }
    
    // Now we're on Google's page
    console.log('📍 On Google OAuth page');
    
    // Get credentials from environment
    const email = process.env.TEST_GOOGLE_EMAIL || 'gianmatteo.allyn.test@gmail.com';
    const password = process.env.TEST_GOOGLE_PASSWORD || '';
    
    if (!password) {
      console.error('❌ TEST_GOOGLE_PASSWORD must be set in .env file');
      console.log('\nSetup instructions:');
      console.log('1. Copy .env.example to .env');
      console.log('2. Add the test account password');
      console.log('3. Run the test again\n');
      test.skip();
      return;
    }
    
    // Perform login
    await loginWithGoogle(authPage, email, password);
    
    // Handle consent screen if it appears
    try {
      const consentButton = authPage.locator('button:has-text("Continue"), button:has-text("Allow")');
      if (await consentButton.isVisible({ timeout: 5000 })) {
        console.log('✅ Handling consent screen...');
        await consentButton.click();
      }
    } catch (e) {
      // No consent screen, continue
    }
    
    // Wait for redirect back to BizBuddy
    console.log('⏳ Waiting for redirect to BizBuddy...');
    
    // If using popup, wait for it to close
    if (authPage !== page) {
      await authPage.waitForEvent('close', { timeout: 30000 });
      console.log('✅ OAuth popup closed');
    }
    
    // Now check the main page
    await page.waitForURL(/lovableproject\.com/, { timeout: 30000 });
    
    // Wait for auth to process
    await page.waitForTimeout(5000);
    
    // Verify we're logged in
    const authenticatedElements = [
      page.locator('text=Welcome back'),
      page.locator('text=Chat with Ally'),
      page.locator('text=Business Snapshot')
    ];
    
    let isAuthenticated = false;
    for (const element of authenticatedElements) {
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        isAuthenticated = true;
        console.log(`✅ Found authenticated element: ${await element.textContent()}`);
        break;
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/oauth-flow-complete.png' });
    
    expect(isAuthenticated).toBe(true);
    console.log('🎉 OAuth flow completed successfully!');
  });
  
  test('OAuth flow handles invalid credentials gracefully', async ({ page }) => {
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    const signInButton = page.locator('text=Sign in with Google').first();
    await signInButton.click();
    
    // Wait for Google page
    await page.waitForURL(/accounts\.google\.com/, { timeout: 30000 });
    
    // Try invalid email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email-12345@gmail.com');
    await page.keyboard.press('Enter');
    
    // Should see error
    const errorMessage = page.locator('text=/couldn\'t find|doesn\'t exist|error/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Invalid credentials handled correctly');
  });
});