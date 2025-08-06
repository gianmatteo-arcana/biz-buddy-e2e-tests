import { test, expect } from '@playwright/test';

test.describe('BizBuddy Full Authentication Flow', () => {
  test('complete authenticated user journey', async ({ page, context }) => {
    console.log('\n🚀 Starting Full E2E Test\n');
    
    // 1. Verify auth state is loaded
    const cookies = await context.cookies();
    console.log(`✅ Loaded ${cookies.length} cookies`);
    expect(cookies.length).toBeGreaterThan(20); // We should have ~30 cookies
    
    // 2. Navigate to BizBuddy
    console.log('📍 Navigating to BizBuddy...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'domcontentloaded'
    });
    
    // 3. Wait for auth to process
    console.log('⏳ Waiting for authentication to process...');
    await page.waitForTimeout(5000); // Give dashboard time to load
    
    // 4. Verify localStorage has auth token
    const authData = await page.evaluate(() => {
      const authKey = Object.keys(localStorage).find(key => key.includes('auth-token'));
      if (authKey) {
        const data = JSON.parse(localStorage.getItem(authKey) || '{}');
        return {
          hasToken: true,
          userEmail: data.user?.email,
          userName: data.user?.user_metadata?.name
        };
      }
      return { hasToken: false };
    });
    
    console.log('🔐 Auth data:', authData);
    expect(authData.hasToken).toBe(true);
    expect(authData.userEmail).toBe('gianmatteo.allyn.test@gmail.com');
    
    // 5. Take screenshot of initial state
    await page.screenshot({ path: 'test-results/full-flow-1-initial.png' });
    
    // 6. Wait for dashboard elements with specific timeout and retry
    console.log('🔍 Looking for dashboard elements...');
    
    // Try multiple selectors for authentication verification
    const authSelectors = [
      'text=Welcome back',
      'text=Chat with Ally',
      'text=Gianmatteo',
      'text=Business Snapshot',
      'text=Priority Tasks',
      'button:has-text("Chat with Ally")'
    ];
    
    let foundElement = null;
    for (const selector of authSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          foundElement = selector;
          console.log(`✅ Found: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Not found: ${selector}`);
      }
    }
    
    // 7. Verify we're on the dashboard (not sign-in page)
    const signInButton = await page.locator('text=Sign in with Google').isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`🚫 Sign in button visible: ${signInButton}`);
    expect(signInButton).toBe(false);
    
    // 8. Take final screenshot
    await page.screenshot({ path: 'test-results/full-flow-2-authenticated.png' });
    
    // 9. Log current URL
    const finalUrl = page.url();
    console.log(`\n🔗 Final URL: ${finalUrl}`);
    
    // 10. Summary
    console.log('\n📊 Test Summary:');
    console.log(`- Cookies loaded: ${cookies.length}`);
    console.log(`- Auth token present: ${authData.hasToken}`);
    console.log(`- User email: ${authData.userEmail}`);
    console.log(`- Dashboard element found: ${foundElement || 'None'}`);
    console.log(`- On sign-in page: ${signInButton}`);
    
    // Final assertion - we should have found at least one dashboard element
    expect(foundElement).not.toBeNull();
  });
});