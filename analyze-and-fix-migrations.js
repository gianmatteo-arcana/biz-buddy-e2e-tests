const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ANALYZE AND FIX MIGRATIONS THROUGH UI
 * 
 * This script will:
 * 1. Open Dev Toolkit
 * 2. Analyze the migration state
 * 3. Use the debug panel to understand issues
 * 4. Take action to resolve
 */

async function analyzeAndFixMigrations() {
  console.log('🔍 Starting Migration Analysis and Fix...\n');
  
  const testRunId = `migration-fix-${new Date().toISOString().replace(/[:.]/g, '-')}`;
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
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (msg.type() === 'error' && !text.includes('X-Frame-Options')) {
      console.log('❌ Console Error:', text);
    }
  });
  
  try {
    // Step 1: Navigate to Dev Toolkit
    console.log('📍 Step 1: Opening Dev Toolkit...');
    await page.goto('http://localhost:8080/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });
    await delay(2000);
    await page.screenshot({ path: path.join(testDir, '01-dev-toolkit.png'), fullPage: true });
    
    // Step 2: Open Migrations tab
    console.log('📍 Step 2: Opening Migrations tab...');
    await page.click('text=Migrations');
    await delay(2000);
    await page.screenshot({ path: path.join(testDir, '02-migrations-tab.png'), fullPage: true });
    
    // Step 3: Open Debug Panel
    console.log('📍 Step 3: Opening Debug Panel...');
    const debugButton = await page.locator('text="Show Debug Info"').first();
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await delay(1500);
      await page.screenshot({ path: path.join(testDir, '03-debug-panel.png'), fullPage: true });
      
      // Analyze debug panel content
      console.log('📊 Analyzing Debug Panel...');
      
      // Look for failed migrations
      const failedMigrations = await page.locator('text="Failed migrations:"').first();
      if (await failedMigrations.isVisible()) {
        const failedList = await page.locator('.failed-migration, li:has-text("Failed")').all();
        console.log(`  Found ${failedList.length} failed migrations`);
        
        for (const failed of failedList) {
          const text = await failed.textContent();
          console.log(`  ❌ ${text}`);
        }
      }
      
      // Check table status
      const tableStatus = await page.locator('text="Agent Tables Status"').first();
      if (await tableStatus.isVisible()) {
        console.log('\n📊 Agent Tables Status:');
        const tableErrors = await page.locator('[class*="error"]:has-text("task_contexts"), [class*="error"]:has-text("table")').all();
        for (const error of tableErrors) {
          const text = await error.textContent();
          console.log(`  ⚠️ ${text}`);
        }
      }
    }
    
    // Step 4: Try to apply ONLY the demo comment migration
    console.log('\n📍 Step 4: Attempting to apply demo_comment migration only...');
    
    // First, refresh to ensure clean state
    await page.reload();
    await delay(2000);
    await page.click('text=Migrations');
    await delay(2000);
    
    // Select ONLY the demo comment migration
    console.log('  Selecting demo_comment migration...');
    
    // Look for the checkbox or clickable area for demo migration
    const demoMigration = await page.locator('text=20250813010809_demo_comment_update.sql').first();
    if (await demoMigration.isVisible()) {
      // Click on the migration row to select it
      await demoMigration.click();
      await delay(500);
      
      // Make sure initial_schema is NOT selected
      try {
        // Look for initial schema and uncheck if needed
        const initialSchema = await page.locator('text=20250813_000000_initial_schema.sql')
          .locator('..')
          .locator('input[type="checkbox"]:checked').first();
        
        if (await initialSchema.isVisible()) {
          await initialSchema.click(); // Uncheck it
          console.log('  Unchecked initial_schema migration');
        }
      } catch (e) {
        // Not selected, which is good
      }
      
      await page.screenshot({ path: path.join(testDir, '04-demo-selected.png'), fullPage: true });
      
      // Try to apply
      const applyButton = await page.locator('button:has-text("Apply Selected")').first();
      if (await applyButton.isVisible() && !await applyButton.isDisabled()) {
        const buttonText = await applyButton.textContent();
        console.log(`  Apply button shows: "${buttonText}"`);
        
        if (buttonText.includes('(1)')) {
          console.log('  ✅ Only one migration selected, applying...');
          await applyButton.click();
          await delay(5000); // Wait for processing
          
          await page.screenshot({ path: path.join(testDir, '05-after-apply.png'), fullPage: true });
          
          // Check result
          const errors = await page.locator('text=/error|fail/i').all();
          const success = await page.locator('text=/success|applied successfully/i').all();
          
          if (errors.length > 0) {
            console.log('  ❌ Application failed');
            for (const error of errors) {
              const text = await error.textContent();
              if (!text.includes('Failed migrations:')) {
                console.log(`    Error: ${text}`);
              }
            }
          }
          
          if (success.length > 0) {
            console.log('  ✅ Application might have succeeded');
          }
        }
      }
    }
    
    // Step 5: Final check of migration state
    console.log('\n📍 Step 5: Final migration state check...');
    
    await page.reload();
    await delay(2000);
    await page.click('text=Migrations');
    await delay(2000);
    
    // Open debug panel again
    const finalDebugButton = await page.locator('text="Show Debug Info"').first();
    if (await finalDebugButton.isVisible()) {
      await finalDebugButton.click();
      await delay(1500);
      await page.screenshot({ path: path.join(testDir, '06-final-state.png'), fullPage: true });
    }
    
    // Check pending count
    const pendingSection = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/').first();
    if (await pendingSection.isVisible()) {
      const pendingText = await pendingSection.textContent();
      console.log(`\n📊 Final State: ${pendingText}`);
      
      const match = pendingText.match(/\((\d+)\)/);
      if (match) {
        const count = parseInt(match[1]);
        if (count === 0) {
          console.log('✅ SUCCESS: All migrations applied!');
        } else if (count === 1) {
          console.log('⚠️ One migration still pending (likely initial_schema which conflicts)');
        } else {
          console.log(`⚠️ ${count} migrations still pending`);
        }
      }
    }
    
    // Step 6: Document the solution
    console.log('\n📍 Step 6: Documenting solution...');
    
    const solution = `
# Migration Resolution Report

## Problem
- Two migrations were stuck as "Pending"
- Previous attempts failed due to edge function issues
- Tables already exist for initial_schema migration

## Resolution Steps Taken
1. Applied bootstrap function (exec_migration_sql) ✅
2. Attempted to apply demo_comment migration separately
3. Initial_schema cannot be applied (tables exist)

## Recommendations
1. Mark initial_schema as already applied in database
2. Remove it from pending migrations registry
3. Or create a cleanup migration that handles existing tables

## Current State
- Demo comment migration: ${pendingText?.includes('(2)') ? 'Still pending' : 'Possibly applied'}
- System is functional but needs manual cleanup

## SQL to Run in Supabase Dashboard:
\`\`\`sql
-- Mark initial_schema as already applied
INSERT INTO migration_history (
  migration_name,
  migration_content,
  success,
  applied_at,
  applied_by
) VALUES (
  '20250813_000000_initial_schema.sql',
  '-- Tables already existed, marked as applied retroactively',
  true,
  NOW(),
  'manual-cleanup'
) ON CONFLICT (migration_name) 
DO UPDATE SET 
  success = true,
  applied_at = NOW();

-- Apply demo comment migration
COMMENT ON TABLE public.businesses IS 'Core business entities - Updated via E2E migration demo';
COMMENT ON COLUMN public.businesses.name IS 'Business name - Migration system demo verified';
COMMENT ON TABLE public.migration_history IS 'Migration tracking system - E2E verified';

-- Mark demo migration as applied
INSERT INTO migration_history (
  migration_name,
  migration_content,
  success,
  applied_at,
  applied_by
) VALUES (
  '20250813010809_demo_comment_update.sql',
  '-- Demo comment migration',
  true,
  NOW(),
  'manual-cleanup'
) ON CONFLICT (migration_name) 
DO UPDATE SET 
  success = true,
  applied_at = NOW();
\`\`\`
`;
    
    fs.writeFileSync(path.join(testDir, 'SOLUTION.md'), solution);
    console.log('📄 Solution documented in SOLUTION.md');
    
    console.log('\n✅ Analysis complete!');
    console.log(`📁 Evidence saved to: ${testDir}`);
    
    return {
      success: true,
      testDir,
      pendingCount: pendingText
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    await page.screenshot({ path: path.join(testDir, 'ERROR-state.png'), fullPage: true });
    return {
      success: false,
      error: error.message,
      testDir
    };
    
  } finally {
    await browser.close();
  }
}

// Run the analysis
console.log('='.repeat(60));
console.log('MIGRATION ANALYSIS AND FIX');
console.log('='.repeat(60) + '\n');

analyzeAndFixMigrations().then(result => {
  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log('✅ Analysis completed successfully');
    console.log(`📁 Check ${result.testDir} for details`);
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run the SQL in SOLUTION.md in Supabase Dashboard');
    console.log('2. Then verify with: node test-migration-apply-iterative.js');
  } else {
    console.log('❌ Analysis failed:', result.error);
  }
  console.log('='.repeat(60));
}).catch(console.error);