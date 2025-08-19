const { createClient } = require('@supabase/supabase-js');

// Service role key bypasses RLS
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

// Anon key respects RLS
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDczODMsImV4cCI6MjA2ODYyMzM4M30.CvnbE8w1yEX4zYHjHmxRIpTlh4O7ZClbcNSEfYFGlag';

async function checkRLS() {
  const taskId = '96eec43e-7bfe-4933-95d3-b3720b8e5899';
  
  console.log('🔍 Checking RLS on task_context_events table');
  console.log('   Task ID:', taskId);
  console.log('─'.repeat(60));
  
  // Test with service role (bypasses RLS)
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { data: serviceData, error: serviceError } = await serviceClient
    .from('task_context_events')
    .select('id, operation, actor_type')
    .eq('task_id', taskId)
    .limit(3);
    
  if (serviceError) {
    console.error('❌ Service role error:', serviceError);
  } else {
    console.log(`✅ Service role (no RLS): Found ${serviceData.length} events`);
    if (serviceData.length > 0) {
      console.log('   Sample:', serviceData.map(e => e.operation).join(', '));
    }
  }
  
  console.log();
  
  // Test with anon key (respects RLS)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: anonData, error: anonError } = await anonClient
    .from('task_context_events')
    .select('id, operation, actor_type')
    .eq('task_id', taskId)
    .limit(3);
    
  if (anonError) {
    console.error('❌ Anon key error:', anonError);
  } else {
    console.log(`📋 Anon key (with RLS): Found ${anonData.length} events`);
    if (anonData.length > 0) {
      console.log('   Sample:', anonData.map(e => e.operation).join(', '));
    }
  }
  
  console.log();
  console.log('🎯 Diagnosis:');
  if (serviceData && serviceData.length > 0 && (!anonData || anonData.length === 0)) {
    console.log('   ⚠️ RLS is blocking access to events!');
    console.log('   The table has RLS policies that prevent reading.');
    console.log('   Solution: Add RLS policy or use backend API instead.');
  } else if (serviceData && anonData && serviceData.length === anonData.length) {
    console.log('   ✅ RLS is not blocking access');
  } else {
    console.log('   🤔 Unexpected result - check both queries');
  }
}

checkRLS().catch(console.error);