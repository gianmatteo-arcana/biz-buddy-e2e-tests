const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function checkCurrentState() {
  console.log('🔍 CHECKING CURRENT MIGRATION STATE');
  console.log('===================================');
  
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Migrations")');
    await page.waitForTimeout(3000);

    // Just check the count and take a screenshot
    let pendingCount = 0;
    try {
      const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read pending count');
    }

    console.log(`📊 Current pending migrations: ${pendingCount}`);

    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stateDir = path.join('uploaded-screenshots', 'current-state', timestamp);
    fs.mkdirSync(stateDir, { recursive: true });

    const screenshotPath = path.join(stateDir, 'current-migration-state.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log(`📸 Current state screenshot: ${screenshotPath}`);

    if (pendingCount === 0) {
      console.log('🎉 MISSION ALREADY COMPLETE! Zero pending migrations!');
    } else {
      console.log(`📋 ${pendingCount} migrations still pending`);
    }

    await context.close();
    return { success: true, pendingCount, screenshotPath };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

checkCurrentState().then(result => {
  console.log('\n🏆 RESULT:', result);
  process.exit(result.success ? 0 : 1);
});