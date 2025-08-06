const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('🔐 Verifying BizBuddy Authentication\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  // Load auth state
  const authStatePath = '.auth/user-state.json';
  const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
  
  console.log(`Loading auth state with ${authState.cookies.length} cookies\n`);
  
  const context = await browser.newContext({
    storageState: authStatePath
  });
  
  const page = await context.newPage();
  
  console.log('Navigating to BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  console.log('Waiting for page to load...\n');
  await page.waitForTimeout(5000);
  
  // Check what we see
  const url = page.url();
  console.log('Current URL:', url);
  
  // Check for various elements
  const checks = [
    { selector: 'text=Sign in with Google', name: 'Sign in button (NOT authenticated)' },
    { selector: 'text=Welcome back, Gianmatteo!', name: 'Welcome back message (authenticated)' },
    { selector: 'text=Chat with Ally', name: 'Chat with Ally button (authenticated)' },
    { selector: 'text=Gianmatteo Allyn', name: 'User name in header (authenticated)' },
    { selector: 'text=Checking...', name: 'Checking status (authenticated)' }
  ];
  
  console.log('\nChecking page elements:');
  for (const check of checks) {
    const visible = await page.locator(check.selector).isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`${visible ? '✅' : '❌'} ${check.name}`);
  }
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/verify-auth.png', fullPage: true });
  console.log('\nScreenshot saved to test-results/verify-auth.png');
  
  console.log('\nKeeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  process.exit(0);
})();