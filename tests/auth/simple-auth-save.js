const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('\n🔐 Simple BizBuddy Auth Setup\n');
  
  // Launch regular browser (not persistent context)
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  console.log('✅ Browser launched!\n');
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  // Navigate to BizBuddy
  console.log('Navigating to BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  console.log('\n' + '═'.repeat(60));
  console.log('INSTRUCTIONS:');
  console.log('═'.repeat(60));
  console.log('\n1. Sign in with Google if needed');
  console.log('2. Wait until you see the dashboard or welcome screen');
  console.log('3. Press Enter here when ready\n');
  console.log('Waiting for you to sign in...');
  console.log('═'.repeat(60) + '\n');
  
  // Wait for Enter
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', resolve);
  });
  
  console.log('Checking authentication...');
  
  // Check what page we're on
  const url = page.url();
  console.log('Current URL:', url);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/current-state.png' });
  console.log('Screenshot saved to test-results/current-state.png');
  
  // Save auth state
  console.log('\nSaving authentication state...');
  const authPath = '.auth/user-state.json';
  await context.storageState({ path: authPath });
  
  // Check what was saved
  const saved = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  console.log(`\nSaved: ${saved.cookies.length} cookies, ${saved.origins.length} origins`);
  
  // If no cookies were saved, let's check localStorage
  if (saved.cookies.length === 0) {
    console.log('\nNo cookies found. Checking localStorage...');
    const localStorage = await page.evaluate(() => {
      return Object.keys(window.localStorage);
    });
    console.log('localStorage keys:', localStorage);
  }
  
  console.log('\n✅ Done! Closing browser...');
  await browser.close();
  
  process.exit(0);
})();