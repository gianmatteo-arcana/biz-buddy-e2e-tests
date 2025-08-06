import { test, expect } from '@playwright/test';
import { TestUserManager, withTestUser } from '../helpers/test-user-manager';

// No saved auth state - testing fresh users
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('First-Time User Experience', () => {
  
  test('first-time user sees onboarding after signup', async ({ page }) => {
    await withTestUser(async (testUser) => {
      console.log(`🧪 Testing with user: ${testUser.email}`);
      
      // Navigate to BizBuddy
      await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
      
      // Click sign in
      const signInButton = page.locator('text=Sign in with Google').first();
      await signInButton.click();
      
      // Wait for Google OAuth page
      await page.waitForURL(/accounts\.google\.com/, { timeout: 30000 });
      
      // Fill in test user credentials
      console.log('📧 Entering test user email...');
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill(testUser.email);
      await page.keyboard.press('Enter');
      
      // Fill in password
      console.log('🔑 Entering password...');
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.fill(testUser.password);
      await page.keyboard.press('Enter');
      
      // Handle consent if needed
      try {
        const consentButton = page.locator('button:has-text("Continue"), button:has-text("Allow")');
        if (await consentButton.isVisible({ timeout: 5000 })) {
          await consentButton.click();
        }
      } catch {
        // No consent needed
      }
      
      // Wait for redirect back to BizBuddy
      await page.waitForURL(/lovableproject\.com/, { timeout: 30000 });
      await page.waitForTimeout(5000); // Let auth process
      
      // First-time users should see onboarding
      console.log('🎯 Checking for onboarding experience...');
      
      // Look for onboarding indicators
      const onboardingElements = [
        'text=Welcome to BizBuddy',
        'text=Get Started',
        'text=Tell us about your business',
        '[data-testid="onboarding-start"]'
      ];
      
      let foundOnboarding = false;
      for (const selector of onboardingElements) {
        if (await page.locator(selector).isVisible({ timeout: 5000 }).catch(() => false)) {
          foundOnboarding = true;
          console.log(`✅ Found onboarding element: ${selector}`);
          break;
        }
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/first-time-user-${testUser.email.split('@')[0]}.png`,
        fullPage: true 
      });
      
      if (!foundOnboarding) {
        // If no onboarding, check if user went straight to dashboard
        // This might happen if the test user has been used before
        const dashboardElements = [
          'text=Dashboard',
          'text=Chat with Ally',
          'text=Business Snapshot'
        ];
        
        let foundDashboard = false;
        for (const selector of dashboardElements) {
          if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
            foundDashboard = true;
            console.log(`⚠️  User went to dashboard (not first-time): ${selector}`);
            break;
          }
        }
        
        if (foundDashboard) {
          console.warn('⚠️  Test user appears to be returning user, not first-time');
          console.warn('   User needs cleanup before testing first-time experience');
        }
      }
      
      expect(foundOnboarding).toBe(true);
    });
  });
  
  test('cleanup queue is updated after test', async () => {
    const manager = TestUserManager.getInstance();
    const queue = await manager.getCleanupQueue();
    
    console.log('🧹 Cleanup queue:', queue);
    expect(queue.length).toBeGreaterThan(0);
  });
});

test.describe('First-Time User - Manual Interactive', () => {
  test.skip('manual first-time user test', async ({ page }) => {
    // This test is skipped by default - remove .skip to run
    console.log('\n📱 Manual First-Time User Test\n');
    console.log('Instructions:');
    console.log('1. Use a fresh Google account');
    console.log('2. Complete the entire signup flow');
    console.log('3. Note any onboarding steps');
    console.log('4. Test will wait for you to complete\n');
    
    test.setTimeout(10 * 60 * 1000); // 10 minutes
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for manual completion
    let completed = false;
    const startTime = Date.now();
    
    while (!completed && (Date.now() - startTime) < 600000) {
      // Check for dashboard or onboarding
      const isOnboarding = await page.locator('text=/Welcome to BizBuddy|Get Started|Tell us about/').isVisible().catch(() => false);
      const isDashboard = await page.locator('text=/Dashboard|Chat with Ally/').isVisible().catch(() => false);
      
      if (isOnboarding || isDashboard) {
        completed = true;
        console.log(`\n✅ Flow completed! User reached: ${isOnboarding ? 'Onboarding' : 'Dashboard'}`);
        
        await page.screenshot({ 
          path: 'test-results/manual-first-time-user-complete.png',
          fullPage: true 
        });
      } else {
        process.stdout.write(`\r⏳ Waiting for completion... ${Math.floor((Date.now() - startTime) / 1000)}s`);
        await page.waitForTimeout(2000);
      }
    }
    
    expect(completed).toBe(true);
  });
});