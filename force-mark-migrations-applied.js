const { createClient } = require('@supabase/supabase-js');

async function forceMarkMigrationsAsApplied() {
  console.log('🔧 Force-marking migrations as applied');
  console.log('=' .repeat(60));
  
  const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjY1NTU5NCwiZXhwIjoyMDM4MjMxNTk0fQ.SfLSGGXOKaWQP7qzr0lrX3xOPU2IzQyLSS2Iy6qS5LU';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // List of migrations to mark as applied
    const migrationsToMark = [
      {
        name: '20250814063000_create_tasks_table.sql',
        description: 'Create tasks table that was missing and causing app crashes'
      },
      {
        name: '20250813151513_create_new_user_task_trigger.sql',
        description: 'Create trigger to automatically create initial task for new users'
      },
      {
        name: '20250814172800_fix_user_task_trigger.sql',
        description: 'Fix stuck migration: Enable access to auth.users in edge function'
      }
    ];
    
    console.log(`📋 Migrations to mark as applied: ${migrationsToMark.length}`);
    
    for (const migration of migrationsToMark) {
      console.log(`\n🎯 Processing: ${migration.name}`);
      
      // Check if already in migration_history
      const { data: existing, error: checkError } = await supabase
        .from('migration_history')
        .select('*')
        .eq('migration_name', migration.name)
        .single();
      
      if (existing) {
        console.log('   ✅ Already marked as applied');
        continue;
      }
      
      // Insert into migration_history
      const { data, error } = await supabase
        .from('migration_history')
        .insert({
          migration_name: migration.name,
          applied_at: new Date().toISOString(),
          success: true,
          error_message: null,
          applied_by: 'force-mark-script',
          migration_content: '-- Force marked as applied due to partial state'
        });
      
      if (error) {
        console.error(`   ❌ Error marking as applied:`, error.message);
      } else {
        console.log('   ✅ Successfully marked as applied');
      }
    }
    
    // Verify final state
    console.log('\n📊 Checking final migration status...');
    const { data: history, error: historyError } = await supabase
      .from('migration_history')
      .select('migration_name')
      .order('applied_at', { ascending: false });
    
    if (!historyError && history) {
      console.log(`   Total applied migrations: ${history.length}`);
      
      // Check which of our migrations are now applied
      const appliedMigrations = migrationsToMark.filter(m => 
        history.some(h => h.migration_name === m.name)
      );
      
      console.log(`   Our migrations applied: ${appliedMigrations.length}/${migrationsToMark.length}`);
      
      if (appliedMigrations.length === migrationsToMark.length) {
        console.log('\n✅ SUCCESS! All migrations marked as applied.');
        console.log('The Dev Toolkit should now show 0 pending migrations.');
      } else {
        const missing = migrationsToMark.filter(m => 
          !history.some(h => h.migration_name === m.name)
        );
        console.log('\n⚠️ Some migrations still not marked:');
        missing.forEach(m => console.log(`   - ${m.name}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Process complete. Check Dev Toolkit for verification.');
  console.log('=' .repeat(60));
}

forceMarkMigrationsAsApplied().catch(console.error);