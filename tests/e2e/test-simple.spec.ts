import { test, expect } from '@playwright/test';

test.describe('BizBuddy Authenticated Tests', () => {
  test('should be logged in and see dashboard', async ({ page }) => {
    // Navigate directly to the app
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'domcontentloaded'
    });
    
    // Wait for authentication to complete - the auth logs show "AUTH STATE CHANGED: SIGNED_IN"
    await page.waitForTimeout(2000);
    
    // Wait for the dashboard to render - look for either welcome message or chat button
    const authenticated = await page.locator('text=Welcome back').or(page.locator('text=Chat with Ally')).waitFor({ 
      state: 'visible',
      timeout: 15000 
    }).then(() => true).catch(() => false);
    
    // Take screenshot after waiting
    await page.screenshot({ path: 'test-results/logged-in-state.png' });
    
    if (!authenticated) {
      // If not authenticated, check what we see
      const signInVisible = await page.locator('text=Sign in with Google').isVisible().catch(() => false);
      console.log('Not authenticated - Sign in button visible:', signInVisible);
    } else {
      // Log what authenticated elements we see
      const welcomeBackVisible = await page.locator('text=Welcome back').isVisible().catch(() => false);
      const chatWithAllyVisible = await page.locator('text=Chat with Ally').isVisible().catch(() => false);
      const userNameVisible = await page.locator('text=Gianmatteo').isVisible().catch(() => false);
      
      console.log('Authenticated elements:', {
        welcomeBackVisible,
        chatWithAllyVisible,
        userNameVisible
      });
    }
    
    expect(authenticated).toBe(true);
  });
  
  test('should see user profile info', async ({ page }) => {
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForLoadState('networkidle');
    
    // Look for user info
    const userEmail = 'gianmatteo.allyn.test@gmail.com';
    const emailVisible = await page.locator(`text=${userEmail}`).isVisible({ timeout: 5000 }).catch(() => false);
    
    console.log(`Email ${userEmail} visible:`, emailVisible);
    
    // Check for any user menu or avatar
    const userNameInHeaderVisible = await page.locator('text=Gianmatteo Allyn').isVisible({ timeout: 5000 }).catch(() => false);
    const openAIStatusVisible = await page.locator('text=OpenAI').isVisible({ timeout: 5000 }).catch(() => false);
    
    console.log('User indicators:', {
      emailVisible,
      userNameInHeaderVisible,
      openAIStatusVisible
    });
    
    // At least one should be visible
    expect(emailVisible || userNameInHeaderVisible || openAIStatusVisible).toBe(true);
  });
});