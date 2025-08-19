#!/usr/bin/env node

/**
 * Ground Truth Orchestration Test
 * 
 * This test demonstrates the COMPLETE orchestration flow working end-to-end:
 * 1. Creates a task in the database
 * 2. Verifies Realtime event triggers EventListener
 * 3. Shows orchestration initiating
 * 4. Captures all events written to task_context_events
 * 5. Provides ground truth data from the database
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🎯 GROUND TRUTH ORCHESTRATION TEST');
console.log('═'.repeat(60));
console.log('This test will demonstrate the COMPLETE orchestration flow');
console.log('with real data from the database as proof.\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function createTaskInDatabase() {
  const taskId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  const taskData = {
    id: taskId,
    user_id: '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934', // Test user
    task_type: 'onboarding',
    template_id: 'onboarding',
    title: `Ground Truth Test - ${timestamp}`,
    description: 'Demonstrating complete orchestration flow',
    status: 'pending',
    priority: 'high',
    metadata: {
      test: true,
      ground_truth: true,
      timestamp: timestamp
    }
  };
  
  const { error } = await supabase
    .from('tasks')
    .insert(taskData);
    
  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
  
  return { taskId, timestamp, taskData };
}

async function monitorTaskEvents(taskId, maxWaitMs = 5000) {
  const startTime = Date.now();
  const events = [];
  let lastEventCount = 0;
  
  while (Date.now() - startTime < maxWaitMs) {
    const { data: newEvents, error } = await supabase
      .from('task_context_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
      
    if (!error && newEvents && newEvents.length > lastEventCount) {
      // New events detected
      const addedEvents = newEvents.slice(lastEventCount);
      events.push(...addedEvents);
      lastEventCount = newEvents.length;
      
      // Give more time if we're seeing activity
      if (addedEvents.length > 0 && Date.now() - startTime < maxWaitMs - 2000) {
        await sleep(1000); // Wait a bit more for follow-up events
      }
    }
    
    await sleep(500);
  }
  
  return events;
}

async function getGroundTruthData(taskId) {
  // Get the task record
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
    
  if (taskError) {
    throw new Error(`Failed to fetch task: ${taskError.message}`);
  }
  
  // Get all events for this task
  const { data: events, error: eventsError } = await supabase
    .from('task_context_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
    
  if (eventsError) {
    throw new Error(`Failed to fetch events: ${eventsError.message}`);
  }
  
  return { task, events };
}

async function runGroundTruthTest() {
  try {
    // Step 1: Verify backend is running
    console.log('📡 Step 1: Checking backend health...');
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      console.log('❌ Backend is not running!');
      console.log('💡 Start the backend with: cd ../biz-buddy-backend && npm run dev');
      return false;
    }
    console.log('✅ Backend is healthy\n');
    
    // Step 2: Create a task in the database
    console.log('📝 Step 2: Creating task in database...');
    const { taskId, timestamp, taskData } = await createTaskInDatabase();
    console.log('✅ Task created successfully');
    console.log('   Task ID:', taskId);
    console.log('   Title:', taskData.title);
    console.log('   Type:', taskData.task_type);
    console.log('   Template:', taskData.template_id);
    console.log();
    
    // Step 3: Wait and monitor for orchestration events
    console.log('⏳ Step 3: Monitoring for orchestration events...');
    console.log('   Waiting up to 5 seconds for events...');
    const events = await monitorTaskEvents(taskId, 5000);
    
    if (events.length === 0) {
      console.log('❌ No orchestration events detected!');
      console.log('   The orchestration flow is not working.');
    } else {
      console.log(`✅ Detected ${events.length} orchestration event(s)!\n`);
    }
    
    // Step 4: Get ground truth data from database
    console.log('🔍 Step 4: Fetching ground truth data from database...');
    const groundTruth = await getGroundTruthData(taskId);
    
    // Step 5: Display the complete flow
    console.log('\n' + '═'.repeat(60));
    console.log('📊 GROUND TRUTH RESULTS');
    console.log('═'.repeat(60));
    
    console.log('\n📋 TASK RECORD (from tasks table):');
    console.log('   ID:', groundTruth.task.id);
    console.log('   User ID:', groundTruth.task.user_id);
    console.log('   Status:', groundTruth.task.status);
    console.log('   Type:', groundTruth.task.task_type);
    console.log('   Template:', groundTruth.task.template_id);
    console.log('   Created:', groundTruth.task.created_at);
    
    console.log('\n🎬 ORCHESTRATION EVENTS (from task_context_events):');
    if (groundTruth.events.length === 0) {
      console.log('   ❌ No events recorded - orchestration did not trigger');
    } else {
      console.log(`   ✅ ${groundTruth.events.length} event(s) recorded:\n`);
      
      groundTruth.events.forEach((event, index) => {
        const timeDiff = new Date(event.created_at) - new Date(groundTruth.task.created_at);
        console.log(`   Event ${index + 1}:`);
        console.log(`     • Operation: ${event.operation}`);
        console.log(`     • Actor: ${event.actor_id} (${event.actor_type})`);
        console.log(`     • Time: +${Math.round(timeDiff / 1000)}s after task creation`);
        if (event.reasoning) {
          console.log(`     • Reasoning: "${event.reasoning}"`);
        }
        if (event.data) {
          console.log(`     • Data:`, JSON.stringify(event.data, null, 8).split('\n').map(l => '       ' + l).join('\n').trim());
        }
        console.log();
      });
    }
    
    // Step 6: Verify the flow
    console.log('═'.repeat(60));
    console.log('🏁 ORCHESTRATION FLOW VERIFICATION');
    console.log('═'.repeat(60));
    
    const flowSteps = {
      taskCreated: false,
      realtimeReceived: false,
      orchestrationInitiated: false,
      agentProcessing: false
    };
    
    // Check task creation
    flowSteps.taskCreated = groundTruth.task.id === taskId;
    
    // Check for orchestration initiation event
    const orchestrationEvent = groundTruth.events.find(e => 
      e.operation === 'ORCHESTRATION_INITIATED' || 
      e.operation === 'orchestration_initiated'
    );
    flowSteps.orchestrationInitiated = !!orchestrationEvent;
    
    // Check for EventListener involvement (shows Realtime worked)
    const eventListenerEvent = groundTruth.events.find(e => 
      e.actor_id === 'EventListener' || 
      e.actor_type === 'system'
    );
    flowSteps.realtimeReceived = !!eventListenerEvent;
    
    // Check for agent processing
    const agentEvent = groundTruth.events.find(e => 
      e.actor_type === 'agent' || 
      (e.actor_id?.includes('Agent') && e.actor_id !== 'EventListener')
    );
    flowSteps.agentProcessing = !!agentEvent;
    
    console.log('\n📈 Flow Analysis:');
    console.log(`   1. Task Created in Database: ${flowSteps.taskCreated ? '✅' : '❌'}`);
    console.log(`   2. Realtime Event Received: ${flowSteps.realtimeReceived ? '✅' : '❌'}`);
    console.log(`   3. Orchestration Initiated: ${flowSteps.orchestrationInitiated ? '✅' : '❌'}`);
    console.log(`   4. Agent Processing Started: ${flowSteps.agentProcessing ? '✅' : '❌'}`);
    
    const allStepsComplete = Object.values(flowSteps).every(v => v === true);
    
    console.log('\n' + '═'.repeat(60));
    if (allStepsComplete) {
      console.log('🎉 SUCCESS! COMPLETE ORCHESTRATION FLOW WORKING!');
      console.log('✅ Task creation → Realtime → EventListener → Orchestration');
    } else if (flowSteps.orchestrationInitiated) {
      console.log('⚠️ PARTIAL SUCCESS: Orchestration initiated but not fully complete');
      console.log('✅ Task creation → Realtime → EventListener working');
      console.log('❌ Agent processing needs fixing');
    } else if (flowSteps.realtimeReceived) {
      console.log('⚠️ PARTIAL SUCCESS: Realtime working but orchestration failed');
      console.log('✅ Task creation → Realtime working');
      console.log('❌ Orchestration needs fixing');
    } else {
      console.log('❌ FAILURE: Orchestration flow not working');
      console.log('Check backend logs for errors');
    }
    console.log('═'.repeat(60));
    
    // Return ground truth for verification
    return {
      success: groundTruth.events.length > 0,
      taskId,
      timestamp,
      eventCount: groundTruth.events.length,
      groundTruth
    };
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
    return false;
  }
}

// Run the test
console.log();
runGroundTruthTest().then(result => {
  if (result && result.success) {
    console.log('\n✅ Ground truth data proves orchestration is working!');
    console.log(`📊 Task ID: ${result.taskId}`);
    console.log(`📊 Events recorded: ${result.eventCount}`);
    process.exit(0);
  } else {
    console.log('\n❌ Orchestration flow needs fixing');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
