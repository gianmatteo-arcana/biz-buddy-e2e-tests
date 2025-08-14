const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function inspectErrors() {
  console.log('🔍 INSPECTING MIGRATION ERRORS');
  console.log('==============================');
  
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
      console.log(`🖥️  BROWSER: ${msg.type()}: ${msg.text()}`);
    });

    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Migrations")');
    await page.waitForTimeout(3000);

    console.log('📊 Current migration state:');
    let pendingCount = 0;
    try {
      const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
      console.log(`   ${pendingCount} pending migrations`);
    } catch (e) {
      console.log('   Could not read count');
    }

    // Try applying one migration and capture detailed error info
    console.log('\n🔵 Attempting one migration to capture errors...');
    
    try {
      // Uncheck all first
      const checkboxCount = await page.locator('input[type="checkbox"]').count();
      for (let i = 0; i < checkboxCount; i++) {
        await page.locator('input[type="checkbox"]').nth(i).uncheck();
      }
      
      // Check first one
      if (checkboxCount > 0) {
        await page.locator('input[type="checkbox"]').first().check();
        console.log('✅ Selected first migration');
      }

      // Apply
      await page.click('button:has-text("Apply Selected")');
      console.log('🔵 Clicked Apply Selected');
      
      // Wait and capture all text content that might contain errors
      await page.waitForTimeout(10000);
      
      console.log('\n📋 Capturing error details...');
      
      // Look for specific error patterns
      const errorElements = await page.locator('text=/error|failed|invalid|denied|forbidden|rate|limit|timeout/i').all();
      
      if (errorElements.length > 0) {
        console.log(`\n❌ Found ${errorElements.length} error elements:`);
        for (let i = 0; i < Math.min(errorElements.length, 10); i++) {
          try {
            const errorText = await errorElements[i].textContent();
            if (errorText && errorText.trim().length > 0) {
              console.log(`   ${i + 1}. ${errorText.trim()}`);
            }
          } catch (e) {
            console.log(`   ${i + 1}. (Could not read error text)`);
          }
        }
      } else {
        console.log('❓ No obvious error elements found');
      }
      
      // Check for success elements too
      const successElements = await page.locator('text=/success|applied|✅|completed/i').all();
      if (successElements.length > 0) {
        console.log(`\n✅ Found ${successElements.length} success elements:`);
        for (let i = 0; i < Math.min(successElements.length, 5); i++) {
          try {
            const successText = await successElements[i].textContent();
            if (successText && successText.trim().length > 0) {
              console.log(`   ${i + 1}. ${successText.trim()}`);
            }
          } catch (e) {
            console.log(`   ${i + 1}. (Could not read success text)`);
          }
        }
      }

    } catch (error) {
      console.log(`❌ Error during test application: ${error.message}`);
    }

    // Take a detailed screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `uploaded-screenshots/error-inspection-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Error inspection screenshot: ${screenshotPath}`);

    // Check final count to see if anything changed
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(3000);
    
    let finalCount = 0;
    try {
      const finalText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      finalCount = parseInt(finalText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read final count');
    }

    console.log('\n🏁 ERROR INSPECTION RESULTS:');
    console.log('============================');
    console.log(`📊 Initial pending: ${pendingCount}`);
    console.log(`📊 Final pending: ${finalCount}`);
    console.log(`📈 Change: ${pendingCount !== finalCount ? `${pendingCount} → ${finalCount}` : 'No change'}`);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
    if (finalCount === 0) {
      console.log('🎉 Somehow reached zero during inspection!');
    } else {
      console.log('📋 Still have pending migrations - errors are blocking progress');
    }

    await context.close();
    return { 
      success: true, 
      initialCount: pendingCount,
      finalCount: finalCount, 
      zeroPendingAchieved: finalCount === 0,
      screenshotPath 
    };

  } catch (error) {
    console.error('❌ Inspection error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

inspectErrors().then(result => {
  console.log('\n🔍 INSPECTION COMPLETE:', result);
  process.exit(result.success ? 0 : 1);
});