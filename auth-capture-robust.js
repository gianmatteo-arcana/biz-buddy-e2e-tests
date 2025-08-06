const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('\n🔐 BizBuddy Authentication Capture\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('📍 Step 1: Opening BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 INSTRUCTIONS:');
  console.log('='.repeat(60));
  console.log('\n1. Click "Sign in with Google"');
  console.log('2. Enter your email and password');
  console.log('3. Complete any 2FA if needed');
  console.log('4. Wait until you see the dashboard with "Welcome back, Gianmatteo!"');
  console.log('\n⏳ I will wait and automatically save when ready...\n');
  console.log('='.repeat(60) + '\n');
  
  // Wait for authentication with better detection
  let authenticated = false;
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes
  
  while (!authenticated && attempts < maxAttempts) {
    await page.waitForTimeout(1000);
    
    // Check multiple indicators
    const url = page.url();
    const dashboardUrl = url.includes('dashboard') || url.includes('app');
    
    // Check for UI elements
    const welcomeBack = await page.locator('text=Welcome back').isVisible().catch(() => false);
    const chatButton = await page.locator('text=Chat with Ally').isVisible().catch(() => false);
    const userName = await page.locator('text=Gianmatteo').isVisible().catch(() => false);
    
    // Check localStorage
    let hasAuthToken = false;
    try {
      hasAuthToken = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(key => key.includes('auth-token'));
      });
    } catch (e) {
      // Page might be navigating
    }
    
    authenticated = (welcomeBack || chatButton || userName) && hasAuthToken;
    
    if (!authenticated) {
      process.stdout.write(`\r⏳ Waiting for complete authentication... ${attempts}s`);
      attempts++;
    }
  }
  
  console.log('\n');
  
  if (authenticated) {
    console.log('✅ Full authentication detected!\n');
    
    // Wait extra time for all data to settle
    console.log('⏳ Waiting for session to stabilize...');
    await page.waitForTimeout(5000);
    
    // Save the state
    console.log('💾 Saving authentication state...');
    await context.storageState({ path: '.auth/user-state.json' });
    
    // Verify what was saved
    const saved = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    console.log(`\n✅ Successfully saved:`);
    console.log(`   - ${saved.cookies.length} cookies`);
    console.log(`   - ${saved.origins.length} origins`);
    
    // Check for BizBuddy auth
    const hasBizBuddyAuth = saved.origins.some(o => 
      o.origin.includes('lovableproject.com') && 
      o.localStorage && 
      o.localStorage.length > 0
    );
    
    if (hasBizBuddyAuth) {
      console.log('   - ✅ BizBuddy session data captured!');
      
      // Check token validity
      const authManager = new (require('./auth-manager'))();
      const validity = await authManager.checkAuthValidity();
      if (validity.valid) {
        console.log(`\n✅ Token is valid for ${validity.minutesLeft} minutes`);
        console.log(`   Expires at: ${validity.expiresAt}`);
      }
    } else {
      console.log('   - ⚠️  Warning: No BizBuddy session data found');
      console.log('\nTry running this script again.');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/auth-captured.png' });
    console.log('\n📸 Screenshot saved to test-results/auth-captured.png');
    
  } else {
    console.log('❌ Authentication timeout.');
    console.log('Please try again and make sure to complete the sign-in process.');
  }
  
  await browser.close();
  process.exit(authenticated ? 0 : 1);
})();