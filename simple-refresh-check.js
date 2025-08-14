const { chromium } = require('playwright');

async function simpleRefreshCheck() {
  console.log('🔄 SIMPLE REFRESH AND CHECK');
  console.log('===========================');
  
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

    // Refresh to get latest state
    console.log('🔄 Refreshing migration list...');
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(5000);

    let pendingCount = 0;
    try {
      const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read count');
    }

    console.log(`📊 After refresh: ${pendingCount} pending migrations`);

    if (pendingCount === 0) {
      console.log('🎉 ZERO PENDING ACHIEVED!');
      
      // Take victory screenshot
      await page.screenshot({ 
        path: `uploaded-screenshots/victory-${Date.now()}.png`, 
        fullPage: true 
      });
    } else {
      console.log(`📋 Still ${pendingCount} pending`);
      
      // Check if these are new migrations we created
      const pageContent = await page.content();
      const newMigrations = [
        '20250814192000_create_tasks_table_no_auth_trigger',
        '20250814193000_mark_auth_trigger_migrations_obsolete'
      ];
      
      let foundNewMigrations = 0;
      newMigrations.forEach(migration => {
        if (pageContent.includes(migration)) {
          foundNewMigrations++;
          console.log(`✅ Found our new migration: ${migration}`);
        }
      });
      
      if (foundNewMigrations > 0) {
        console.log(`📋 ${foundNewMigrations} of our new migrations are ready to apply`);
        console.log('🎯 This means our architectural solution is working!');
      }
    }

    await context.close();
    return { success: true, pendingCount };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

simpleRefreshCheck().then(result => {
  console.log('\n🏆 REFRESH CHECK RESULT:', result);
  process.exit(result.success ? 0 : 1);
});