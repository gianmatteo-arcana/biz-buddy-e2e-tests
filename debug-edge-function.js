const { chromium } = require('playwright');

async function debugEdgeFunction() {
  console.log('🔍 DEBUGGING EDGE FUNCTION AFTER BOOTSTRAP');
  console.log('==========================================');
  
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    
    // Monitor console messages for detailed errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔥 BROWSER ERROR: ${msg.text()}`);
      } else if (msg.text().includes('EdgeFunction') || msg.text().includes('Migration')) {
        console.log(`📋 MIGRATION LOG: ${msg.text()}`);
      }
    });

    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Migrations")');
    await page.waitForTimeout(3000);

    console.log('\n🧪 Testing single migration application with detailed monitoring...');
    
    // Get current count
    let pendingCount = 0;
    try {
      const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
      console.log(`📊 Current pending: ${pendingCount}`);
    } catch (e) {
      console.log('Could not read pending count');
    }

    if (pendingCount === 0) {
      console.log('🎉 No pending migrations - bootstrap may have resolved everything!');
      return { success: true, pendingCount: 0 };
    }

    // Try applying one migration with detailed monitoring
    console.log('\n🔵 Applying one migration with full error monitoring...');
    
    // Uncheck all first
    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    for (let i = 0; i < checkboxCount; i++) {
      await page.locator('input[type="checkbox"]').nth(i).uncheck();
    }
    
    // Check first migration
    await page.locator('input[type="checkbox"]').first().check();
    console.log('✅ Selected first migration');
    
    // Apply and monitor network requests
    console.log('🌐 Monitoring network requests...');
    
    page.on('response', async (response) => {
      if (response.url().includes('apply-migration')) {
        console.log(`🌐 RESPONSE: ${response.status()} ${response.url()}`);
        if (response.status() >= 400) {
          try {
            const responseText = await response.text();
            console.log(`🔥 ERROR RESPONSE: ${responseText}`);
          } catch (e) {
            console.log(`🔥 ERROR RESPONSE: Could not read response body`);
          }
        }
      }
    });
    
    await page.click('button:has-text("Apply Selected")');
    console.log('🔵 Apply button clicked, monitoring...');
    
    // Wait longer and monitor
    for (let wait = 0; wait < 20; wait++) {
      await page.waitForTimeout(2000);
      console.log(`⏳ Waiting... (${(wait + 1) * 2}s)`);
      
      // Look for any new error messages in the UI
      const errorElements = await page.locator('text=/error|failed|500/i').allTextContents();
      if (errorElements.length > 0) {
        console.log('🔥 UI ERROR MESSAGES:');
        errorElements.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.substring(0, 100)}`);
        });
      }
      
      const successElements = await page.locator('text=/success|applied|✅/i').count();
      if (successElements > 0) {
        console.log('✅ Success indicators found');
        break;
      }
    }

    // Take screenshot
    const screenshotPath = `uploaded-screenshots/debug-edge-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Debug screenshot: ${screenshotPath}`);

    // Final check
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(3000);
    
    let finalCount = 0;
    try {
      const finalText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      finalCount = parseInt(finalText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read final count');
    }

    console.log('\n🏁 DEBUG RESULTS:');
    console.log('================');
    console.log(`📊 Initial pending: ${pendingCount}`);
    console.log(`📊 Final pending: ${finalCount}`);
    console.log(`📈 Change: ${pendingCount - finalCount}`);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
    if (finalCount < pendingCount) {
      console.log('✅ Migration was successful despite HTTP 500 logs');
    } else {
      console.log('❌ Migration failed - HTTP 500 errors are blocking progress');
      console.log('💡 The exec_migration_sql function might need additional setup');
    }

    await context.close();
    return { 
      success: true, 
      initialCount: pendingCount,
      finalCount: finalCount,
      migrationWorked: finalCount < pendingCount,
      screenshotPath 
    };

  } catch (error) {
    console.error('❌ Debug error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

debugEdgeFunction().then(result => {
  console.log('\n🔍 DEBUG COMPLETE:', result);
  
  if (result.migrationWorked) {
    console.log('🎯 Good news: Migrations are actually working despite HTTP 500 logs!');
    console.log('🔄 Continue applying more migrations to reach zero');
  } else if (result.finalCount === 0) {
    console.log('🎉 MISSION ACCOMPLISHED: Zero pending achieved!');
  } else {
    console.log('📋 Edge function still has issues - may need additional debugging');
  }
  
  process.exit(result.success ? 0 : 1);
});