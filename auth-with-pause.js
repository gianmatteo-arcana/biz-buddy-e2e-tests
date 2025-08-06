const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('🔐 BizBuddy Authentication Setup\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  console.log('\n' + '='.repeat(60));
  console.log('BROWSER IS READY');
  console.log('='.repeat(60));
  console.log('\nPlease complete these steps in the browser:');
  console.log('1. Click "Sign in with Google"');
  console.log('2. Enter your email and password');
  console.log('3. Complete any 2FA if needed');
  console.log('4. Wait until you see the dashboard');
  console.log('\nI will wait 2 minutes for you to complete sign-in...\n');
  
  // Wait for authentication to complete
  try {
    await Promise.race([
      page.waitForURL('**/dashboard', { timeout: 120000 }),
      page.locator('text=Welcome to BizBuddy!').waitFor({ state: 'visible', timeout: 120000 }),
      page.locator('text=Processing your information').waitFor({ state: 'visible', timeout: 120000 }),
      page.locator('text=Dashboard').waitFor({ state: 'visible', timeout: 120000 })
    ]);
    
    console.log('✅ Authentication detected!');
    
    // Wait for cookies to settle
    await page.waitForTimeout(3000);
    
    // Save state
    console.log('Saving authentication state...');
    await context.storageState({ path: '.auth/user-state.json' });
    
    const saved = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    console.log(`\nSaved:`);
    console.log(`- ${saved.cookies.length} cookies`);
    console.log(`- ${saved.origins.length} origins`);
    
    // Screenshot
    await page.screenshot({ path: 'test-results/auth-success.png' });
    console.log('\n✅ Authentication saved successfully!');
    
  } catch (error) {
    console.log('\n❌ Timeout waiting for authentication');
    console.log('Please try again');
  }
  
  await browser.close();
  process.exit(0);
})();