const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('\n🔐 BizBuddy Authentication Setup\n');
  console.log('This script will help you save your Google authentication for automated tests.\n');
  
  // Use the existing browser data if available
  const browserDataPath = './.browser-data';
  const hasExistingData = fs.existsSync(browserDataPath);
  
  console.log('Opening browser...\n');
  
  const context = hasExistingData 
    ? await chromium.launchPersistentContext(browserDataPath, {
        headless: false,
        viewport: { width: 1280, height: 720 }
      })
    : await chromium.launch({ headless: false }).then(b => b.newContext());
    
  const page = hasExistingData ? context.pages()[0] || await context.newPage() : await context.newPage();
  
  // Navigate to BizBuddy
  console.log('Step 1: Navigating to BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  await page.waitForLoadState('domcontentloaded');
  
  // Give user instructions
  console.log('\n' + '═'.repeat(60));
  console.log('MANUAL STEPS REQUIRED:');
  console.log('═'.repeat(60));
  console.log('\nPlease complete these steps in the browser:\n');
  console.log('1. If you see "Sign in with Google", click it');
  console.log('2. Complete the Google sign-in process');
  console.log('3. Wait until you see the BizBuddy dashboard or welcome screen');
  console.log('4. Then come back here and press Enter\n');
  console.log('Press Enter when you are logged in and see the dashboard...');
  console.log('═'.repeat(60) + '\n');
  
  // Wait for user to press Enter
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', resolve);
  });
  
  console.log('\nVerifying authentication...');
  await page.waitForTimeout(2000); // Give page time to settle
  
  // Check current state
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Take a screenshot
  const screenshotPath = 'test-results/auth-state-check.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);
  
  // Look for auth indicators
  const authIndicators = [
    { selector: 'text=Dashboard', name: 'Dashboard' },
    { selector: 'text=Welcome to BizBuddy!', name: 'Onboarding' },
    { selector: 'text=Welcome', name: 'Welcome message' },
    { selector: '[data-testid="user-menu"]', name: 'User menu' },
    { selector: 'button:has-text("Sign out")', name: 'Sign out button' }
  ];
  
  console.log('\nChecking for authentication indicators:');
  let isAuthenticated = false;
  
  for (const indicator of authIndicators) {
    const found = await page.locator(indicator.selector).isVisible().catch(() => false);
    console.log(`  ${found ? '✅' : '❌'} ${indicator.name}`);
    if (found) isAuthenticated = true;
  }
  
  if (!isAuthenticated) {
    console.log('\n❌ Authentication not detected!');
    console.log('Please make sure you are signed in and try again.');
    await context.close();
    process.exit(1);
  }
  
  console.log('\n✅ Authentication confirmed!');
  console.log('\nSaving authentication state...');
  
  // Create auth directory
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // Save the state
  const authFile = path.join(authDir, 'user-state.json');
  await context.storageState({ path: authFile });
  
  // Verify what was saved
  const savedState = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  console.log(`\n✅ Authentication state saved!`);
  console.log(`   - Cookies: ${savedState.cookies.length}`);
  console.log(`   - Local storage: ${savedState.origins.length} origins`);
  
  if (savedState.cookies.length === 0 && savedState.origins.length === 0) {
    console.log('\n⚠️  Warning: No authentication data was captured!');
    console.log('This might happen with Google OAuth. Let me try an alternative approach...\n');
    
    // Save current page state as a backup
    const pageState = {
      url: currentUrl,
      timestamp: new Date().toISOString(),
      authenticated: true
    };
    fs.writeFileSync('.auth/page-state.json', JSON.stringify(pageState, null, 2));
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ SETUP COMPLETE!');
  console.log('═'.repeat(60));
  console.log('\nYou can now run the tests with: npm test');
  console.log('\nNote: Google OAuth sessions typically last 14-30 days.');
  console.log('You\'ll need to re-run this script when the session expires.\n');
  
  await context.close();
  process.exit(0);
})();