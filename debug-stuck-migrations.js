const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugStuckMigrations() {
  console.log('🔍 DEBUGGING STUCK MIGRATIONS');
  console.log('=============================');
  
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

    // Get detailed info about all pending migrations
    console.log('\n📋 Analyzing pending migrations...');
    
    // Wait for content to load
    await page.waitForSelector('text=/Pending Migrations/', { timeout: 10000 });
    
    // Get the pending count
    let pendingCount = 0;
    try {
      const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
      console.log(`📊 Total pending: ${pendingCount}`);
    } catch (e) {
      console.log('❓ Could not read pending count');
    }

    // Get all migration names and details
    const migrationDetails = [];
    
    try {
      // Look for migration rows/items
      const migrationRows = await page.locator('[data-testid*="migration"], .migration-item, tr, .border').all();
      console.log(`🔍 Found ${migrationRows.length} potential migration elements`);
      
      for (let i = 0; i < Math.min(migrationRows.length, 10); i++) {
        try {
          const text = await migrationRows[i].textContent();
          if (text && text.includes('.sql') && text.includes('Pending')) {
            migrationDetails.push(text.trim());
            console.log(`📝 Migration ${i + 1}: ${text.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`❓ Could not read migration ${i + 1}`);
        }
      }
    } catch (e) {
      console.log('❓ Could not analyze migration details:', e.message);
    }

    // Try alternative approach - get the HTML source
    console.log('\n🔍 Getting page source to identify stuck migrations...');
    const pageContent = await page.content();
    
    // Look for migration file names
    const sqlMatches = pageContent.match(/\d{14}_[^"'<>]*\.sql/g) || [];
    const uniqueMigrations = [...new Set(sqlMatches)];
    
    console.log('\n📂 SQL files found on page:');
    uniqueMigrations.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration}`);
    });

    // Take a detailed screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const debugDir = path.join('uploaded-screenshots', 'debug-stuck-migrations', timestamp);
    fs.mkdirSync(debugDir, { recursive: true });

    const screenshotPath = path.join(debugDir, 'stuck-migrations-debug.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Try to click on first migration to see details
    console.log('\n🔍 Trying to get migration details...');
    try {
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.check();
      
      // Look for any error messages or details that appear
      await page.waitForTimeout(2000);
      
      // Try clicking apply to see what error occurs
      await page.click('button:has-text("Apply Selected")');
      await page.waitForTimeout(5000);
      
      // Capture any error messages
      const errors = await page.locator('text=/error|Error|failed|Failed|❌/').allTextContents();
      if (errors.length > 0) {
        console.log('\n❌ Error messages found:');
        errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
    } catch (e) {
      console.log('❓ Could not interact with migrations:', e.message);
    }

    const debugReport = {
      timestamp: new Date().toISOString(),
      pendingCount,
      migrationDetails,
      sqlFilesFound: uniqueMigrations,
      analysis: "These migrations appear to be stuck - they show success in UI but don't actually apply"
    };

    fs.writeFileSync(path.join(debugDir, 'debug-report.json'), JSON.stringify(debugReport, null, 2));

    console.log('\n📊 DEBUGGING COMPLETE');
    console.log('====================');
    console.log(`📸 Debug screenshot: ${screenshotPath}`);
    console.log(`📝 Found ${uniqueMigrations.length} unique migrations`);
    console.log(`⚠️ These migrations may need to be marked as applied manually`);

    await context.close();
    return { 
      success: true, 
      pendingCount,
      migrationsFound: uniqueMigrations,
      screenshotPath 
    };

  } catch (error) {
    console.error('❌ Debug error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

debugStuckMigrations().then(result => {
  console.log('\n🔍 DEBUG RESULT:', result);
  process.exit(result.success ? 0 : 1);
});