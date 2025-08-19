/**
 * Check Migration Status
 * Investigates the status of a specific migration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://raenkewzlvrdqufwxjpl.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDczODMsImV4cCI6MjA2ODYyMzM4M30.CvnbE8w1yEX4zYHjHmxRIpTlh4O7ZClbcNSEfYFGlag';

async function checkMigrationStatus() {
  console.log('🔍 Checking migration status...\n');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Sign in with test account
  const testEmail = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
  console.log(`📧 Signing in as: ${testEmail}`);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'Esh7iegh3eic!' 
  });
  
  if (authError) {
    console.error('❌ Auth failed:', authError);
    return;
  }
  
  console.log('✅ Authenticated successfully\n');

  // Check migration history table
  console.log('📊 Checking migration_history table...');
  const { data: history, error: historyError } = await supabase
    .from('migration_history')
    .select('*')
    .ilike('migration_name', '%fix_all_security_definer_views%')
    .order('applied_at', { ascending: false });
    
  if (historyError) {
    console.error('❌ Failed to query migration_history:', historyError);
  } else {
    console.log(`Found ${history?.length || 0} entries for this migration:`);
    if (history && history.length > 0) {
      history.forEach(entry => {
        console.log(`  - Applied: ${entry.applied_at}`);
        console.log(`    Success: ${entry.success}`);
        console.log(`    Applied by: ${entry.applied_by || 'Unknown'}`);
        console.log(`    Error: ${entry.error || 'None'}`);
      });
    }
  }

  // Check pending migrations from edge function
  console.log('\n📋 Checking pending migrations from edge function...');
  
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.access_token) {
    console.error('❌ No valid session');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/check-pending-migrations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Edge function error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    console.log(`Total pending migrations: ${data.pendingMigrations?.length || 0}`);
    
    const targetMigration = data.pendingMigrations?.find(m => 
      m.name.includes('fix_all_security_definer_views')
    );
    
    if (targetMigration) {
      console.log('\n⚠️  Migration shows as PENDING:');
      console.log(`  Name: ${targetMigration.name}`);
      console.log(`  Description: ${targetMigration.description}`);
      console.log(`  Applied: ${targetMigration.applied}`);
    } else {
      console.log('✅ Migration not in pending list (already applied)');
    }
    
  } catch (error) {
    console.error('❌ Failed to check pending migrations:', error);
  }

  // Check if the views were actually created/updated
  console.log('\n🔍 Checking if security definer views exist...');
  const viewsToCheck = [
    'active_tasks',
    'business_stats', 
    'recent_activities',
    'task_overview',
    'task_templates_view',
    'user_onboarding_status',
    'user_task_stats',
    'user_tasks'
  ];

  for (const viewName of viewsToCheck) {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`  ❌ ${viewName}: ${error.message}`);
    } else {
      console.log(`  ✅ ${viewName}: Accessible`);
    }
  }

  // Summary
  console.log('\n📊 SUMMARY:');
  if (history && history.length > 0) {
    const successfulApplications = history.filter(h => h.success);
    if (successfulApplications.length > 0) {
      console.log('✅ Migration WAS previously applied successfully');
      console.log('⚠️  But still shows as pending - this is a sync issue');
      console.log('\nPossible causes:');
      console.log('  1. Edge function registry not updated after application');
      console.log('  2. Migration applied directly in Supabase (outside migration system)');
      console.log('  3. Registry cache needs refresh');
    }
  } else {
    console.log('⚠️  No record of this migration being applied');
    console.log('  The migration genuinely needs to be applied');
  }
}

checkMigrationStatus().catch(console.error);