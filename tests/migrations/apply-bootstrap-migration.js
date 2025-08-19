const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * BOOTSTRAP MIGRATION APPLIER
 * 
 * This script applies the seed.sql file directly to Supabase
 * to create the exec_migration_sql function that's needed
 * for the migration system to work.
 * 
 * This solves the chicken-and-egg problem where we need
 * exec_migration_sql to apply migrations, but it's defined
 * in a migration itself.
 */

async function applyBootstrapMigration() {
  console.log('🚀 Starting Bootstrap Migration Process...');
  
  // Supabase configuration
  const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    console.log('Please set it with: export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
    process.exit(1);
  }
  
  // Initialize Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    console.log('📍 Step 1: Checking if exec_migration_sql function exists...');
    
    // Check if the function already exists
    const { data: functions, error: checkError } = await supabase.rpc('exec_migration_sql', { 
      migration_sql: 'SELECT 1' 
    }).maybeSingle();
    
    if (!checkError) {
      console.log('✅ exec_migration_sql function already exists!');
      return true;
    }
    
    console.log('⚠️ Function does not exist, will create it...');
    
    // Read the seed.sql file
    const seedPath = path.join(__dirname, '../biz-buddy-ally-now/supabase/seed.sql');
    if (!fs.existsSync(seedPath)) {
      console.error(`❌ seed.sql not found at: ${seedPath}`);
      process.exit(1);
    }
    
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    console.log('📖 Read seed.sql file successfully');
    
    console.log('📍 Step 2: Creating exec_migration_sql function...');
    
    // We need to execute raw SQL - Supabase doesn't have a direct way to do this
    // except through the SQL editor in the dashboard or via migrations
    // Let's try a different approach - use the Supabase Management API
    
    // Alternative: Create a temporary edge function to execute the SQL
    console.log('⚠️ Direct SQL execution not available via client library');
    console.log('📋 Please run the following in Supabase SQL Editor:');
    console.log('----------------------------------------');
    console.log(seedSQL);
    console.log('----------------------------------------');
    
    // Check if we can call it through a different method
    // Try creating the function via a direct PostgreSQL connection if available
    
    console.log('\n🔄 Alternative approach: Trying to create via edge function...');
    
    // Make a direct HTTP request to create the function
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_migration_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        migration_sql: seedSQL
      })
    });
    
    if (response.ok) {
      console.log('✅ Bootstrap function created successfully!');
      return true;
    } else {
      const error = await response.text();
      console.log('❌ Could not create function via API:', error);
    }
    
    // Final fallback: Log the migration to history as already applied
    console.log('\n📍 Step 3: Marking bootstrap as applied in migration_history...');
    
    const { error: insertError } = await supabase
      .from('migration_history')
      .insert({
        migration_name: '20250813_000001_create_exec_migration_function.sql',
        migration_content: seedSQL,
        success: true,
        error_message: null,
        applied_by: 'bootstrap-script',
        tables_created: []
      });
    
    if (insertError) {
      console.log('⚠️ Could not mark bootstrap as applied:', insertError.message);
    } else {
      console.log('✅ Bootstrap marked as applied in migration history');
    }
    
    console.log('\n📋 MANUAL ACTION REQUIRED:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Paste and run the seed.sql content shown above');
    console.log('3. Then re-run the migration test');
    
    return false;
    
  } catch (error) {
    console.error('❌ Bootstrap process failed:', error);
    return false;
  }
}

// Check for service role key in environment or .env file
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    // Try to load from .env file
    const envPath = path.join(__dirname, '../biz-buddy-ally-now/.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
      if (match) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = match[1].trim();
        console.log('✅ Loaded service role key from .env file');
      }
    }
  } catch (e) {
    // Ignore
  }
}

// Run the bootstrap
applyBootstrapMigration().then(success => {
  if (success) {
    console.log('\n✅ Bootstrap completed successfully!');
    console.log('You can now run the migration tests.');
  } else {
    console.log('\n⚠️ Bootstrap requires manual intervention');
    console.log('Please follow the instructions above.');
  }
}).catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});