const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * FINAL VERIFICATION - Check if migrations are no longer pending
 */

async function finalVerification() {
  console.log('🔍 Final Migration System Verification\n');
  console.log('='.repeat(60));
  
  const testRunId = `final-verification-${new Date().toISOString().replace(/[:.]/g, '-')}`;
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
    
    // Hard refresh to clear any cache
    await page.keyboard.press('Meta+Shift+R');
    await delay(3000);
    
    console.log('📍 Clicking Migrations tab...');
    await page.click('text=Migrations');
    await delay(2000);
    
    await page.screenshot({ path: path.join(testDir, '01-migrations-tab.png'), fullPage: true });
    
    // Check pending migrations count
    const pendingSection = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/').first();
    let pendingCount = -1;
    let pendingText = '';
    
    if (await pendingSection.isVisible()) {
      pendingText = await pendingSection.textContent();
      const match = pendingText.match(/\((\d+)\)/);
      if (match) {
        pendingCount = parseInt(match[1]);
      }
    }
    
    // Check applied migrations count
    const appliedSection = await page.locator('text=/Applied Migrations.*\\(\\d+\\)/').first();
    let appliedCount = -1;
    let appliedText = '';
    
    if (await appliedSection.isVisible()) {
      appliedText = await appliedSection.textContent();
      const match = appliedText.match(/\((\d+)\)/);
      if (match) {
        appliedCount = parseInt(match[1]);
      }
    }
    
    // Try to expand applied migrations to see the list
    try {
      await appliedSection.click();
      await delay(1000);
      await page.screenshot({ path: path.join(testDir, '02-applied-expanded.png'), fullPage: true });
      
      // Look for our specific migrations in the applied list
      const ourMigrations = [
        '20250813010809_demo_comment_update.sql',
        '20250813_000000_initial_schema.sql',
        '20250813_000001_create_exec_migration_function.sql',
        '20250813_100002_basic_security_rls.sql'
      ];
      
      console.log('\n📋 Checking for our migrations in Applied list:');
      for (const migration of ourMigrations) {
        const found = await page.locator(`text=${migration}`).count() > 0;
        console.log(`  ${found ? '✅' : '❌'} ${migration}`);
      }
    } catch (e) {
      // Applied section might not be expandable
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL VERIFICATION RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Pending Migrations: ${pendingCount} ${pendingText ? `(${pendingText})` : ''}`);
    console.log(`📊 Applied Migrations: ${appliedCount} ${appliedText ? `(${appliedText})` : ''}`);
    console.log('='.repeat(60));
    
    if (pendingCount === 0) {
      console.log('✅ SUCCESS! No pending migrations!');
      console.log('✅ The migration system is now completely clean');
      console.log('✅ All migrations have been properly handled');
      
      // Victory screenshot
      await page.screenshot({ path: path.join(testDir, '03-success-clean.png'), fullPage: true });
      
      return { success: true, pendingCount: 0, appliedCount };
      
    } else if (pendingCount > 0) {
      console.log(`⚠️ Still showing ${pendingCount} pending migrations`);
      console.log('\nPossible reasons:');
      console.log('1. Edge function not yet redeployed (wait 1-2 more minutes)');
      console.log('2. SQL not yet run in Supabase Dashboard');
      console.log('3. Browser cache (try hard refresh)');
      console.log('\nNext steps:');
      console.log('1. Run the SQL in MARK_MIGRATIONS_APPLIED.sql');
      console.log('2. Wait 2 minutes for edge function redeploy');
      console.log('3. Run this verification again');
      
      return { success: false, pendingCount, appliedCount };
      
    } else {
      console.log('❌ Could not determine migration counts');
      return { success: false, pendingCount: -1, appliedCount: -1 };
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

// Run verification with retry logic
async function runWithRetry() {
  console.log('🚀 Starting Final Verification Process');
  console.log('This will check if migrations are no longer pending\n');
  
  let attempt = 1;
  const maxAttempts = 3;
  const retryDelay = 60000; // 1 minute between retries
  
  while (attempt <= maxAttempts) {
    console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}`);
    
    const result = await finalVerification();
    
    if (result.success) {
      console.log('\n' + '🎉'.repeat(20));
      console.log('COMPLETE SUCCESS!');
      console.log('The migration system is now in a perfect clean state.');
      console.log('No more pending migrations!');
      console.log('🎉'.repeat(20));
      process.exit(0);
    }
    
    if (attempt < maxAttempts) {
      console.log(`\n⏳ Waiting ${retryDelay/1000} seconds before retry...`);
      console.log('(Edge function may still be deploying)');
      await delay(retryDelay);
    }
    
    attempt++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('❌ VERIFICATION FAILED after all attempts');
  console.log('Please:');
  console.log('1. Ensure SQL was run in Supabase Dashboard');
  console.log('2. Check Supabase Edge Functions dashboard for deployment status');
  console.log('3. Try running this script again in a few minutes');
  console.log('='.repeat(60));
}

// Execute
runWithRetry().catch(console.error);