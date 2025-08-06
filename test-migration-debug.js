const { chromium } = require('playwright');

/**
 * Debug migration detection issue
 */
async function debugMigrations() {
  console.log('🔍 Debugging Migration Detection\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`[Console ${msg.type()}] ${msg.text()}`);
  });
  
  try {
    console.log('📍 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for initial load
    await page.waitForTimeout(5000);
    
    // Try to check migration history directly
    const migrationCheck = await page.evaluate(async () => {
      try {
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        // Try to query migration_history table directly
        console.log('Checking migration_history table...');
        const { data: history, error: historyError } = await supabase
          .from('migration_history')
          .select('migration_name, applied_at, success')
          .order('applied_at', { ascending: false })
          .limit(10);
        
        // Check specific migrations
        const agentMigrations = [
          '20250806000001_001_enhance_tasks_table.sql',
          '20250806000002_002_create_task_ui_augmentations.sql',
          '20250806000003_003_create_task_agent_contexts.sql',
          '20250806000004_004_create_task_orchestration_plans.sql',
          '20250806000005_005_add_task_indexes_rls.sql',
          '20250806000006_006_agent_orchestration_tables.sql'
        ];
        
        const appliedMigrations = history ? history.map(h => h.migration_name) : [];
        const pendingAgentMigrations = agentMigrations.filter(m => !appliedMigrations.includes(m));
        
        return {
          historyError: historyError?.message,
          totalInHistory: history?.length || 0,
          recentMigrations: history?.slice(0, 5).map(h => ({
            name: h.migration_name,
            applied: h.applied_at,
            success: h.success
          })),
          agentMigrationsStatus: {
            total: agentMigrations.length,
            pending: pendingAgentMigrations,
            applied: agentMigrations.filter(m => appliedMigrations.includes(m))
          }
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    });
    
    console.log('\n📊 Migration History Check:', JSON.stringify(migrationCheck, null, 2));
    
    // Also check if tables exist
    const tableCheck = await page.evaluate(async () => {
      try {
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        // Try to query the agent tables
        const tables = [
          'task_contexts',
          'ui_augmentation_requests', 
          'ui_augmentation_responses',
          'agent_audit_trail'
        ];
        
        const tableStatus = {};
        
        for (const table of tables) {
          try {
            const { count, error } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            
            tableStatus[table] = {
              exists: !error,
              error: error?.message,
              count: count || 0
            };
          } catch (e) {
            tableStatus[table] = {
              exists: false,
              error: e.message
            };
          }
        }
        
        return tableStatus;
      } catch (err) {
        return { error: err.message };
      }
    });
    
    console.log('\n📊 Table Existence Check:', JSON.stringify(tableCheck, null, 2));
    
    // Check edge function response directly
    console.log('\n🔧 Calling edge function directly...');
    const edgeFunctionResponse = await page.evaluate(async () => {
      try {
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        const { data, error } = await supabase.functions.invoke('check-pending-migrations', {
          body: {}
        });
        
        return { data, error: error?.message };
      } catch (err) {
        return { error: err.message };
      }
    });
    
    console.log('\n📡 Edge Function Response:', JSON.stringify(edgeFunctionResponse, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'migration-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved: migration-debug.png');
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    await page.screenshot({ path: 'debug-error.png' });
  } finally {
    await browser.close();
  }
}

debugMigrations().catch(console.error);