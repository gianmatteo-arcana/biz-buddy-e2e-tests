const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * E2E script to apply ALL pending migrations until zero remain
 * PROPERLY AUTHENTICATED using stored auth state
 */

async function applyMigrationsWithAuth() {
  console.log('🚀 Starting AUTHENTICATED Migration Application Process');
  console.log('=' .repeat(60));
  console.log('Goal: Apply all pending migrations until zero remain');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({
    headless: false, // Show browser for visibility
    slowMo: 500 // Slow down actions for visibility
  });

  // CRITICAL: Use stored authentication state
  const authFile = path.join(__dirname, '.auth/user-state.json');
  let context;
  
  if (fs.existsSync(authFile)) {
    console.log('✅ Using stored authentication from .auth/user-state.json');
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: authFile  // THIS IS THE KEY - Use existing auth!
    });
  } else {
    console.log('❌ ERROR: No authentication file found!');
    console.log('Please run the authentication setup first');
    process.exit(1);
  }

  const page = await context.newPage();

  try {
    // Navigate to Dev Toolkit standalone
    console.log('\n📍 Step 1: Navigating to Dev Toolkit (authenticated)...');
    await page.goto('http://localhost:8081/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });

    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if we're authenticated
    const authBadge = await page.locator('text=/Authenticated|Real Backend/i').first();
    if (await authBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Confirmed: User is authenticated');
    } else {
      console.log('⚠️ Warning: Authentication status unclear');
    }

    // Click on Migrations tab
    console.log('\n📍 Step 2: Clicking on Migrations tab...');
    
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
        console.log('\n📍 Step 4: Applying migrations (with authentication)...');
        
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
          console.log('   🎯 Clicking "Apply Selected" button (authenticated request)...');
          await applyButton.click();
          
          // Wait for migrations to apply
          console.log('   ⏳ Waiting for migrations to apply with self-healing...');
          
          // Wait longer for self-healing to potentially kick in
          await page.waitForTimeout(10000); // 10 seconds for self-healing
          
          // Check for success or healing messages
          const toastSelectors = [
            'text=/success|applied|complete|healed/i',
            'text=/🔧.*Healed/i',
            'text=/Migration.*Applied/i'
          ];
          
          for (const selector of toastSelectors) {
            const message = await page.locator(selector).first();
            if (await message.isVisible({ timeout: 2000 }).catch(() => false)) {
              const text = await message.textContent();
              console.log(`   📢 Message: ${text}`);
            }
          }
          
          // Check for error messages
          const errorMessage = await page.locator('text=/error|failed/i').first();
          if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
            const errorText = await errorMessage.textContent();
            console.log(`   ❌ Error detected: ${errorText}`);
            
            // Check if self-healing was attempted
            if (errorText.includes('healing')) {
              console.log('   🔧 Self-healing was attempted');
            }
          }
        } else {
          // Try individual Apply buttons
          console.log('   ℹ️ No batch apply found, trying individual apply buttons...');
          
          const applyButtons = await page.locator('button:has-text("Apply")').all();
          console.log(`   Found ${applyButtons.length} individual Apply buttons`);
          
          for (let i = 0; i < applyButtons.length; i++) {
            console.log(`   🎯 Applying migration ${i + 1} (authenticated)...`);
            await applyButtons[i].click();
            await page.waitForTimeout(5000); // Wait for potential self-healing
            
            // Check for healing indicator
            const healingMessage = await page.locator('text=/🔧|healing|healed/i').first();
            if (await healingMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
              console.log('   🔧 Self-healing activated for this migration');
            }
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
            console.log(`   ⚠️ Still ${finalCount} pending migrations.`);
            console.log('   📝 Note: This might require manual intervention if tables already exist.');
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
      path: path.join(screenshotDir, `migrations-authenticated-${timestamp}.png`),
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
      path: path.join(errorDir, `error-auth-${Date.now()}.png`),
      fullPage: true
    });
  } finally {
    console.log('\n' + '=' .repeat(60));
    console.log('Authenticated migration process complete');
    console.log('=' .repeat(60));
    
    // Keep browser open for 3 seconds to see final state
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

// Run the authenticated migration process
applyMigrationsWithAuth().catch(console.error);