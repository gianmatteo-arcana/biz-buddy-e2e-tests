import { test, expect } from '@playwright/test';

// No saved auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Manual Signup Test', () => {
  test('manual signup flow - user completes OAuth', async ({ page }) => {
    console.log('\n🧪 Manual Signup Test\n');
    console.log('This test will open a browser and wait for you to:');
    console.log('1. Click "Sign in with Google"');
    console.log('2. Complete the Google OAuth flow manually');
    console.log('3. Return to BizBuddy dashboard\n');
    
    // Set a long timeout for manual interaction
    test.setTimeout(5 * 60 * 1000); // 5 minutes
    
    // Navigate to BizBuddy
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Verify we're on the sign-in page
    const signInButton = page.locator('text=Sign in with Google').first();
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Sign in page loaded');
    console.log('\n' + '='.repeat(60));
    console.log('👉 Please complete the Google OAuth flow in the browser');
    console.log('='.repeat(60) + '\n');
    
    // Wait for user to complete OAuth and return to dashboard
    // We'll check every 2 seconds for up to 5 minutes
    let authenticated = false;
    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    
    while (!authenticated && (Date.now() - startTime) < maxWaitTime) {
      // Check if we're back on BizBuddy
      const currentUrl = page.url();
      if (currentUrl.includes('lovableproject.com')) {
        // Check for dashboard elements
        const dashboardElements = [
          'text=Welcome back',
          'text=Chat with Ally',
          'text=Business Snapshot',
          'text=Priority Tasks'
        ];
        
        for (const selector of dashboardElements) {
          if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
            authenticated = true;
            console.log(`\n✅ Authentication successful! Found: ${selector}`);
            break;
          }
        }
      }
      
      if (!authenticated) {
        // Show progress
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(`\r⏳ Waiting for authentication... ${elapsed}s`);
        await page.waitForTimeout(2000);
      }
    }
    
    console.log('\n');
    
    if (!authenticated) {
      throw new Error('Authentication timeout - did not reach dashboard within 5 minutes');
    }
    
    // Take screenshot of authenticated state
    await page.screenshot({ path: 'test-results/manual-signup-success.png', fullPage: true });
    
    // Log some details about the authenticated state
    const userEmail = await page.evaluate(() => {
      const authData = localStorage.getItem(Object.keys(localStorage).find(k => k.includes('auth-token')) || '');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          return parsed.user?.email || 'Unknown';
        } catch (e) {
          return 'Parse error';
        }
      }
      return 'No auth data';
    });
    
    console.log(`\n📧 Authenticated as: ${userEmail}`);
    console.log('🎉 Manual signup test completed successfully!\n');
    
    // Final assertion
    expect(authenticated).toBe(true);
  });
});