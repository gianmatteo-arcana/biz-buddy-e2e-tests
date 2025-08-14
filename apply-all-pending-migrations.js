const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * E2E script to apply ALL pending migrations until zero remain
 * Uses Playwright to interact with the Dev Toolkit UI
 */

async function applyAllPendingMigrations() {
  console.log('🚀 Starting E2E Migration Application Process');
  console.log('=' .repeat(60));
  console.log('Goal: Apply all pending migrations until zero remain');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({
    headless: false, // Show browser for visibility
    slowMo: 500 // Slow down actions for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Navigate to Dev Toolkit standalone
    console.log('\n📍 Step 1: Navigating to Dev Toolkit...');
    await page.goto('http://localhost:8081/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Click on Migrations tab
    console.log('📍 Step 2: Clicking on Migrations tab...');
    
    // Try multiple selectors for the Migrations tab
    const migrationSelectors = [
      'button:has-text("Migrations")',
      'button[role="tab"]:has-text("Migrations")',
      '[data-testid="migrations-tab"]',
      'button >> text=/Migration/i'
    ];

    let tabClicked = false;
    for (const selector of migrationSelectors) {
      try {
        const tab = await page.locator(selector).first();
        if (await tab.isVisible({ timeout: 1000 })) {
          await tab.click();
          tabClicked = true;
          console.log('   ✓ Migrations tab clicked');
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!tabClicked) {
      console.log('   ℹ️ Migrations tab might already be selected or visible');
    }

    await page.waitForTimeout(2000);

    // Check for pending migrations
    console.log('\n📍 Step 3: Checking for pending migrations...');
    
    // Look for the "Pending Migrations" section
    const pendingSection = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/i').first();
    
    if (await pendingSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      const pendingText = await pendingSection.textContent();
      const pendingCount = pendingText.match(/\((\d+)\)/)?.[1] || '0';
      console.log(`   ✓ Found ${pendingCount} pending migrations`);

      if (pendingCount !== '0') {
        // Check if there's an "Apply Selected" button
        console.log('\n📍 Step 4: Applying migrations...');
        
        // First, check all checkboxes if they exist
        const checkboxes = await page.locator('input[type="checkbox"]').all();
        console.log(`   Found ${checkboxes.length} checkboxes`);
        
        for (let i = 0; i < checkboxes.length; i++) {
          const checkbox = checkboxes[i];
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            await checkbox.check();
            console.log(`   ✓ Checked migration ${i + 1}`);
          }
        }

        // Look for "Apply Selected" button
        const applyButton = await page.locator('button:has-text("Apply Selected")').first();
        
        if (await applyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('   🎯 Clicking "Apply Selected" button...');
          await applyButton.click();
          
          // Wait for migrations to apply
          console.log('   ⏳ Waiting for migrations to apply...');
          
          // Wait for either success message or the pending count to change
          await page.waitForTimeout(5000);
          
          // Check if there's a toast/success message
          const successMessage = await page.locator('text=/success|applied|complete/i').first();
          if (await successMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('   ✅ Migrations applied successfully!');
          }
        } else {
          // Try individual Apply buttons
          console.log('   ℹ️ No batch apply found, trying individual apply buttons...');
          
          const applyButtons = await page.locator('button:has-text("Apply")').all();
          console.log(`   Found ${applyButtons.length} individual Apply buttons`);
          
          for (let i = 0; i < applyButtons.length; i++) {
            console.log(`   🎯 Applying migration ${i + 1}...`);
            await applyButtons[i].click();
            await page.waitForTimeout(3000);
          }
        }

        // Refresh to check new status
        console.log('\n📍 Step 5: Refreshing to check status...');
        const refreshButton = await page.locator('button:has([class*="RefreshCw"])').first();
        if (await refreshButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await refreshButton.click();
          await page.waitForTimeout(2000);
        }

        // Final check
        console.log('\n📍 Step 6: Final verification...');
        const finalPendingSection = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/i').first();
        
        if (await finalPendingSection.isVisible({ timeout: 2000 }).catch(() => false)) {
          const finalText = await finalPendingSection.textContent();
          const finalCount = finalText.match(/\((\d+)\)/)?.[1] || '0';
          
          if (finalCount === '0') {
            console.log('   🎉 SUCCESS! All migrations applied. Zero pending migrations!');
          } else {
            console.log(`   ⚠️ Still ${finalCount} pending migrations. May need to run again.`);
          }
        }
      } else {
        console.log('   ✅ Already at zero pending migrations!');
      }
    } else {
      // Alternative: Check for "No pending migrations" message
      const noPendingMessage = await page.locator('text=/no.*pending.*migration/i').first();
      if (await noPendingMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   ✅ No pending migrations found - already at zero!');
      } else {
        console.log('   ⚠️ Could not determine migration status');
      }
    }

    // Take final screenshot
    console.log('\n📸 Taking final screenshot...');
    const screenshotDir = path.join(__dirname, 'test-screenshots', 'migration-results');
    fs.mkdirSync(screenshotDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    await page.screenshot({
      path: path.join(screenshotDir, `migrations-final-${timestamp}.png`),
      fullPage: false
    });
    
    console.log(`   ✓ Screenshot saved to ${screenshotDir}`);

    // Check applied migrations section
    const appliedSection = await page.locator('text=/Applied Migrations.*\\(\\d+\\)/i').first();
    if (await appliedSection.isVisible({ timeout: 1000 }).catch(() => false)) {
      const appliedText = await appliedSection.textContent();
      const appliedCount = appliedText.match(/\((\d+)\)/)?.[1] || '0';
      console.log(`\n📊 Final Status: ${appliedCount} migrations in applied history`);
    }

  } catch (error) {
    console.error('\n❌ Error during migration process:', error.message);
    
    // Take error screenshot
    const errorDir = path.join(__dirname, 'test-screenshots', 'errors');
    fs.mkdirSync(errorDir, { recursive: true });
    await page.screenshot({
      path: path.join(errorDir, `error-${Date.now()}.png`),
      fullPage: true
    });
  } finally {
    console.log('\n' + '=' .repeat(60));
    console.log('Migration process complete');
    console.log('=' .repeat(60));
    
    // Keep browser open for 3 seconds to see final state
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

// Run the migration process
applyAllPendingMigrations().catch(console.error);