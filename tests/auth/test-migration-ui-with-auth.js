const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * TEST MIGRATION UI WITH AUTHENTICATED USER
 * 
 * This test will:
 * 1. Load with proper authentication
 * 2. Navigate to Dev Toolkit
 * 3. Check authentication status
 * 4. Open Migrations tab
 * 5. Test the migration UI functionality
 */

async function testMigrationUIWithAuth() {
  console.log('🚀 Starting Migration UI Test with Authentication');
  
  const testRunId = `migration-ui-test-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const testDir = path.join(__dirname, testRunId);
  fs.mkdirSync(testDir, { recursive: true });
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  try {
    // Use stored authentication state
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1600, height: 1200 }
    });
    
    const page = await context.newPage();
    
    // Log console messages for debugging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('Error') || text.includes('Failed')) {
        console.log(`[CONSOLE ${type.toUpperCase()}]`, text);
      }
      if (text.includes('[MigrationRunner]') || text.includes('Edge function')) {
        console.log(`[CONSOLE]`, text);
      }
    });
    
    // Step 1: Navigate to the app
    console.log('📍 Step 1: Navigating to app');
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    await delay(2000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(testDir, '01-initial-load.png'), 
      fullPage: true 
    });
    
    // Step 2: Open Dev Toolkit
    console.log('📍 Step 2: Opening Dev Toolkit');
    const devToolkitButton = await page.locator('button:has-text("Dev Toolkit")').first();
    if (await devToolkitButton.isVisible()) {
      await devToolkitButton.click();
      console.log('✅ Clicked Dev Toolkit button');
      await delay(2000);
    } else {
      console.log('⚠️ Dev Toolkit button not found, may already be open');
    }
    
    // Step 3: Check authentication status
    console.log('📍 Step 3: Checking authentication status');
    const authBadge = await page.locator('text=/Authenticated|Demo mode/').first();
    if (await authBadge.isVisible()) {
      const authText = await authBadge.textContent();
      console.log(`🔐 Authentication status: ${authText}`);
      
      if (authText.includes('Demo mode')) {
        console.log('❌ ERROR: In Demo mode - not authenticated!');
        console.log('Please ensure .auth/user-state.json exists and is valid');
        throw new Error('Not authenticated - in Demo mode');
      }
    }
    
    await page.screenshot({ 
      path: path.join(testDir, '02-dev-toolkit.png'), 
      fullPage: true 
    });
    
    // Step 4: Click on Migrations tab
    console.log('📍 Step 4: Opening Migrations tab');
    const migrationsTab = await page.locator('button:has-text("Migrations")').first();
    if (await migrationsTab.isVisible()) {
      await migrationsTab.click();
      console.log('✅ Clicked Migrations tab');
      await delay(3000); // Give time for migrations to load
    } else {
      console.log('❌ Migrations tab not found');
      throw new Error('Migrations tab not found');
    }
    
    await page.screenshot({ 
      path: path.join(testDir, '03-migrations-tab.png'), 
      fullPage: true 
    });
    
    // Step 5: Check for pending migrations
    console.log('📍 Step 5: Checking for pending migrations');
    
    // Wait for either pending migrations or "No migrations found"
    try {
      await page.waitForSelector('text=/Pending Migrations|No migrations found/', { 
        timeout: 10000 
      });
    } catch (e) {
      console.log('⚠️ Timeout waiting for migration status');
    }
    
    // Check if there are pending migrations
    const pendingText = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/').first();
    if (await pendingText.isVisible()) {
      const text = await pendingText.textContent();
      const match = text.match(/\((\d+)\)/);
      const count = match ? parseInt(match[1]) : 0;
      console.log(`📊 Found ${count} pending migrations`);
      
      if (count > 0) {
        // Step 6: Test Apply button
        console.log('📍 Step 6: Testing Apply functionality');
        
        // Select migrations
        const checkboxes = await page.locator('input[type="checkbox"]').all();
        console.log(`Found ${checkboxes.length} checkboxes`);
        
        for (const checkbox of checkboxes) {
          if (!await checkbox.isChecked()) {
            await checkbox.click();
            await delay(200);
          }
        }
        
        await page.screenshot({ 
          path: path.join(testDir, '04-migrations-selected.png'), 
          fullPage: true 
        });
        
        // Find and click Apply button
        const applyButton = await page.locator('button:has-text("Apply")').first();
        if (await applyButton.isVisible() && !await applyButton.isDisabled()) {
          const buttonText = await applyButton.textContent();
          console.log(`🔘 Found Apply button: "${buttonText}"`);
          
          // Click Apply
          await applyButton.click();
          console.log('✅ Clicked Apply button');
          
          // Wait for processing
          console.log('⏳ Waiting for migrations to apply...');
          await delay(10000); // Give enough time for edge functions
          
          await page.screenshot({ 
            path: path.join(testDir, '05-after-apply.png'), 
            fullPage: true 
          });
          
          // Check final state
          const finalPendingText = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/').first();
          if (await finalPendingText.isVisible()) {
            const finalText = await finalPendingText.textContent();
            const finalMatch = finalText.match(/\((\d+)\)/);
            const finalCount = finalMatch ? parseInt(finalMatch[1]) : 0;
            console.log(`📊 Final state: ${finalCount} pending migrations`);
            
            if (finalCount === 0) {
              console.log('✅ SUCCESS: All migrations applied!');
            } else if (finalCount < count) {
              console.log(`⚠️ PARTIAL: Applied ${count - finalCount} of ${count} migrations`);
            } else {
              console.log('❌ FAILED: Migrations were not applied');
            }
          }
        } else {
          console.log('⚠️ Apply button not available');
        }
      }
    } else {
      const noMigrationsText = await page.locator('text="No migrations found"').first();
      if (await noMigrationsText.isVisible()) {
        console.log('✅ No pending migrations - system is up to date');
      } else {
        console.log('⚠️ Could not determine migration status');
      }
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: path.join(testDir, '06-final-state.png'), 
      fullPage: true 
    });
    
    console.log(`\n📂 Test results saved to: ${testDir}`);
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testMigrationUIWithAuth().catch(console.error);