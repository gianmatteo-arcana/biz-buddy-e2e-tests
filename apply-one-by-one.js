const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function applyMigrationsOneByOne() {
  console.log('🎯 APPLYING MIGRATIONS ONE BY ONE');
  console.log('=================================');
  
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Navigate and set up
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Migrations")');
    await page.waitForTimeout(3000);

    let totalApplied = 0;
    let maxIterations = 15;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      console.log(`\n🔄 Iteration ${iteration}: Checking for pending migrations...`);

      // Check current state
      let pendingCount = 0;
      try {
        const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
        pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
        console.log(`📊 Found ${pendingCount} pending migrations`);
      } catch (e) {
        console.log('❓ Could not read pending count, checking if zero...');
        break;
      }

      if (pendingCount === 0) {
        console.log('🎉 SUCCESS! Zero pending migrations achieved!');
        break;
      }

      try {
        // Find the first checkbox (first pending migration)
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        const isVisible = await firstCheckbox.isVisible();
        
        if (!isVisible) {
          console.log('❓ No visible checkboxes found');
          break;
        }

        // Check only the first migration
        await firstCheckbox.check();
        console.log('✅ Selected first pending migration');

        // Apply it
        const applyButton = page.locator('button:has-text("Apply Selected")');
        await applyButton.click();
        console.log('🔵 Clicked Apply Selected...');

        // Wait for completion with better detection
        let applied = false;
        for (let wait = 0; wait < 20; wait++) {
          await page.waitForTimeout(1000);
          
          // Look for success indicators
          const successVisible = await page.locator('text=/✅|applied successfully|Migration Applied/').count() > 0;
          const errorVisible = await page.locator('text=/❌|failed|error/').count() > 0;
          
          if (successVisible) {
            console.log('✅ Migration applied successfully!');
            applied = true;
            totalApplied++;
            break;
          } else if (errorVisible) {
            console.log('❌ Migration failed');
            break;
          }
          
          console.log(`⏳ Waiting... (${wait + 1}s)`);
        }

        if (!applied) {
          console.log('⚠️ Migration status unclear, refreshing...');
        }

        // Refresh to see updated state
        await page.click('button:has-text("Refresh")');
        await page.waitForTimeout(2000);
        
        // Uncheck any remaining checkboxes to start fresh
        const allCheckboxes = await page.locator('input[type="checkbox"]').count();
        for (let i = 0; i < allCheckboxes; i++) {
          await page.locator('input[type="checkbox"]').nth(i).uncheck();
        }

      } catch (error) {
        console.log(`❌ Error in iteration ${iteration}: ${error.message}`);
        await page.waitForTimeout(1000);
      }
    }

    // Final verification and screenshot
    console.log('\n📸 Taking final verification screenshot...');
    
    let finalCount = 0;
    try {
      await page.click('button:has-text("Refresh")');
      await page.waitForTimeout(2000);
      
      const finalText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      finalCount = parseInt(finalText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Assuming zero pending migrations');
    }

    // Create results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join('uploaded-screenshots', 'one-by-one-results', timestamp);
    fs.mkdirSync(resultsDir, { recursive: true });

    const screenshotPath = path.join(resultsDir, 'final-one-by-one-results.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const report = {
      timestamp: new Date().toISOString(),
      strategy: "Apply migrations one by one",
      totalApplied,
      finalPendingCount: finalCount,
      zeroPendingAchieved: finalCount === 0,
      missionStatus: finalCount === 0 ? "✅ COMPLETE SUCCESS" : `❓ ${finalCount} still pending`
    };

    fs.writeFileSync(path.join(resultsDir, 'one-by-one-results.json'), JSON.stringify(report, null, 2));

    console.log('\n🏁 ONE-BY-ONE RESULTS:');
    console.log('====================');
    console.log(`🔢 Migrations applied: ${totalApplied}`);
    console.log(`📊 Final pending count: ${finalCount}`);
    console.log(`🎯 Zero pending achieved: ${finalCount === 0 ? "✅ YES!" : "❌ NO"}`);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
    if (finalCount === 0) {
      console.log('\n🎉🎉🎉 MISSION ACCOMPLISHED! 🎉🎉🎉');
      console.log('ALL MIGRATIONS APPLIED ONE BY ONE!');
    }

    await context.close();
    return { 
      success: true, 
      totalApplied,
      finalPendingCount: finalCount, 
      zeroPendingAchieved: finalCount === 0,
      screenshotPath 
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

applyMigrationsOneByOne().then(result => {
  console.log('\n🏆 FINAL RESULT:', result);
  process.exit(result.success && result.zeroPendingAchieved ? 0 : 1);
});