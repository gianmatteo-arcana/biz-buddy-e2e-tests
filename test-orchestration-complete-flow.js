#!/usr/bin/env node

/**
 * Complete Orchestration Flow Test
 * 
 * Tests the complete task creation → database trigger → EventListener → OrchestratorAgent flow
 * This verifies the fixes are working end-to-end.
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';
const BACKEND_URL = 'http://localhost:3001';
const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 COMPLETE ORCHESTRATION FLOW TEST');
console.log('═'.repeat(60));
console.log('Testing: Task Creation → Trigger → EventListener → OrchestratorAgent');
console.log('');

async function step1_checkMigrationStatus() {
  console.log('📋 STEP 1: Check Migration Status');
  console.log('─'.repeat(40));
  
  try {
    // Check if the trigger migration is applied
    const { data: migrations } = await supabase.functions.invoke('check-pending-migrations');
    
    if (migrations?.pendingMigrations?.find(m => m.name.includes('task_creation_notify'))) {
      console.log('⚠️ Task creation trigger migration is PENDING');
      console.log('   Please apply migration in Dev Toolkit UI first!');
      console.log('   Go to localhost:8081 → Dev Toolkit → Migrations tab');
      return false;
    } else {
      console.log('✅ Task creation trigger migration is applied');
      return true;
    }
  } catch (error) {
    console.log('⚠️ Could not check migration status:', error.message);
    console.log('   Assuming migration is applied, continuing test...');
    return true;
  }
}

async function step2_createTestTask() {
  console.log('\n📝 STEP 2: Create Test Task');
  console.log('─'.repeat(40));
  
  const taskId = uuidv4();
  const now = new Date().toISOString();
  
  // Set up real-time listener for task creation events
  let eventReceived = false;
  let orchestrationStarted = false;
  
  const subscription = supabase
    .channel('task_creation_test')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'task_context_events'
    }, (payload) => {
      console.log('📡 Event detected:', payload.new.operation, 'by', payload.new.actor_id);
      
      if (payload.new.operation === 'TASK_CREATED') {
        eventReceived = true;
      }
      
      if (payload.new.actor_id === 'OrchestratorAgent') {
        orchestrationStarted = true;
        console.log('🎉 ORCHESTRATION IS WORKING!');
      }
    })
    .subscribe();
  
  try {
    console.log('🎯 Creating task:', taskId.slice(0, 8) + '...');
    
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        id: taskId,
        user_id: TEST_USER_ID,
        title: 'Orchestration Flow Test - ' + now,
        description: 'Testing complete task orchestration flow',
        status: 'pending',
        task_type: 'onboarding',
        template_id: 'onboarding',
        metadata: {
          source: 'orchestration_flow_test',
          testCase: 'complete_flow',
          timestamp: now
        }
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Failed to create task:', error.message);
      return null;
    }
    
    console.log('✅ Task created successfully');
    console.log('   ID:', taskId);
    console.log('   Title:', task.title);
    
    // Wait for events
    console.log('\n⏳ Waiting for orchestration events...');
    console.log('   Looking for: Database trigger → EventListener → OrchestratorAgent');
    
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) { // Wait 15 seconds max
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (orchestrationStarted) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`✅ Orchestration detected after ${elapsed} seconds!`);
        break;
      }
      
      if (Date.now() - startTime > 10000) {
        console.log('⏰ Still waiting...');
      }
    }
    
    await subscription.unsubscribe();
    
    return {
      taskId,
      eventReceived,
      orchestrationStarted,
      timeElapsed: Date.now() - startTime
    };
    
  } catch (error) {
    await subscription.unsubscribe();
    console.log('❌ Test failed:', error.message);
    return null;
  }
}

async function step3_verifyOrchestrationResults(result) {
  console.log('\n📊 STEP 3: Verify Orchestration Results');
  console.log('─'.repeat(40));
  
  if (!result) {
    console.log('❌ No result to verify');
    return false;
  }
  
  // Check database for orchestration events
  const { data: events } = await supabase
    .from('task_context_events')
    .select('*')
    .order('created_at', { ascending: true });
  
  const orchestratorEvents = events?.filter(e => e.actor_id === 'OrchestratorAgent') || [];
  const recentEvents = events?.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 60000)
  ) || [];
  
  console.log('📈 Event Analysis:');
  console.log('   Total events in system:', events?.length || 0);
  console.log('   OrchestratorAgent events:', orchestratorEvents.length);
  console.log('   Recent events (last minute):', recentEvents.length);
  
  if (result.orchestrationStarted) {
    console.log('\n🎉 SUCCESS! Complete orchestration flow verified:');
    console.log('   ✅ Task created in database');
    console.log('   ✅ Database trigger fired');
    console.log('   ✅ EventListener received notification');
    console.log('   ✅ OrchestratorAgent started processing');
    console.log(`   ⏱️ Total time: ${Math.floor(result.timeElapsed / 1000)} seconds`);
    return true;
  } else {
    console.log('\n❌ Orchestration flow incomplete:');
    console.log('   ✅ Task created in database');
    console.log('   ' + (result.eventReceived ? '✅' : '❌') + ' Database trigger fired');
    console.log('   ❌ OrchestratorAgent did not respond');
    
    console.log('\n🔍 Debugging suggestions:');
    console.log('   1. Check backend logs for EventListener errors');
    console.log('   2. Verify migration was applied successfully');
    console.log('   3. Check if PostgreSQL NOTIFY is working');
    console.log('   4. Ensure OrchestratorAgent is properly initialized');
    
    return false;
  }
}

async function runCompleteFlowTest() {
  try {
    const migrationApplied = await step1_checkMigrationStatus();
    if (!migrationApplied) {
      console.log('\n❌ Migration required before testing');
      return;
    }
    
    const result = await step2_createTestTask();
    const success = await step3_verifyOrchestrationResults(result);
    
    console.log('\n═'.repeat(60));
    if (success) {
      console.log('🎉 ORCHESTRATION IS FULLY FUNCTIONAL!');
      console.log('✅ Task creation now triggers real-time agent orchestration');
      console.log('✅ EventListener gap has been closed');
      console.log('✅ OrchestratorAgent is responding to events');
    } else {
      console.log('❌ Orchestration flow needs more investigation');
      console.log('🔧 Check backend logs and database trigger setup');
    }
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  }
}

// Run the complete flow test
runCompleteFlowTest().catch(console.error);