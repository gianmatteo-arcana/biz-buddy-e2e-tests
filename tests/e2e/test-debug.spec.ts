import { test, expect } from '@playwright/test';

test.describe('BizBuddy Debug Auth Tests', () => {
  test('debug auth state loading', async ({ page, context }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    // Log cookies before navigation
    const cookies = await context.cookies();
    console.log(`\n🍪 Loaded ${cookies.length} cookies`);
    console.log('Cookie domains:', [...new Set(cookies.map(c => c.domain))]);
    
    // Navigate to the app
    console.log('\n📍 Navigating to BizBuddy...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'domcontentloaded'
    });
    
    // Check localStorage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key);
        }
      }
      return items;
    });
    
    console.log('\n💾 LocalStorage keys:', Object.keys(localStorage));
    const hasAuthToken = Object.keys(localStorage).some(key => key.includes('auth-token'));
    console.log('Has auth token in localStorage:', hasAuthToken);
    
    // Wait for various states
    console.log('\n⏳ Waiting for page to settle...');
    
    // Take progressive screenshots
    await page.screenshot({ path: 'test-results/debug-1-immediate.png' });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/debug-2-after-2s.png' });
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/debug-3-after-5s.png' });
    
    // Check page content
    const pageContent = await page.content();
    console.log('\n📄 Page content includes:');
    console.log('- "Sign in with Google":', pageContent.includes('Sign in with Google'));
    console.log('- "Welcome back":', pageContent.includes('Welcome back'));
    console.log('- "Chat with Ally":', pageContent.includes('Chat with Ally'));
    console.log('- "Loading":', pageContent.includes('Loading'));
    
    // Check for specific elements with different methods
    console.log('\n🔍 Element visibility checks:');
    
    const elements = [
      'text=Sign in with Google',
      'text=Welcome back',
      'text=Chat with Ally',
      'text=Gianmatteo',
      'text=Loading',
      'text=Checking',
      '[data-testid="user-menu"]',
      '[role="button"]'
    ];
    
    for (const selector of elements) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} element(s) matching: ${selector}`);
      }
    }
    
    // Final state
    const finalUrl = page.url();
    console.log('\n🔗 Final URL:', finalUrl);
    
    // We expect to be authenticated
    const isAuthenticated = hasAuthToken && !pageContent.includes('Sign in with Google');
    console.log('\n✨ Authentication status:', isAuthenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');
    
    expect(isAuthenticated).toBe(true);
  });
});