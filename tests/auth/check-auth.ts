import { test } from '@playwright/test';

test('check if authenticated', async ({ page, context }) => {
  console.log('Checking authentication status...');
  
  // Navigate to the app
  await page.goto('/');
  
  // Wait a bit for any redirects
  await page.waitForTimeout(3000);
  
  // Log current URL
  console.log('Current URL:', page.url());
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/auth-check.png', fullPage: true });
  
  // Check for auth indicators
  const isLoggedIn = await page.locator('text=Dashboard').isVisible().catch(() => false) ||
                     await page.locator('text=Welcome').isVisible().catch(() => false) ||
                     await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
  
  console.log('Is logged in?', isLoggedIn);
  
  // Log cookies
  const cookies = await context.cookies();
  console.log(`Found ${cookies.length} cookies`);
  
  if (isLoggedIn) {
    console.log('✅ User is authenticated! Saving state...');
    await context.storageState({ path: '.auth/user-state.json' });
    console.log('✅ Auth state saved to .auth/user-state.json');
  } else {
    console.log('❌ User is not authenticated');
  }
});