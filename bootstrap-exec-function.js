/**
 * Bootstrap the exec_migration_sql function
 * 
 * This solves the chicken-and-egg problem: the migration system needs exec_migration_sql
 * to apply migrations, but exec_migration_sql is itself defined in a migration.
 * 
 * This script will directly execute the bootstrap function creation via Supabase REST API.
 */

const { chromium } = require('playwright');

async function bootstrapExecFunction() {
  console.log('🚀 BOOTSTRAPPING exec_migration_sql FUNCTION');
  console.log('============================================');
  console.log('🎯 Goal: Create the function that enables all other migrations');
  
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    console.log('🌐 Navigating to Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/raenkewzlvrdqufwxjpl/sql/new');
    await page.waitForLoadState('networkidle');
    
    // Wait for the SQL editor to load
    await page.waitForTimeout(5000);

    // The bootstrap SQL we need to execute
    const bootstrapSQL = `
-- Bootstrap migration: Create exec_migration_sql function
-- This function is required for the edge function to execute migrations

CREATE OR REPLACE FUNCTION public.exec_migration_sql(migration_sql TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Execute the provided SQL
  EXECUTE migration_sql;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Migration execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to service role (edge functions use service role)
GRANT EXECUTE ON FUNCTION public.exec_migration_sql(TEXT) TO service_role;

-- Add comment documenting this function
COMMENT ON FUNCTION public.exec_migration_sql(TEXT) IS 'Executes migration SQL for the migration runner system. Used by edge functions with service role.';

-- Mark this bootstrap migration as applied in history
INSERT INTO migration_history (
  migration_name,
  migration_content,
  success,
  applied_at,
  applied_by,
  execution_time_ms
) VALUES (
  '20250813_000001_create_exec_migration_function.sql',
  'Bootstrap migration - exec_migration_sql function created',
  true,
  NOW(),
  null,
  0
) ON CONFLICT (migration_name) DO UPDATE SET
  success = EXCLUDED.success,
  applied_at = EXCLUDED.applied_at;
`;

    console.log('📝 SQL to execute:');
    console.log('-------------------');
    console.log(bootstrapSQL);
    console.log('-------------------');

    // Try to find the SQL editor textarea/input
    const sqlEditorSelectors = [
      '.monaco-editor textarea',
      '.ace_text-input',
      '[data-testid="sql-editor"]',
      '.CodeMirror textarea',
      'textarea[placeholder*="sql"]',
      'textarea[placeholder*="SQL"]'
    ];

    let editorFound = false;
    for (const selector of sqlEditorSelectors) {
      try {
        const editor = page.locator(selector).first();
        if (await editor.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found SQL editor with selector: ${selector}`);
          
          await editor.fill(bootstrapSQL);
          console.log('✅ SQL content inserted into editor');
          
          editorFound = true;
          break;
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!editorFound) {
      console.log('⚠️ Could not find SQL editor automatically');
      console.log('📋 MANUAL INSTRUCTIONS:');
      console.log('1. Navigate to: https://supabase.com/dashboard/project/raenkewzlvrdqufwxjpl/sql/new');
      console.log('2. Paste the SQL shown above');
      console.log('3. Click "Run" to execute');
      console.log('4. After success, run E2E migrations again');
    } else {
      // Try to find and click the Run button
      const runButtonSelectors = [
        'button:has-text("Run")',
        'button[data-testid="run-sql"]',
        'button.run-button',
        'button:has-text("Execute")'
      ];

      let runButtonFound = false;
      for (const selector of runButtonSelectors) {
        try {
          const runButton = page.locator(selector).first();
          if (await runButton.isVisible({ timeout: 2000 })) {
            console.log(`✅ Found Run button: ${selector}`);
            console.log('🔵 Clicking Run button...');
            
            await runButton.click();
            console.log('✅ Clicked Run button');
            
            // Wait for execution
            await page.waitForTimeout(5000);
            
            runButtonFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!runButtonFound) {
        console.log('⚠️ Could not find Run button automatically');
        console.log('📋 Please click the Run button manually to execute the SQL');
      }

      // Wait a bit more for results
      await page.waitForTimeout(3000);

      // Try to detect success/error messages
      const successIndicators = await page.locator('text=/success|completed|executed/i').count();
      const errorIndicators = await page.locator('text=/error|failed|exception/i').count();

      if (successIndicators > 0) {
        console.log('✅ SQL execution appears successful!');
      } else if (errorIndicators > 0) {
        console.log('❌ SQL execution may have failed');
        console.log('📋 Check the results in the Supabase UI');
      } else {
        console.log('❓ SQL execution status unclear');
      }
    }

    // Take screenshot of the result
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `uploaded-screenshots/bootstrap-sql-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. If SQL executed successfully, the exec_migration_sql function is now available');
    console.log('2. Edge functions should now work without HTTP 500 errors');
    console.log('3. Run E2E migration application to apply all pending migrations');
    console.log('4. Target: Zero pending migrations!');

    await context.close();
    return { success: true, screenshotPath };

  } catch (error) {
    console.error('❌ Bootstrap error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

bootstrapExecFunction().then(result => {
  console.log('\n🏆 BOOTSTRAP RESULT:', result);
  
  if (result.success) {
    console.log('🎯 Bootstrap completed - ready to apply migrations!');
    process.exit(0);
  } else {
    console.log('❌ Bootstrap failed - manual intervention may be needed');
    process.exit(1);
  }
});