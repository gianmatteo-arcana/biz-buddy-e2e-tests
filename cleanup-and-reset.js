#!/usr/bin/env node

/**
 * Cleanup and Reset Script
 * 
 * This script:
 * 1. Deletes the test user and all associated data
 * 2. Prepares the system for a fresh onboarding experience
 * 3. Verifies the cleanup was successful
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE1MTU5MTQsImV4cCI6MjAzNzA5MTkxNH0.1lKZqRIPRsCPJq0OukTjHj5ByEfl0Yl3azlGI5Ce7Rc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupTestUser() {
  console.log('🧹 Cleanup and Reset Script');
  console.log('=' .repeat(50));
  
  const testEmail = 'gianmatteo.allyn.test@gmail.com';
  
  console.log(`\n📧 Looking for test user: ${testEmail}`);
  
  try {
    // Note: We can't directly delete from auth.users with anon key
    // We'll need to use the service role key or do this via Supabase dashboard
    
    // Check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (profile) {
      console.log('✅ Found test user profile:', profile.id);
      
      // Delete associated tasks
      console.log('🗑️  Deleting tasks...');
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', profile.id);
      
      if (!tasksError) {
        console.log('✅ Tasks deleted');
      } else {
        console.log('⚠️  Error deleting tasks:', tasksError.message);
      }
      
      // Delete task contexts
      console.log('🗑️  Deleting task contexts...');
      const { error: contextsError } = await supabase
        .from('task_contexts')
        .delete()
        .eq('user_id', profile.id);
      
      if (!contextsError) {
        console.log('✅ Task contexts deleted');
      } else {
        console.log('⚠️  No task contexts found or error:', contextsError?.message);
      }
      
      // Delete profile
      console.log('🗑️  Deleting profile...');
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);
      
      if (!deleteProfileError) {
        console.log('✅ Profile deleted');
      } else {
        console.log('❌ Error deleting profile:', deleteProfileError.message);
      }
      
    } else {
      console.log('ℹ️  Test user profile not found');
    }
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const { data: remainingTasks, error: checkTasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', profile?.id || '00000000-0000-0000-0000-000000000000');
    
    const { data: remainingProfile, error: checkProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', testEmail);
    
    console.log('\n📊 Cleanup Results:');
    console.log(`  - Remaining tasks: ${remainingTasks?.length || 0}`);
    console.log(`  - Remaining profiles: ${remainingProfile?.length || 0}`);
    
    if (remainingTasks?.length === 0 && remainingProfile?.length === 0) {
      console.log('\n✅ Cleanup successful! System is ready for fresh onboarding.');
    } else {
      console.log('\n⚠️  Some data may still remain. Manual cleanup may be required.');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Go to the application');
    console.log('2. Sign in with a fresh Google account');
    console.log('3. Open Dev Toolkit → Agent Visualizer');
    console.log('4. Click "Start New Onboarding"');
    console.log('5. Watch real-time agent collaboration!');
    
    console.log('\n⚠️  Note: To fully delete the auth user, you need to:');
    console.log('1. Go to Supabase Dashboard → Authentication → Users');
    console.log('2. Find and delete the test user');
    console.log('OR use the service role key with appropriate permissions');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Cleanup script completed');
}

// Run the cleanup
cleanupTestUser().catch(console.error);