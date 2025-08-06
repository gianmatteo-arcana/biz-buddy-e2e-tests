const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🔐 Interactive BizBuddy Auth Setup\n');
  
  // Launch browser
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
  console.log('BROWSER IS READY FOR MANUAL SIGN-IN');
  console.log('═'.repeat(60));
  console.log('\n1. Click "Sign in with Google" in the browser');
  console.log('2. Complete the Google sign-in process');
  console.log('3. Wait until you see the dashboard or welcome screen');
  console.log('4. Let me know when you\'re done\n');
  console.log('Keeping browser open for manual interaction...');
  console.log('═'.repeat(60) + '\n');
  
  // Keep the script running
  // When user is done, they'll tell us and we can continue
  await new Promise(() => {});
})();