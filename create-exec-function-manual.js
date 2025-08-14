/**
 * Create exec_migration_sql function manually via edge function
 * 
 * Since we can't use direct database access, we'll create the function
 * by using the check-pending-migrations edge function which should work,
 * and then manually execute SQL to create the missing function.
 */

console.log('🔧 MANUALLY CREATING exec_migration_sql FUNCTION');
console.log('===============================================');
console.log('');
console.log('The HTTP 500 errors are likely caused by missing exec_migration_sql function.');
console.log('This function is required for the edge functions to work.');
console.log('');
console.log('📋 MANUAL FIX REQUIRED:');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Run this SQL:');
console.log('');
console.log('------- SQL TO RUN -------');
console.log(`
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
`);
console.log('------- END SQL -------');
console.log('');
console.log('4. After running the SQL, try applying migrations again via E2E');
console.log('');
console.log('🎯 This should fix the HTTP 500 errors and allow migrations to apply!');

// Alternative: Try to use the edge function itself to create the function
console.log('\n🔄 ALTERNATIVE: Trying to create function via existing edge function...');

const https = require('https');

const sqlQuery = `
CREATE OR REPLACE FUNCTION public.exec_migration_sql(migration_sql TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ 
BEGIN
  EXECUTE migration_sql;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration execution failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_migration_sql(TEXT) TO service_role;
`;

const postData = JSON.stringify({
  migrationName: 'bootstrap_exec_migration_sql_function',
  migrationContent: sqlQuery,
  userId: '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934'
});

const options = {
  hostname: 'raenkewzlvrdqufwxjpl.supabase.co',
  port: 443,
  path: '/functions/v1/apply-migration-with-healing',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  }
};

console.log('🔄 Trying to bootstrap exec_migration_sql function...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Successfully created exec_migration_sql function!');
      console.log('🎯 Edge functions should now work - try applying migrations again');
    } else {
      console.log(`❌ Failed to create function: HTTP ${res.statusCode}`);
      console.log('📋 Response:', data);
      console.log('🔧 Please use the manual SQL approach above');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  console.log('🔧 Please use the manual SQL approach above');
});

req.write(postData);
req.end();

console.log('⏳ Waiting for response...');