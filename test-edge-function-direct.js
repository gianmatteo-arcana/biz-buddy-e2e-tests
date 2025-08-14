const { createClient } = require('@supabase/supabase-js');

async function testEdgeFunction() {
  console.log('🔍 Testing apply-migration edge function directly...');

  const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NTU1OTQsImV4cCI6MjAzODIzMTU5NH0.O5Y9J2DP99bCxO7OTy-N8VtACgHt4JYD3aH5eRgYh2M';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjY1NTU5NCwiZXhwIjoyMDM4MjMxNTk0fQ.SfLSGGXOKaWQP7qzr0lrX3xOPU2IzQyLSS2Iy6qS5LU';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // First let's check if the exec_migration_sql function exists
  console.log('1. Checking if exec_migration_sql function exists...');
  try {
    const { data, error } = await supabase.rpc('exec_migration_sql', {
      migration_sql: 'SELECT 1 as test;'
    });
    
    if (error) {
      console.error('❌ exec_migration_sql function error:', error);
      if (error.message.includes('does not exist')) {
        console.log('💡 exec_migration_sql function does not exist - this is the root cause!');
        console.log('🔧 Need to create the exec_migration_sql function first...');
        
        // Try to create the function
        console.log('\n2. Creating exec_migration_sql function...');
        const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_migration_sql(migration_sql TEXT)
RETURNS TABLE(result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    exec_result JSONB;
BEGIN
    -- Execute the migration SQL dynamically
    EXECUTE migration_sql;
    
    -- Return success result
    RETURN QUERY SELECT '{"success": true}'::JSONB;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error details
        RETURN QUERY SELECT json_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        )::JSONB;
END;
$$;`;

        const { data: createData, error: createError } = await supabase.rpc('exec', {
          sql: createFunctionSQL
        });
        
        if (createError) {
          console.error('❌ Failed to create exec_migration_sql function:', createError);
          
          // Try a simpler approach - direct SQL execution
          console.log('3. Trying direct SQL execution via Supabase...');
          const { data: directData, error: directError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .limit(1);
            
          if (directError) {
            console.error('❌ Even basic queries fail:', directError);
          } else {
            console.log('✅ Basic queries work, issue is with the RPC function');
          }
        } else {
          console.log('✅ Successfully created exec_migration_sql function');
        }
        return;
      }
    } else {
      console.log('✅ exec_migration_sql function exists and works');
    }
  } catch (e) {
    console.error('❌ Failed to test exec_migration_sql:', e.message);
  }

  // Now let's test the edge function directly
  console.log('\n2. Testing apply-migration edge function...');
  
  const testMigration = `-- Test migration comment
SELECT 1 as test_migration;`;

  try {
    console.log('Testing with the actual failing migration...');
    const migrationContent = `-- Create trigger to automatically create initial task for new users
CREATE OR REPLACE FUNCTION create_new_user_task()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tasks (
        user_id,
        title,
        task_type,
        status,
        priority,
        metadata
    ) VALUES (
        NEW.id,
        'Welcome to SmallBizAlly! Complete your business profile to get started.',
        'onboarding',
        'in_progress',
        1,
        '{"type": "onboarding", "step": "initial"}'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_new_user_task ON auth.users;
CREATE TRIGGER trigger_create_new_user_task
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_new_user_task();`;

    const response = await fetch(`${supabaseUrl}/functions/v1/apply-migration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        migrationName: '20250813151513_create_new_user_task_trigger.sql',
        migrationContent: migrationContent,
        userId: 'test-user'
      })
    });

    console.log('📊 HTTP Response Status:', response.status);
    console.log('📊 HTTP Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 HTTP Response Body:', responseText);

    if (!response.ok) {
      console.error('❌ HTTP request failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.error('❌ Error details:', errorData);
      } catch {
        console.error('❌ Raw error response:', responseText);
      }
    } else {
      console.log('✅ Edge function worked! Response:', JSON.parse(responseText));
    }
  } catch (e) {
    console.error('❌ HTTP request failed:', e.message);
  }
}

testEdgeFunction().catch(console.error);
