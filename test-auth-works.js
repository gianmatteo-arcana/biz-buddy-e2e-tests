const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('✅ Testing auth state...\n');
  
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Enable console logging to see auth events
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('AUTH STATE CHANGED') || text.includes('SIGNED_IN')) {
      console.log('🔐', text);
    }
  });
  
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  // Wait for auth to process
  await page.waitForTimeout(3000);
  
  // Check for authenticated elements
  const welcomeBack = await page.locator('text=Welcome back').isVisible().catch(() => false);
  const chatWithAlly = await page.locator('text=Chat with Ally').isVisible().catch(() => false);
  const userName = await page.locator('text=Gianmatteo').isVisible().catch(() => false);
  
  console.log('\n✨ Authentication Status:');
  console.log(`- Welcome back visible: ${welcomeBack}`);
  console.log(`- Chat with Ally visible: ${chatWithAlly}`);
  console.log(`- User name visible: ${userName}`);
  console.log(`\n✅ AUTHENTICATED: ${welcomeBack || chatWithAlly || userName}`);
  
  await browser.close();
  process.exit(0);
})();