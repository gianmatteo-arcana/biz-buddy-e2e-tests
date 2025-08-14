const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function applyEachMigrationIndividually() {
  console.log('🎯 APPLYING EACH MIGRATION INDIVIDUALLY');
  console.log('======================================');
  console.log('💡 Strategy: Try each of the 5 migrations one by one');
  
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

    // Get initial count
    let initialCount = 0;
    try {
      const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      initialCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
      console.log(`📊 Starting with ${initialCount} pending migrations`);
    } catch (e) {
      console.log('Could not read initial count');
    }

    if (initialCount === 0) {
      console.log('🎉 Already at zero pending migrations!');
      return { success: true, zeroPending: true };
    }

    let totalApplied = 0;
    const maxMigrations = Math.min(initialCount, 10); // Safety limit

    // Try each migration checkbox individually
    for (let migrationIndex = 0; migrationIndex < maxMigrations; migrationIndex++) {
      console.log(`\n🔄 Trying migration ${migrationIndex + 1}/${maxMigrations}...`);

      try {
        // Refresh to get current state
        await page.click('button:has-text("Refresh")');
        await page.waitForTimeout(3000);

        // Check current count
        let currentCount = 0;
        try {
          const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
          currentCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
          console.log(`📊 Current pending: ${currentCount}`);
        } catch (e) {
          console.log('Could not read current count');
        }

        if (currentCount === 0) {
          console.log('🎉 ZERO PENDING ACHIEVED!');
          break;
        }

        // Uncheck all checkboxes first
        const allCheckboxes = await page.locator('input[type="checkbox"]').count();
        console.log(`📋 Found ${allCheckboxes} checkboxes`);
        
        for (let i = 0; i < allCheckboxes; i++) {
          await page.locator('input[type="checkbox"]').nth(i).uncheck();
        }

        // Check the specific migration we want to try (cycling through available ones)
        const targetIndex = migrationIndex % allCheckboxes;
        if (allCheckboxes > 0) {
          await page.locator('input[type="checkbox"]').nth(targetIndex).check();
          console.log(`✅ Selected migration at index ${targetIndex}`);
          
          // Try to get the migration name for logging
          try {
            const migrationRow = page.locator('input[type="checkbox"]').nth(targetIndex).locator('xpath=ancestor::tr');
            const migrationText = await migrationRow.textContent();
            if (migrationText && migrationText.includes('.sql')) {
              const sqlMatch = migrationText.match(/(\d+_[^.]+\.sql)/);
              if (sqlMatch) {
                console.log(`📝 Attempting: ${sqlMatch[1]}`);
              }
            }
          } catch (e) {
            // Ignore errors in getting migration name
          }
        } else {
          console.log('❌ No checkboxes available');
          continue;
        }

        // Apply this specific migration
        await page.click('button:has-text("Apply Selected")');
        console.log('🔵 Applied selected migration...');

        // Wait for result
        let migrationWorked = false;
        for (let wait = 0; wait < 15; wait++) {
          await page.waitForTimeout(2000);
          
          // Check for success indicators
          const successCount = await page.locator('text=/✅.*applied|Migration Applied|successfully applied/i').count();
          
          if (successCount > 0) {
            console.log('✅ Migration appears to have worked!');
            migrationWorked = true;
            totalApplied++;
            break;
          }
          
          console.log(`⏳ Waiting... (${(wait + 1) * 2}s)`);
        }

        if (!migrationWorked) {
          console.log('❓ Migration status unclear');
        }

        // Short pause before next migration
        await page.waitForTimeout(3000);

      } catch (error) {
        console.log(`❌ Error trying migration ${migrationIndex + 1}: ${error.message}`);
      }
    }

    // Final verification
    console.log('\n📊 FINAL CHECK...');
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(5000);

    let finalCount = 0;
    try {
      const finalText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      finalCount = parseInt(finalText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read final count');
    }

    // Take final screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `uploaded-screenshots/individual-migration-results-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const results = {
      timestamp: new Date().toISOString(),
      strategy: "Apply each migration individually",
      initialCount,
      finalCount,
      totalApplied,
      zeroPendingAchieved: finalCount === 0,
      progress: initialCount - finalCount
    };

    fs.writeFileSync(screenshotPath.replace('.png', '-results.json'), JSON.stringify(results, null, 2));

    console.log('\n🏁 INDIVIDUAL MIGRATION RESULTS:');
    console.log('================================');
    console.log(`📊 Initial pending: ${initialCount}`);
    console.log(`📊 Final pending: ${finalCount}`);
    console.log(`📈 Total applied: ${totalApplied}`);
    console.log(`📈 Net progress: ${initialCount - finalCount}`);
    console.log(`🎯 Zero pending achieved: ${finalCount === 0 ? "✅ YES!" : "❌ NO"}`);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
    if (finalCount === 0) {
      console.log('\n🎉🎉🎉 MISSION ACCOMPLISHED! 🎉🎉🎉');
      console.log('ALL MIGRATIONS APPLIED INDIVIDUALLY!');
      console.log('ZERO PENDING MIGRATIONS ACHIEVED!');
    } else if (finalCount < initialCount) {
      console.log('\n✅ PROGRESS MADE!');
      console.log(`Successfully reduced from ${initialCount} to ${finalCount} pending migrations`);
      console.log('Some migrations may need additional fixes or different approaches');
    } else {
      console.log('\n📋 No net progress - migrations may have other issues');
    }

    await context.close();
    return { 
      success: true, 
      initialCount,
      finalCount,
      totalApplied,
      zeroPendingAchieved: finalCount === 0,
      screenshotPath 
    };

  } catch (error) {
    console.error('❌ Individual migration error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

applyEachMigrationIndividually().then(result => {
  console.log('\n🏆 INDIVIDUAL MIGRATION RESULT:', result);
  
  if (result.zeroPendingAchieved) {
    console.log('🎉 PERFECT SUCCESS: ZERO PENDING ACHIEVED BY TRYING EACH MIGRATION!');
    process.exit(0);
  } else if (result.finalCount < result.initialCount) {
    console.log('✅ GOOD PROGRESS: Successfully applied some migrations individually');
    process.exit(0);
  } else {
    console.log('📋 Individual approach complete - may need additional debugging');
    process.exit(0);
  }
});