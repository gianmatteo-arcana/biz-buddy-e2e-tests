import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = '.auth/user-state.json';

setup('authenticate with Google OAuth', async ({ page, context }) => {
  console.log('\n🔐 GOOGLE OAUTH SETUP\n');
  
  // Check if auth state already exists
  if (fs.existsSync(authFile)) {
    console.log('✅ Auth state already exists.');
    console.log('   To re-authenticate, delete .auth/user-state.json\n');
    
    // Verify the saved auth still works
    await page.goto('/');
    try {
      // Check if we're still logged in by looking for dashboard elements
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      console.log('✅ Existing auth state is still valid!\n');
      return;
    } catch {
      console.log('⚠️  Existing auth state is expired. Re-authenticating...\n');
    }
  }

  // Ensure auth directory exists
  await fs.promises.mkdir(path.dirname(authFile), { recursive: true });

  // Navigate to the app
  console.log('1️⃣  Navigating to BizBuddy...');
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Click the Google sign-in button
  console.log('2️⃣  Clicking "Sign in with Google" button...\n');
  
  // Try multiple possible selectors for the Google button
  const googleButton = page.locator('button:has-text("Sign in with Google")').or(
    page.locator('text=Sign in with Google')
  );
  
  await googleButton.click();
  
  console.log('📋 MANUAL STEPS REQUIRED:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Complete Google sign-in in the browser window');
  console.log('2. Enter your test account credentials');
  console.log('3. Complete 2FA if prompted');
  console.log('4. Wait for redirect back to BizBuddy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('⏳ Waiting for authentication (timeout: 5 minutes)...\n');
  
  // Wait for successful redirect back to the app
  try {
    await page.waitForURL('**/dashboard', { 
      timeout: 300000, // 5 minutes
      waitUntil: 'networkidle' 
    });
  } catch (error) {
    // If not redirected to dashboard, check if we're on the main page with auth
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check if user is authenticated by looking for user menu or similar
    try {
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
    } catch {
      throw new Error('Authentication failed - no redirect to dashboard or welcome message');
    }
  }
  
  console.log('✅ Authentication successful!');
  
  // Optional: Take a screenshot to verify we're logged in
  await page.screenshot({ 
    path: 'test-results/auth-success.png',
    fullPage: true 
  });
  
  // Save the authentication state
  console.log('💾 Saving authentication state...');
  await context.storageState({ path: authFile });
  
  console.log('✅ Auth state saved to .auth/user-state.json');
  console.log('\n🎉 Setup complete! You can now run the tests.\n');
  
  // Log some helpful info
  const cookies = await context.cookies();
  console.log(`📊 Saved ${cookies.length} cookies`);
  
  const localStorage = await page.evaluate(() => {
    return Object.keys(window.localStorage).length;
  });
  console.log(`📊 Saved ${localStorage} localStorage items\n`);
});