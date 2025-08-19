const { chromium } = require('@playwright/test');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

(async () => {
  console.log('🔐 Fresh Authentication Capture\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Step 1: Navigating to BizBuddy...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  await page.waitForLoadState('networkidle');
  
  console.log('\n' + '='.repeat(60));
  console.log('MANUAL STEPS:');
  console.log('='.repeat(60));
  console.log('1. Click "Sign in with Google"');
  console.log('2. Complete the sign-in process');
  console.log('3. Wait until you see the dashboard/welcome screen');
  console.log('='.repeat(60) + '\n');
  
  await question('Press Enter when you have completed sign-in and see the dashboard...');
  
  console.log('\nCapturing authentication state...');
  
  // Wait a bit for all cookies to settle
  await page.waitForTimeout(3000);
  
  // Save the state
  await context.storageState({ path: '.auth/user-state.json' });
  
  // Verify what was saved
  const saved = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
  console.log(`\n✅ Captured:`);
  console.log(`   - ${saved.cookies.length} cookies`);
  console.log(`   - ${saved.origins.length} origins with localStorage`);
  
  if (saved.origins.length > 0) {
    console.log('\nLocalStorage saved for:');
    saved.origins.forEach(origin => {
      console.log(`   - ${origin.origin}`);
      if (origin.localStorage) {
        origin.localStorage.forEach(item => {
          console.log(`     → ${item.name}`);
        });
      }
    });
  }
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/auth-final.png' });
  console.log('\n✅ Screenshot saved to test-results/auth-final.png');
  
  rl.close();
  await browser.close();
  
  console.log('\n✅ Authentication capture complete!');
  console.log('You can now run: npm test');
  
  process.exit(0);
})();