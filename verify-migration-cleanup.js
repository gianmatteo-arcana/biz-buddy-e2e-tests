const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * VERIFY MIGRATION CLEANUP
 * 
 * After running FINAL_MIGRATION_CLEANUP.sql in Supabase,
 * this script verifies that the migrations are no longer pending
 */

async function verifyMigrationCleanup() {
  console.log('🔍 Verifying Migration Cleanup...\n');
  
  const testRunId = `verify-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const testDir = path.join(__dirname, testRunId);
  fs.mkdirSync(testDir, { recursive: true });
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300 
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1600, height: 1200 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Opening Dev Toolkit...');
    await page.goto('http://localhost:8080/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });
    await delay(2000);
    
    console.log('📍 Opening Migrations tab...');
    await page.click('text=Migrations');
    await delay(2000);
    
    await page.screenshot({ path: path.join(testDir, '01-migrations-tab.png'), fullPage: true });
    
    // Check pending migrations count
    const pendingSection = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/').first();
    let pendingCount = 'unknown';
    
    if (await pendingSection.isVisible()) {
      const pendingText = await pendingSection.textContent();
      const match = pendingText.match(/\((\d+)\)/);
      if (match) {
        pendingCount = parseInt(match[1]);
      }
    }
    
    // Check applied migrations count
    const appliedSection = await page.locator('text=/Applied Migrations.*\\(\\d+\\)/').first();
    let appliedCount = 'unknown';
    
    if (await appliedSection.isVisible()) {
      const appliedText = await appliedSection.textContent();
      const match = appliedText.match(/\((\d+)\)/);
      if (match) {
        appliedCount = parseInt(match[1]);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION STATUS REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Pending Migrations: ${pendingCount}`);
    console.log(`📊 Applied Migrations: ${appliedCount}`);
    console.log('='.repeat(60));
    
    if (pendingCount === 0) {
      console.log('✅ SUCCESS: No pending migrations!');
      console.log('✅ The migration system is now clean');
      
      // Take victory screenshot
      await page.screenshot({ path: path.join(testDir, '02-success-clean-state.png'), fullPage: true });
      
      return { success: true, clean: true };
    } else if (pendingCount === 2) {
      console.log('⚠️ Both migrations are still pending');
      console.log('\n📋 ACTION REQUIRED:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run the contents of FINAL_MIGRATION_CLEANUP.sql');
      console.log('3. Then run this verification script again');
      console.log('\nFile location: ' + path.join(__dirname, 'FINAL_MIGRATION_CLEANUP.sql'));
      
      return { success: false, clean: false, actionRequired: true };
    } else {
      console.log(`⚠️ ${pendingCount} migration(s) still pending`);
      
      // Open debug panel for more info
      const debugButton = await page.locator('text="Show Debug Info"').first();
      if (await debugButton.isVisible()) {
        await debugButton.click();
        await delay(1500);
        await page.screenshot({ path: path.join(testDir, '03-debug-info.png'), fullPage: true });
      }
      
      return { success: false, clean: false };
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    await page.screenshot({ path: path.join(testDir, 'ERROR-state.png'), fullPage: true });
    return { success: false, error: error.message };
    
  } finally {
    await browser.close();
    console.log(`\n📁 Screenshots saved to: ${testDir}`);
  }
}

// Run verification
console.log('='.repeat(60));
console.log('MIGRATION CLEANUP VERIFICATION');
console.log('='.repeat(60) + '\n');

verifyMigrationCleanup().then(result => {
  console.log('\n' + '='.repeat(60));
  
  if (result.clean) {
    console.log('🎉 COMPLETE SUCCESS!');
    console.log('The migration system is now in a clean state.');
    console.log('All pending migrations have been resolved.');
  } else if (result.actionRequired) {
    console.log('⚠️ ACTION REQUIRED');
    console.log('Please run the SQL cleanup script in Supabase Dashboard.');
  } else {
    console.log('❌ VERIFICATION FAILED');
    console.log('The migration system still has issues.');
  }
  
  console.log('='.repeat(60));
}).catch(console.error);