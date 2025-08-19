const { chromium } = require('playwright');

/**
 * Force a migration check and see the response
 */
async function forceMigrationCheck() {
  console.log('🔧 Forcing Migration Check\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Execute migration check directly via console
    const migrationCheckResult = await page.evaluate(async () => {
      try {
        // Access Supabase from window
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        console.log('Invoking check-pending-migrations edge function...');
        
        // Call the edge function directly
        const { data, error } = await supabase.functions.invoke('check-pending-migrations', {
          body: {}
        });
        
        console.log('Edge function response:', { data, error });
        
        return { 
          success: !error,
          data,
          error: error?.message
        };
      } catch (err) {
        return { 
          success: false, 
          error: err.message,
          stack: err.stack
        };
      }
    });
    
    console.log('\n📊 Direct Migration Check Result:', JSON.stringify(migrationCheckResult, null, 2));
    
    // If successful, check what the response contains
    if (migrationCheckResult.success && migrationCheckResult.data) {
      console.log('\n✅ Migration Check Data:');
      console.log(`  - Has Pending: ${migrationCheckResult.data.hasPendingMigrations}`);
      console.log(`  - Pending Count: ${migrationCheckResult.data.pendingCount}`);
      console.log(`  - Total Count: ${migrationCheckResult.data.totalCount}`);
      console.log(`  - Applied Count: ${migrationCheckResult.data.appliedCount}`);
      
      if (migrationCheckResult.data.pendingMigrations) {
        console.log('\n📋 Pending Migrations:');
        migrationCheckResult.data.pendingMigrations.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m}`);
        });
      }
    }
    
    // Try to manually trigger UI update with migration data
    if (migrationCheckResult.data?.hasPendingMigrations) {
      console.log('\n🎨 Attempting to trigger UI update...');
      
      const uiUpdateResult = await page.evaluate((migrationData) => {
        // Try to trigger a React re-render with migration data
        window.__migrationData = migrationData;
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('migration-data-updated', { 
          detail: migrationData 
        }));
        
        return { 
          windowDataSet: true,
          eventDispatched: true 
        };
      }, migrationCheckResult.data);
      
      console.log('UI Update Result:', uiUpdateResult);
      
      // Wait and check if UI updated
      await page.waitForTimeout(2000);
      
      const uiState = await page.evaluate(() => {
        return {
          hasMigrationButton: Array.from(document.querySelectorAll('button'))
            .some(btn => btn.textContent?.toLowerCase().includes('migration')),
          hasPendingBadge: Array.from(document.querySelectorAll('*'))
            .some(el => el.textContent?.match(/\d+\s*pending/i))
        };
      });
      
      console.log('\n🎨 UI State After Update:', uiState);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'force-migration-check.png', fullPage: true });
    console.log('\n📸 Screenshot saved: force-migration-check.png');
    
  } catch (_error) {
    console.error('\n❌ Test failed:', error);
    await page.screenshot({ path: 'force-check-error.png' });
  } finally {
    await browser.close();
  }
}

forceMigrationCheck().catch(console.error);