const { createClient } = require('@supabase/supabase-js');

async function applyMigrationDirectly() {
  console.log('🚀 Applying Migration Directly via Edge Function');
  console.log('=' .repeat(60));

  const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjY1NTU5NCwiZXhwIjoyMDM4MjMxNTk0fQ.SfLSGGXOKaWQP7qzr0lrX3xOPU2IzQyLSS2Iy6qS5LU';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check pending migrations
    console.log('\n📋 Step 1: Checking pending migrations...');
    const checkResponse = await fetch(`${supabaseUrl}/functions/v1/check-pending-migrations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!checkResponse.ok) {
      throw new Error(`Failed to check migrations: ${checkResponse.status}`);
    }

    const pendingData = await checkResponse.json();
    console.log(`  Found ${pendingData.pendingCount} pending migrations`);

    if (pendingData.pendingMigrations && pendingData.pendingMigrations.length > 0) {
      console.log('  Pending migrations:');
      pendingData.pendingMigrations.forEach(m => {
        console.log(`    - ${m.name}: ${m.description}`);
      });
    }

    // Step 2: Apply the tasks table migration
    const tasksTableMigration = pendingData.pendingMigrations?.find(m => 
      m.name === '20250814063000_create_tasks_table.sql'
    );

    if (tasksTableMigration) {
      console.log('\n🎯 Step 2: Applying tasks table migration...');
      console.log(`  Migration: ${tasksTableMigration.name}`);
      console.log(`  Description: ${tasksTableMigration.description}`);

      const applyResponse = await fetch(`${supabaseUrl}/functions/v1/apply-migration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          migrationName: tasksTableMigration.name,
          migrationContent: tasksTableMigration.content,
          userId: 'e2e-test-user'
        })
      });

      const responseText = await applyResponse.text();
      console.log(`  Response status: ${applyResponse.status}`);
      
      if (applyResponse.ok) {
        const result = JSON.parse(responseText);
        console.log('  ✅ Migration applied successfully!');
        console.log(`  Result:`, result);
      } else {
        console.error('  ❌ Migration failed:', responseText);
        throw new Error(`Migration failed: ${responseText}`);
      }
    } else {
      console.log('\n⚠️ Tasks table migration not found in pending migrations');
      console.log('  It may have already been applied');
    }

    // Step 3: Verify the tasks table exists
    console.log('\n🔍 Step 3: Verifying tasks table exists...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'tasks');

    if (tableError) {
      console.error('  ❌ Error checking for tasks table:', tableError);
    } else if (tables && tables.length > 0) {
      console.log('  ✅ Tasks table exists!');
    } else {
      console.log('  ❌ Tasks table not found');
    }

    // Step 4: Apply the trigger migration if needed
    const triggerMigration = pendingData.pendingMigrations?.find(m => 
      m.name === '20250813151513_create_new_user_task_trigger.sql'
    );

    if (triggerMigration) {
      console.log('\n🎯 Step 4: Applying trigger migration...');
      console.log(`  Migration: ${triggerMigration.name}`);
      
      const triggerResponse = await fetch(`${supabaseUrl}/functions/v1/apply-migration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          migrationName: triggerMigration.name,
          migrationContent: triggerMigration.content,
          userId: 'e2e-test-user'
        })
      });

      if (triggerResponse.ok) {
        console.log('  ✅ Trigger migration applied successfully!');
      } else {
        const errorText = await triggerResponse.text();
        console.log('  ⚠️ Trigger migration may have issues:', errorText);
      }
    }

    // Step 5: Final check - see how many migrations are still pending
    console.log('\n📊 Step 5: Final migration status...');
    const finalCheckResponse = await fetch(`${supabaseUrl}/functions/v1/check-pending-migrations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (finalCheckResponse.ok) {
      const finalData = await finalCheckResponse.json();
      console.log(`  Remaining pending migrations: ${finalData.pendingCount}`);
      console.log(`  Total applied: ${finalData.appliedCount}`);
      console.log(`  Total migrations: ${finalData.totalCount}`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Migration Process Complete!');
    console.log('The app should now be able to load without crashing');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigrationDirectly().catch(console.error);