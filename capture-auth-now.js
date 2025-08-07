const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('🔐 Capturing authentication state...\n');
  
  // Connect to existing browser
  try {
    // We need to use a different approach since we can't connect to the running instance
    // Let's launch a new browser and have you sign in again, but this time we'll capture it
    
    const browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('Navigating to BizBuddy...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    console.log('\nWaiting 5 seconds for page to load...');
    await page.waitForTimeout(5000);
    
    // Check if already authenticated
    const dashboardVisible = await page.locator('text=Dashboard').isVisible({ timeout: 3000 }).catch(() => false);
    const welcomeVisible = await page.locator('text=Welcome to BizBuddy!').isVisible({ timeout: 3000 }).catch(() => false);
    const processingVisible = await page.locator('text=Processing your information').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (dashboardVisible || welcomeVisible || processingVisible) {
      console.log('✅ Already authenticated! Saving state...');
    } else {
      console.log('Not authenticated. Please sign in manually.');
      console.log('Once signed in, I\'ll save the state automatically...');
      
      // Wait for successful sign in
      await Promise.race([
        page.waitForURL('**/dashboard', { timeout: 300000 }),
        page.locator('text=Welcome to BizBuddy!').waitFor({ state: 'visible', timeout: 300000 }),
        page.locator('text=Processing your information').waitFor({ state: 'visible', timeout: 300000 })
      ]);
    }
    
    // Save the state
    console.log('\nSaving authentication state...');
    await context.storageState({ path: '.auth/user-state.json' });
    
    const saved = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    console.log(`✅ Saved ${saved.cookies.length} cookies`);
    console.log(`✅ Saved localStorage for ${saved.origins.length} origins`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/auth-captured.png' });
    console.log('✅ Screenshot saved\n');
    
    console.log('Authentication state saved successfully!');
    await browser.close();
    process.exit(0);
    
  } catch (_error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();