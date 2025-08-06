const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('Opening new browser to capture your authenticated session...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  console.log('IMPORTANT: You should already be logged in from the previous browser.');
  console.log('The page should automatically show your dashboard.\n');
  console.log('Waiting 10 seconds for authentication to be detected...\n');
  
  await page.waitForTimeout(10000);
  
  // Save whatever state we have
  await context.storageState({ path: '.auth/user-state.json' });
  
  const saved = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
  console.log(`Saved ${saved.cookies.length} cookies and ${saved.origins.length} origins`);
  
  await page.screenshot({ path: 'test-results/quick-capture.png' });
  
  await browser.close();
  process.exit(0);
})();