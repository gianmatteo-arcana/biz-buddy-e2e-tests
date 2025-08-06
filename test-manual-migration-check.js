const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Manual Migration Check\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable detailed console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('migration') || text.includes('Migration') || text.includes('🔧')) {
      console.log(`[${msg.type()}]`, text);
    }
  });

  console.log('📍 Navigating to app...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for auth
  await page.waitForTimeout(3000);

  console.log('\n🔍 Checking for migration button...');
  
  // Look for migration button
  const migrationButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const migrationBtn = buttons.find(btn => btn.textContent?.includes('Migration'));
    return {
      exists: !!migrationBtn,
      text: migrationBtn?.textContent || null,
      visible: migrationBtn ? window.getComputedStyle(migrationBtn).display !== 'none' : false
    };
  });

  console.log('Migration button:', migrationButton);

  // Wait for migration state to settle
  console.log('\n⏳ Waiting for migration check to complete...');
  await page.waitForTimeout(15000); // Wait 15 seconds for edge function

  // Check final state
  const finalState = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const migrationBtn = buttons.find(btn => btn.textContent?.includes('Migration'));
    return {
      exists: !!migrationBtn,
      text: migrationBtn?.textContent || null,
      visible: migrationBtn ? window.getComputedStyle(migrationBtn).display !== 'none' : false
    };
  });

  console.log('\n📊 Final state:', finalState);

  // Take screenshot
  await page.screenshot({ path: 'migration-check-final.png' });
  console.log('📸 Screenshot saved: migration-check-final.png');

  await browser.close();
  
  console.log('\n✅ Test complete!');
})();