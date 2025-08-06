import { test, expect } from '@playwright/test';

test.describe('BizBuddy Authentication', () => {
  test('authentication state persists correctly', async ({ page, context }) => {
    // Check we have cookies
    const cookies = await context.cookies();
    console.log(`Loaded ${cookies.length} cookies`);
    
    // Navigate to BizBuddy
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'domcontentloaded'
    });
    
    // Wait for auth to process (auth logs show this happens quickly)
    await page.waitForTimeout(3000);
    
    // Check localStorage for auth token
    const hasAuthToken = await page.evaluate(() => {
      const keys = Object.keys(window.localStorage);
      return keys.some(key => key.includes('auth-token'));
    });
    
    console.log('Has auth token in localStorage:', hasAuthToken);
    
    // Check page content
    const pageContent = await page.content();
    const hasSignInButton = pageContent.includes('Sign in with Google');
    const hasWelcomeBack = pageContent.includes('Welcome back');
    const hasChatButton = pageContent.includes('Chat with Ally');
    
    console.log('Page indicators:', {
      hasSignInButton,
      hasWelcomeBack,
      hasChatButton
    });
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/auth-working.png' });
    
    // We should be authenticated
    expect(hasAuthToken).toBe(true);
    expect(hasSignInButton).toBe(false);
    expect(hasWelcomeBack || hasChatButton).toBe(true);
  });
});