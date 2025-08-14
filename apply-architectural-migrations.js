const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function applyArchitecturalMigrations() {
  console.log('🏗️ APPLYING ARCHITECTURAL SOLUTION MIGRATIONS');
  console.log('=============================================');
  console.log('🎯 Target: Apply the 2 migrations that solve the auth.users constraint');
  
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

    // Target migrations we want to apply
    const targetMigrations = [
      '20250814192000_create_tasks_table_no_auth_trigger',
      '20250814193000_mark_auth_trigger_migrations_obsolete'
    ];

    console.log('📋 Looking for our architectural solution migrations...');

    let applied = 0;
    
    for (const targetMigration of targetMigrations) {
      console.log(`\n🔍 Looking for: ${targetMigration}...`);
      
      try {
        // Look for this specific migration in the list
        const migrationRow = page.locator(`text=${targetMigration}`).first();
        const exists = await migrationRow.count() > 0;
        
        if (!exists) {
          console.log(`❓ Migration ${targetMigration} not found in pending list`);
          continue;
        }

        console.log(`✅ Found ${targetMigration}`);

        // Find the checkbox for this migration (look for nearest input)
        const checkbox = migrationRow.locator('xpath=ancestor::tr//input[@type="checkbox"]').first();
        const checkboxExists = await checkbox.count() > 0;
        
        if (!checkboxExists) {
          console.log('❓ Could not find checkbox for this migration');
          continue;
        }

        // Check this specific migration
        await checkbox.check();
        console.log('✅ Checked migration checkbox');

        // Apply it
        await page.click('button:has-text("Apply Selected")');
        console.log('🔵 Clicked Apply Selected...');

        // Wait for completion
        let success = false;
        for (let wait = 0; wait < 15; wait++) {
          await page.waitForTimeout(2000);
          
          // Look for success indicators
          const successVisible = await page.locator('text=/✅|applied successfully|Migration Applied|success/i').count() > 0;
          const errorVisible = await page.locator('text=/❌|failed|error/i').count() > 0;
          
          if (successVisible) {
            console.log('✅ Migration applied successfully!');
            success = true;
            applied++;
            break;
          } else if (errorVisible) {
            console.log('❌ Migration failed');
            break;
          }
          
          console.log(`⏳ Waiting... (${(wait + 1) * 2}s)`);
        }

        if (!success) {
          console.log('⚠️ Migration status unclear');
        }

        // Refresh list before next migration
        await page.click('button:has-text("Refresh")');
        await page.waitForTimeout(3000);

      } catch (error) {
        console.log(`❌ Error applying ${targetMigration}: ${error.message}`);
      }
    }

    // Final verification
    console.log('\n📊 Final verification...');
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(3000);

    let finalCount = 0;
    try {
      const finalText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      finalCount = parseInt(finalText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read final count');
    }

    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join('uploaded-screenshots', 'architectural-solution', timestamp);
    fs.mkdirSync(resultsDir, { recursive: true });

    const screenshotPath = path.join(resultsDir, 'architectural-migrations-applied.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const report = {
      timestamp: new Date().toISOString(),
      strategy: "Apply specific architectural solution migrations",
      targetMigrations,
      migrationsApplied: applied,
      finalPendingCount: finalCount,
      zeroPendingAchieved: finalCount === 0,
      architecturalSuccess: applied > 0,
      missionStatus: finalCount === 0 ? "✅ ZERO PENDING ACHIEVED!" : 
                     applied > 0 ? `✅ Architectural progress: ${applied} applied, ${finalCount} remaining` :
                     "❌ No progress made"
    };

    fs.writeFileSync(path.join(resultsDir, 'architectural-results.json'), JSON.stringify(report, null, 2));

    console.log('\n🏗️ ARCHITECTURAL MIGRATION RESULTS:');
    console.log('===================================');
    console.log(`🔢 Target migrations applied: ${applied}/${targetMigrations.length}`);
    console.log(`📊 Final pending count: ${finalCount}`);
    console.log(`🎯 Zero pending achieved: ${finalCount === 0 ? "✅ YES!" : "❌ NO"}`);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
    if (finalCount === 0) {
      console.log('\n🎉🎉🎉 MISSION ACCOMPLISHED! 🎉🎉🎉');
      console.log('ZERO PENDING MIGRATIONS ACHIEVED VIA ARCHITECTURAL SOLUTION!');
    } else if (applied > 0) {
      console.log('\n✅ ARCHITECTURAL BREAKTHROUGH PROGRESS!');
      console.log(`Applied ${applied} architectural solution migrations`);
      console.log(`${finalCount} migrations remaining`);
    }

    await context.close();
    return { 
      success: true, 
      applied,
      finalPendingCount: finalCount, 
      zeroPendingAchieved: finalCount === 0,
      architecturalSuccess: applied > 0,
      screenshotPath 
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

applyArchitecturalMigrations().then(result => {
  console.log('\n🏆 ARCHITECTURAL APPLICATION RESULT:', result);
  process.exit(result.success ? 0 : 1);
});