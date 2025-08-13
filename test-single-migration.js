const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * TEST SINGLE MIGRATION
 * Tests applying just the demo comment migration
 * This should work since it only adds comments
 */

async function testSingleMigration() {
  console.log('🧪 Testing single migration (demo comment)...');
  
  const testRunId = `test-single-migration-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const testDir = path.join(__dirname, testRunId);
  fs.mkdirSync(testDir, { recursive: true });
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1600, height: 1200 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser Console Error:', msg.text());
    }
  });
  
  try {
    console.log('📍 Step 1: Navigate to Dev Toolkit');
    await page.goto('http://localhost:8080/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });
    
    await delay(2000);
    await page.screenshot({ path: path.join(testDir, '01-dev-toolkit.png'), fullPage: true });
    
    console.log('📍 Step 2: Click Migrations tab');
    await page.click('text=Migrations');
    await delay(2000);
    await page.screenshot({ path: path.join(testDir, '02-migrations-tab.png'), fullPage: true });
    
    console.log('📍 Step 3: Select ONLY the demo comment migration');
    // Click on the first migration (demo comment)
    const firstMigration = await page.locator('text=20250813010809_demo_comment_update.sql').first();
    await firstMigration.click();
    await delay(500);
    
    // Make sure the second migration is NOT selected
    try {
      const secondCheckbox = await page.locator('text=20250813_000000_initial_schema.sql')
        .locator('..')
        .locator('input[type="checkbox"]:checked');
      if (await secondCheckbox.isVisible()) {
        await secondCheckbox.click(); // Uncheck it
        console.log('  Unchecked initial_schema migration');
      }
    } catch (e) {
      // It's not checked, which is what we want
    }
    
    await page.screenshot({ path: path.join(testDir, '03-single-migration-selected.png'), fullPage: true });
    
    console.log('📍 Step 4: Apply the single migration');
    const applyButton = await page.locator('button:has-text("Apply Selected")').first();
    const buttonText = await applyButton.textContent();
    console.log(`  Apply button says: "${buttonText}"`);
    
    await applyButton.click();
    console.log('  Clicked Apply button');
    
    // Wait for response
    await delay(5000);
    
    await page.screenshot({ path: path.join(testDir, '04-after-apply.png'), fullPage: true });
    
    console.log('📍 Step 5: Check for debug info');
    try {
      const debugButton = await page.locator('text="Show Debug Info"').first();
      if (await debugButton.isVisible()) {
        await debugButton.click();
        console.log('  Clicked Show Debug Info');
        await delay(1000);
        await page.screenshot({ path: path.join(testDir, '05-debug-info.png'), fullPage: true });
        
        // Try to read the debug info
        const debugContent = await page.locator('.debug-content, pre, code').first();
        if (await debugContent.isVisible()) {
          const debugText = await debugContent.textContent();
          console.log('📋 Debug Info:', debugText.substring(0, 500));
        }
      }
    } catch (e) {
      console.log('  No debug info button found');
    }
    
    console.log('📍 Step 6: Check result');
    
    // Look for any error messages
    const errorElements = await page.locator('text=/error|fail/i').all();
    if (errorElements.length > 0) {
      console.log('❌ Found error indicators:');
      for (const element of errorElements) {
        const text = await element.textContent();
        console.log(`  - ${text}`);
      }
    }
    
    // Look for success
    const successElements = await page.locator('text=/success|complete/i').all();
    if (successElements.length > 0) {
      console.log('✅ Found success indicators:');
      for (const element of successElements) {
        const text = await element.textContent();
        console.log(`  - ${text}`);
      }
    }
    
    console.log('📍 Step 7: Refresh and check if migration was applied');
    await page.reload();
    await delay(2000);
    
    await page.click('text=Migrations');
    await delay(2000);
    
    await page.screenshot({ path: path.join(testDir, '06-after-refresh.png'), fullPage: true });
    
    // Check if our migration moved to Applied section
    const appliedSection = await page.locator('text=Applied Migrations').first();
    const appliedText = await appliedSection.textContent();
    console.log(`  Applied section shows: ${appliedText}`);
    
    // Try to expand Applied Migrations if needed
    try {
      await appliedSection.click();
      await delay(1000);
      await page.screenshot({ path: path.join(testDir, '07-applied-expanded.png'), fullPage: true });
    } catch (e) {
      // May not be expandable
    }
    
    console.log('\n📊 Test Complete!');
    console.log(`📁 Screenshots saved to: ${testDir}`);
    
    return { success: true, testDir };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: path.join(testDir, 'ERROR-state.png'), fullPage: true });
    return { success: false, error: error.message, testDir };
    
  } finally {
    await browser.close();
  }
}

// Run the test
testSingleMigration().then(result => {
  if (result.success) {
    console.log('\n✅ Test completed successfully');
  } else {
    console.log('\n❌ Test failed:', result.error);
  }
  console.log(`\nView screenshots in: ${result.testDir}`);
}).catch(console.error);