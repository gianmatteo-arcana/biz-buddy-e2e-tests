#!/usr/bin/env node

/**
 * Direct Backend Integration Test
 * 
 * Tests the backend services directly using service role access
 * to validate orchestration flow without authentication complexities.
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user details
const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';
const TEST_USER_EMAIL = 'gianmatteo.allyn.test@gmail.com';

async function step1_createDirectTask() {
  console.log('\n📝 STEP 1: Create Task Directly in Database');
  console.log('=' .repeat(60));
  
  const contextId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const taskId = uuidv4();
  
  const taskData = {
    id: taskId,
    user_id: TEST_USER_ID,
    title: 'Integration Test: Onboarding with Declarative Template',
    description: 'Testing declarative template orchestration',
    status: 'pending',
    priority: 'high',
    task_type: 'onboarding',
    template_id: 'onboarding',
    metadata: {
      contextId: contextId,
      templateId: 'onboarding',
      source: 'backend_direct_test',
      businessName: 'Test Business LLC',
      email: TEST_USER_EMAIL,
      templateSnapshot: {
        id: 'onboarding',
        version: '1.0.0',
        goals: {
          primary: [
            { id: 'verify_identity', description: 'Establish user and business identity', required: true },
            { id: 'determine_structure', description: 'Understand business entity type', required: true }
          ]
        }
      }
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log('Creating task with context ID:', contextId);
  
  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create task:', error);
    return null;
  }
  
  console.log('✅ Task created successfully!');
  console.log('   Task ID:', task.id);
  console.log('   Context ID:', contextId);
  console.log('   Status:', task.status);
  
  return { taskId: task.id, contextId: contextId };
}

async function step2_triggerOrchestration(taskId, contextId) {
  console.log('\n🎯 STEP 2: Trigger Orchestration Event');
  console.log('=' .repeat(60));
  
  // Create an event that OrchestratorAgent should respond to
  const eventData = {
    id: uuidv4(),
    task_id: taskId,
    user_id: TEST_USER_ID,
    event_type: 'task_created',
    operation: 'TASK_CREATED',
    actor_id: 'system',
    data: {
      contextId: contextId,
      templateId: 'onboarding',
      trigger: 'backend_test'
    },
    reasoning: 'Task created - orchestration needed',
    created_at: new Date().toISOString()
  };
  
  console.log('Creating orchestration trigger event...');
  
  const { data: event, error } = await supabase
    .from('task_context_events')
    .insert(eventData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create event:', error);
    return null;
  }
  
  console.log('✅ Trigger event created');
  console.log('   Event ID:', event.id);
  console.log('   Operation:', event.operation);
  
  return event.id;
}

async function step3_monitorEvents(taskId, duration = 15000) {
  console.log('\n📊 STEP 3: Monitor Task Events');
  console.log('=' .repeat(60));
  console.log(`Monitoring for ${duration/1000} seconds...`);
  
  const startTime = Date.now();
  let lastEventCount = 0;
  
  // Set up real-time subscription
  const channel = supabase.channel(`task-monitor-${taskId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'task_context_events',
        filter: `task_id=eq.${taskId}`
      },
      (payload) => {
        const event = payload.new;
        console.log(`\n📡 Real-time Event:`);
        console.log(`   [${new Date(event.created_at).toISOString()}]`);
        console.log(`   Operation: ${event.operation}`);
        console.log(`   Actor: ${event.actor_id}`);
        if (event.reasoning) {
          console.log(`   Reasoning: ${event.reasoning}`);
        }
      }
    )
    .subscribe();
  
  // Poll for events periodically
  const pollInterval = setInterval(async () => {
    const { data: events } = await supabase
      .from('task_context_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (events && events.length > lastEventCount) {
      const newEvents = events.slice(lastEventCount);
      console.log(`\n📈 ${newEvents.length} new events detected`);
      lastEventCount = events.length;
    }
  }, 3000);
  
  // Wait for specified duration
  await new Promise(resolve => setTimeout(resolve, duration));
  
  // Clean up
  clearInterval(pollInterval);
  await channel.unsubscribe();
  
  // Get final event list
  const { data: allEvents } = await supabase
    .from('task_context_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  
  return allEvents || [];
}

async function step4_analyzeResults(taskId, events) {
  console.log('\n📋 STEP 4: Analyze Results');
  console.log('=' .repeat(60));
  
  // Get final task state
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  
  console.log('\n📌 Final Task State:');
  console.log('   Status:', task?.status || 'unknown');
  console.log('   Priority:', task?.priority || 'none');
  console.log('   Metadata:', task?.metadata ? 'Present' : 'Missing');
  
  console.log('\n📊 Event Analysis:');
  console.log('   Total Events:', events.length);
  
  // Group events by actor
  const eventsByActor = {};
  events.forEach(e => {
    const actor = e.actor_id || 'system';
    eventsByActor[actor] = (eventsByActor[actor] || 0) + 1;
  });
  
  console.log('\n🤖 Activity by Actor:');
  Object.entries(eventsByActor).forEach(([actor, count]) => {
    console.log(`   ${actor}: ${count} events`);
  });
  
  // Look for key orchestration events
  const orchestrationEvents = events.filter(e => 
    e.actor_id === 'OrchestratorAgent' ||
    e.operation?.includes('ORCHESTRATION') ||
    e.operation?.includes('EXECUTION_PLAN')
  );
  
  console.log('\n🎯 Orchestration Events:', orchestrationEvents.length);
  orchestrationEvents.forEach(e => {
    console.log(`   - ${e.operation} at ${e.created_at}`);
  });
  
  // Check for execution plan
  const executionPlan = events.find(e => 
    e.operation === 'EXECUTION_PLAN_CREATED' ||
    e.data?.executionPlan
  );
  
  if (executionPlan) {
    console.log('\n✅ Execution Plan Found!');
    console.log('   Plan:', JSON.stringify(executionPlan.data?.executionPlan || executionPlan.data, null, 2));
  } else {
    console.log('\n⚠️ No execution plan detected');
  }
  
  // Check for agent activations
  const agentActivations = events.filter(e => 
    e.operation === 'AGENT_ACTIVATED' ||
    e.operation === 'AGENT_CREATED' ||
    (e.actor_id && e.actor_id !== 'system' && e.actor_id !== 'OrchestratorAgent')
  );
  
  console.log('\n🤖 Agent Activations:', agentActivations.length);
  const uniqueAgents = [...new Set(agentActivations.map(e => e.actor_id))];
  uniqueAgents.forEach(agent => {
    console.log(`   - ${agent}`);
  });
  
  return {
    totalEvents: events.length,
    hasOrchestration: orchestrationEvents.length > 0,
    hasExecutionPlan: !!executionPlan,
    activeAgents: uniqueAgents.length,
    finalStatus: task?.status
  };
}

async function runBackendDirectTest() {
  console.log('🔬 Direct Backend Integration Test');
  console.log('=' .repeat(60));
  console.log('Testing orchestration with declarative templates\n');
  
  try {
    // Step 1: Create task
    const result = await step1_createDirectTask();
    if (!result) {
      console.error('❌ Task creation failed');
      return;
    }
    
    const { taskId, contextId } = result;
    
    // Step 2: Trigger orchestration
    const eventId = await step2_triggerOrchestration(taskId, contextId);
    
    // Step 3: Monitor events
    const events = await step3_monitorEvents(taskId);
    
    // Step 4: Analyze results
    const analysis = await step4_analyzeResults(taskId, events);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n✅ Successful Steps:');
    console.log('   1. Task Creation: ✅');
    console.log('   2. Event Trigger: ' + (eventId ? '✅' : '❌'));
    console.log('   3. Event Monitoring: ✅');
    
    console.log('\n📊 Results:');
    console.log('   Total Events:', analysis.totalEvents);
    console.log('   Orchestration Active:', analysis.hasOrchestration ? '✅ Yes' : '❌ No');
    console.log('   Execution Plan Created:', analysis.hasExecutionPlan ? '✅ Yes' : '❌ No');
    console.log('   Agents Activated:', analysis.activeAgents);
    console.log('   Final Task Status:', analysis.finalStatus);
    
    if (!analysis.hasOrchestration) {
      console.log('\n⚠️ Issues Detected:');
      console.log('   - OrchestratorAgent may not be listening to events');
      console.log('   - Check if EventListener is subscribed to task events');
      console.log('   - Verify LISTEN/NOTIFY is working in PostgreSQL');
    }
    
    // Keep task for debugging
    console.log('\n📌 Task ID for debugging:', taskId);
    console.log('   Context ID:', contextId);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
runBackendDirectTest().catch(console.error);
