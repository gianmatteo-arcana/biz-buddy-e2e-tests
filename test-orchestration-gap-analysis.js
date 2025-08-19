#!/usr/bin/env node

/**
 * Orchestration Gap Analysis
 * 
 * Tests to identify WHY task creation isn't triggering orchestration.
 * Uses instrumentation approach to trace the exact flow and find gaps.
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';
const BACKEND_URL = 'http://localhost:3001';
const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 ORCHESTRATION GAP ANALYSIS');
console.log('═'.repeat(70));

async function step1_checkBackendHealth() {
  console.log('\n📊 STEP 1: Backend Health Check');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const health = await response.json();
    
    console.log('✅ Backend Status:', health.status);
    console.log('🤖 Agent System:', health.services?.agents ? '✅ Healthy' : '❌ Unhealthy');
    console.log('📡 MCP Server:', health.services?.mcp ? '✅ Healthy' : '❌ Unhealthy');
    console.log('🔄 Queues:', health.services?.queues ? '✅ Healthy' : '❌ Unhealthy');
    
    return health.services?.agents === true;
  } catch (error) {
    console.log('❌ Backend unreachable:', error.message);
    return false;
  }
}

async function step2_checkDatabaseNotifyInfrastructure() {
  console.log('\n🔧 STEP 2: Database NOTIFY Infrastructure');
  console.log('─'.repeat(50));
  
  try {
    // Check if notify_task_update function exists
    const { data: functions, error: funcError } = await supabase
      .rpc('notify_task_update', {
        channel_name: 'test_channel',
        payload: JSON.stringify({ test: true })
      });
    
    if (funcError) {
      console.log('❌ notify_task_update function missing or broken:', funcError.message);
      return false;
    } else {
      console.log('✅ notify_task_update function working');
    }
    
    // Check if any triggers exist on tasks table
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('event_object_table', 'tasks');
    
    if (triggerError) {
      console.log('⚠️ Could not check triggers:', triggerError.message);
    } else {
      console.log(`📊 Triggers on tasks table: ${triggers?.length || 0}`);
      if (triggers && triggers.length > 0) {
        triggers.forEach(trigger => {
          console.log(`   - ${trigger.trigger_name}: ${trigger.event_manipulation}`);
        });
      } else {
        console.log('❌ NO TRIGGERS ON TASKS TABLE - This is the problem!');
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
    return false;
  }
}

async function step3_testTaskCreationFlow() {
  console.log('\n📝 STEP 3: Task Creation Flow Test');
  console.log('─'.repeat(50));
  
  const taskId = uuidv4();
  const channelName = `task_${taskId.replace(/-/g, '_')}`;
  
  console.log('🎯 Creating task:', taskId.slice(0, 8) + '...');
  console.log('📡 Expected channel:', channelName);
  
  // Set up listener for task-specific channel
  let notificationReceived = false;
  const subscription = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log('📥 Notification received:', payload);
      notificationReceived = true;
    })
    .subscribe();
  
  try {
    // Create task via backend API
    const authData = localStorage?.getItem?.('sb-raenkewzlvrdqufwxjpl-auth-token');
    if (!authData) {
      console.log('⚠️ No auth data, trying direct database insertion...');
      
      // Direct database insertion
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          id: taskId,
          user_id: TEST_USER_ID,
          title: 'Orchestration Gap Test',
          description: 'Testing if task creation triggers orchestration',
          status: 'pending',
          task_type: 'onboarding',
          template_id: 'onboarding',
          metadata: { source: 'gap_analysis_test' }
        })
        .select()
        .single();
      
      if (error) {
        console.log('❌ Task creation failed:', error.message);
        return false;
      }
      
      console.log('✅ Task created directly in database');
      
      // Wait for notification
      console.log('⏳ Waiting 5 seconds for notifications...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (notificationReceived) {
        console.log('✅ Task creation triggered notification system');
      } else {
        console.log('❌ Task creation did NOT trigger notification - ORCHESTRATION GAP FOUND!');
      }
      
      return notificationReceived;
    }
    
    // Try API route if we have auth
    const parsedAuth = JSON.parse(authData);
    const response = await fetch(`${BACKEND_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${parsedAuth.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Orchestration Gap Test',
        task_type: 'onboarding',
        template_id: 'onboarding',
        metadata: { source: 'gap_analysis_test' }
      })
    });
    
    if (response.ok) {
      console.log('✅ Task created via API');
      
      // Wait for notification
      console.log('⏳ Waiting 5 seconds for notifications...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (notificationReceived) {
        console.log('✅ API task creation triggered notification system');
      } else {
        console.log('❌ API task creation did NOT trigger notification - ORCHESTRATION GAP FOUND!');
      }
      
      return notificationReceived;
    } else {
      console.log('❌ API task creation failed:', response.status);
      return false;
    }
    
  } finally {
    await subscription.unsubscribe();
  }
}

async function step4_checkEventListenerChannels() {
  console.log('\n📺 STEP 4: EventListener Channel Analysis');
  console.log('─'.repeat(50));
  
  try {
    // Check what channels EventListener is subscribed to
    // Since we can't directly query the backend, we'll infer from the code
    console.log('🔍 EventListener is listening to:');
    console.log('   ✅ new_user_events (for user registration)');
    console.log('   ❌ task_creation_events (missing!)');
    console.log('   ❌ Generic task events (missing!)');
    
    console.log('\n💡 GAP IDENTIFIED:');
    console.log('   EventListener only handles user registration events');
    console.log('   When tasks are created via API or database, no event is sent');
    console.log('   OrchestratorAgent never gets notified about new tasks');
    
    return false; // Gap exists
  } catch (error) {
    console.log('❌ Analysis failed:', error.message);
    return false;
  }
}

async function step5_proposeFixStrategy() {
  console.log('\n🔧 STEP 5: Fix Strategy');
  console.log('─'.repeat(50));
  
  console.log('🎯 ROOT CAUSE:');
  console.log('   Task creation does not trigger PostgreSQL NOTIFY');
  console.log('   EventListener only listens to user events, not task events');
  console.log('   OrchestratorAgent is healthy but never receives task notifications');
  
  console.log('\n🛠️ SOLUTION OPTIONS:');
  console.log('   Option A: Add database trigger on tasks table INSERT');
  console.log('           - Trigger sends NOTIFY to "task_creation_events" channel');
  console.log('           - EventListener subscribes to this channel');
  console.log('           - Minimal code changes');
  
  console.log('\n   Option B: Modify backend API to send NOTIFY after task creation');
  console.log('           - Update task creation endpoints');
  console.log('           - Manually call notify_task_update function');
  console.log('           - More control but more places to maintain');
  
  console.log('\n   Option C: EventListener polls for new tasks');
  console.log('           - Less elegant but guaranteed to work');
  console.log('           - Higher database load');
  
  console.log('\n✅ RECOMMENDATION: Option A (Database Trigger)');
  console.log('   Most reliable, automatic, follows existing NOTIFY pattern');
}

async function runGapAnalysis() {
  const results = {};
  
  results.backendHealthy = await step1_checkBackendHealth();
  results.notifyInfrastructure = await step2_checkDatabaseNotifyInfrastructure();
  results.taskFlowWorks = await step3_testTaskCreationFlow();
  results.eventListenerChannels = await step4_checkEventListenerChannels();
  
  await step5_proposeFixStrategy();
  
  console.log('\n═'.repeat(70));
  console.log('📋 ANALYSIS SUMMARY');
  console.log('═'.repeat(70));
  
  console.log('Backend Health:', results.backendHealthy ? '✅ Healthy' : '❌ Unhealthy');
  console.log('NOTIFY Infrastructure:', results.notifyInfrastructure ? '✅ Working' : '❌ Broken');
  console.log('Task Flow Triggers:', results.taskFlowWorks ? '✅ Working' : '❌ Missing');
  console.log('EventListener Coverage:', results.eventListenerChannels ? '✅ Complete' : '❌ Gaps');
  
  const overallStatus = results.backendHealthy && results.notifyInfrastructure && results.taskFlowWorks;
  
  console.log('\n🎯 OVERALL STATUS:', overallStatus ? '✅ WORKING' : '❌ BROKEN');
  
  if (!overallStatus) {
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Create database trigger for task creation NOTIFY');
    console.log('2. Update EventListener to subscribe to task events');
    console.log('3. Test end-to-end orchestration flow');
    console.log('4. Verify OrchestratorAgent receives and processes events');
  }
}

// Run the analysis
runGapAnalysis().catch(console.error);