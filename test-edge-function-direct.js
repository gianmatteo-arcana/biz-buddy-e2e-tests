/**
 * Test Edge Function Directly
 * Tests the apply-migration edge function to see why it's failing
 */

async function testEdgeFunction() {
  console.log('🔍 Testing Edge Function Directly...\n');
  
  const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE1MTE4OTYsImV4cCI6MjAzNzA4Nzg5Nn0.0CJmjLmkoJZM6VbfQowhjq8S6M_EqBLJzZZFmCQC3qw';
  
  // Test the check-pending-migrations endpoint first
  console.log('1️⃣ Testing check-pending-migrations endpoint...');
  try {
    const checkResponse = await fetch(`${supabaseUrl}/functions/v1/check-pending-migrations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   Status:', checkResponse.status);
    console.log('   Status Text:', checkResponse.statusText);
    
    if (checkResponse.ok) {
      const data = await checkResponse.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await checkResponse.text();
      console.log('   Error Response:', errorText);
    }
  } catch (error) {
    console.error('   Failed:', error.message);
  }
  
  console.log('\n2️⃣ Testing apply-migration endpoint...');
  // Test with the cleanup migration
  const migrationName = '20250808064500_fix_migration_history_duplicates.sql';
  
  try {
    const applyResponse = await fetch(`${supabaseUrl}/functions/v1/apply-migration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        migrationName: migrationName
      })
    });
    
    console.log('   Status:', applyResponse.status);
    console.log('   Status Text:', applyResponse.statusText);
    console.log('   Headers:', Object.fromEntries(applyResponse.headers.entries()));
    
    const responseText = await applyResponse.text();
    console.log('   Raw Response:', responseText);
    
    if (responseText) {
      try {
        const data = JSON.parse(responseText);
        console.log('   Parsed Response:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('   Response is not JSON');
      }
    }
  } catch (error) {
    console.error('   Failed:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.log('\n📊 Summary:');
  console.log('The edge function may be failing because:');
  console.log('1. It requires authentication (user token, not anon key)');
  console.log('2. The migration SQL has an error');
  console.log('3. The edge function itself has an error');
  console.log('4. CORS or permissions issue');
}

testEdgeFunction().catch(console.error);
