const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('🔍 Debug Auth State\n');
  
  // Read the auth file
  const authState = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
  
  console.log('Auth file contains:');
  console.log(`- ${authState.cookies.length} cookies`);
  console.log(`- ${authState.origins.length} origins\n`);
  
  // Check for BizBuddy localStorage
  const bizBuddyOrigin = authState.origins.find(o => 
    o.origin.includes('lovableproject.com')
  );
  
  if (bizBuddyOrigin && bizBuddyOrigin.localStorage) {
    console.log('BizBuddy localStorage items:');
    bizBuddyOrigin.localStorage.forEach(item => {
      console.log(`- ${item.name}`);
      if (item.name.includes('auth-token')) {
        try {
          const tokenData = JSON.parse(item.value);
          const expiresAt = new Date(tokenData.expires_at * 1000);
          const now = new Date();
          const isExpired = expiresAt < now;
          console.log(`  Token expires at: ${expiresAt.toLocaleString()}`);
          console.log(`  Token expired: ${isExpired}`);
        } catch (e) {
          console.log('  Could not parse token data');
        }
      }
    });
  }
  
  console.log('\n🧪 Testing with Playwright...\n');
  
  // Test 1: Load state during browser launch
  console.log('Test 1: Load state during context creation');
  const browser1 = await chromium.launch({ headless: false });
  const context1 = await browser1.newContext({
    storageState: '.auth/user-state.json'
  });
  const page1 = await context1.newPage();
  
  await page1.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  await page1.waitForTimeout(5000);
  
  console.log('URL after navigation:', page1.url());
  const welcomeVisible1 = await page1.locator('text=Welcome back').isVisible().catch(() => false);
  console.log('Welcome message visible:', welcomeVisible1);
  
  await page1.screenshot({ path: 'test-results/debug-test1.png' });
  await browser1.close();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Load state after context creation
  console.log('Test 2: Load state after page creation');
  const browser2 = await chromium.launch({ headless: false });
  const context2 = await browser2.newContext();
  const page2 = await context2.newPage();
  
  // Load auth state after page is created
  await context2.addCookies(authState.cookies);
  
  // Set localStorage
  await page2.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  if (bizBuddyOrigin && bizBuddyOrigin.localStorage) {
    await page2.evaluate((items) => {
      items.forEach(item => {
        localStorage.setItem(item.name, item.value);
      });
    }, bizBuddyOrigin.localStorage);
    
    // Reload to apply localStorage
    await page2.reload();
  }
  
  await page2.waitForTimeout(5000);
  
  console.log('URL after navigation:', page2.url());
  const welcomeVisible2 = await page2.locator('text=Welcome back').isVisible().catch(() => false);
  console.log('Welcome message visible:', welcomeVisible2);
  
  await page2.screenshot({ path: 'test-results/debug-test2.png' });
  await browser2.close();
  
  console.log('\n✅ Debug complete. Check test-results/debug-test1.png and debug-test2.png');
})();