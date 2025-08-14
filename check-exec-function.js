const { createClient } = require('@supabase/supabase-js');

async function checkExecFunction() {
  console.log('🔍 CHECKING IF exec_migration_sql FUNCTION EXISTS');
  console.log('================================================');
  
  const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjY1NTU5NCwiZXhwIjoyMDM4MjMxNTk0fQ.SfLSGGXOKaWQP7qzr0lrX3xOPU2IzQyLSS2Iy6qS5LU';
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔍 Checking for exec_migration_sql function...');
    
    // Check if function exists
    const { data: functions, error: checkError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'exec_migration_sql');

    if (checkError) {
      console.log('❌ Error checking function:', checkError.message);
    } else if (!functions || functions.length === 0) {
      console.log('❌ exec_migration_sql function NOT FOUND!');
      console.log('📋 This is the root cause of HTTP 500 errors');
      
      console.log('\n🔧 CREATING exec_migration_sql function...');
      
      // Create the function directly
      const createFunctionSQL = `
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
        
        -- Grant execute permission to service role
        GRANT EXECUTE ON FUNCTION public.exec_migration_sql(TEXT) TO service_role;
        
        -- Add comment
        COMMENT ON FUNCTION public.exec_migration_sql(TEXT) IS 'Executes migration SQL for the migration runner system. Used by edge functions with service role.';
      `;
      
      const { error: createError } = await supabase.rpc('sql', {
        query: createFunctionSQL
      });
      
      if (createError) {
        console.log('❌ Error creating function via rpc:', createError.message);
        console.log('📋 May need to create manually via SQL editor');
        return { functionExists: false, created: false, error: createError.message };
      } else {
        console.log('✅ exec_migration_sql function created successfully!');
        return { functionExists: true, created: true };
      }
      
    } else {
      console.log('✅ exec_migration_sql function EXISTS');
      console.log(`📋 Found: ${functions[0].routine_name} (${functions[0].routine_type})`);
      
      // Test the function
      console.log('\n🧪 Testing function with simple query...');
      try {
        const { data: testResult, error: testError } = await supabase.rpc('exec_migration_sql', {
          migration_sql: 'SELECT 1 as test_result'
        });
        
        if (testError) {
          console.log('❌ Function test failed:', testError.message);
          return { functionExists: true, working: false, error: testError.message };
        } else {
          console.log('✅ Function test successful!');
          return { functionExists: true, working: true };
        }
      } catch (testErr) {
        console.log('❌ Function test error:', testErr.message);
        return { functionExists: true, working: false, error: testErr.message };
      }
    }

  } catch (error) {
    console.error('❌ Script error:', error.message);
    return { functionExists: false, error: error.message };
  }
}

checkExecFunction().then(result => {
  console.log('\n🏁 CHECK RESULT:', result);
  
  if (result.functionExists && result.working) {
    console.log('✅ exec_migration_sql function is working - this is NOT the cause of 500 errors');
  } else if (!result.functionExists || result.created) {
    console.log('🎯 Found and fixed the root cause! Function was missing.');
  } else {
    console.log('❌ Function issues detected - this likely causes the 500 errors');
  }
  
  process.exit(result.functionExists && result.working !== false ? 0 : 1);
});