const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Opening browser to save auth state...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('1. Navigate to BizBuddy');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  console.log('2. Waiting for page to load...');
  await page.waitForTimeout(5000);
  
  console.log('\nCurrent URL:', page.url());
  
  // Check if logged in
  const dashboardVisible = await page.locator('text=Dashboard').isVisible().catch(() => false);
  const welcomeVisible = await page.locator('text=Welcome').isVisible().catch(() => false);
  
  if (dashboardVisible || welcomeVisible) {
    console.log('\n✅ You appear to be logged in!');
    
    // Create auth directory
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    // Save state
    console.log('\nSaving authentication state...');
    await context.storageState({ path: '.auth/user-state.json' });
    console.log('✅ Auth state saved to .auth/user-state.json');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/logged-in-state.png', fullPage: true });
    console.log('✅ Screenshot saved to test-results/logged-in-state.png');
  } else {
    console.log('\n❌ Not logged in. Please sign in manually:');
    console.log('1. Click "Sign in with Google"');
    console.log('2. Complete authentication');
    console.log('3. Press Enter here when done...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Check again
    const loggedInNow = await page.locator('text=Dashboard').isVisible().catch(() => false) ||
                        await page.locator('text=Welcome').isVisible().catch(() => false);
    
    if (loggedInNow) {
      console.log('\n✅ Login successful! Saving state...');
      await context.storageState({ path: '.auth/user-state.json' });
      console.log('✅ Auth state saved!');
    }
  }
  
  console.log('\nPress Enter to close browser...');
  await new Promise(resolve => process.stdin.once('data', resolve));
  
  await browser.close();
})();