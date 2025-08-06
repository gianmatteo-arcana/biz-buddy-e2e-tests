const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('🔐 Capturing current browser session...\n');
  
  // Launch browser with persistent context to capture existing session
  const browser = await chromium.launchPersistentContext('./.browser-data', {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage();
  
  console.log('Navigating to BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  console.log('\nINSTRUCTIONS:');
  console.log('1. If not logged in, sign in with Google manually');
  console.log('2. Once you see the dashboard, press Enter here');
  console.log('3. If already logged in, just press Enter\n');
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', resolve);
  });
  
  console.log('\nChecking authentication status...');
  
  // Wait for page to stabilize
  await page.waitForLoadState('networkidle');
  
  const url = page.url();
  console.log('Current URL:', url);
  
  // Check various auth indicators
  const dashboardVisible = await page.locator('text=Dashboard').isVisible().catch(() => false);
  const welcomeVisible = await page.locator('text=Welcome').isVisible().catch(() => false);
  const onboardingVisible = await page.locator('text=Welcome to BizBuddy!').isVisible().catch(() => false);
  
  if (dashboardVisible || welcomeVisible || onboardingVisible) {
    console.log('\n✅ Authentication confirmed!');
    
    // Save the state
    console.log('Saving authentication state...');
    await browser.storageState({ path: '.auth/user-state.json' });
    
    // Verify what was saved
    const state = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    console.log(`✅ Saved ${state.cookies.length} cookies`);
    console.log(`✅ Saved localStorage for ${state.origins.length} origins`);
    
    // List the domains that have data
    if (state.origins.length > 0) {
      console.log('\nSaved data for domains:');
      state.origins.forEach(origin => {
        console.log(`  - ${origin.origin}`);
      });
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/session-captured.png', fullPage: true });
    console.log('\n✅ Screenshot saved to test-results/session-captured.png');
    console.log('✅ Session successfully captured!\n');
  } else {
    console.log('\n❌ Could not detect authentication. Please try again.');
  }
  
  await browser.close();
  process.exit(0);
})();