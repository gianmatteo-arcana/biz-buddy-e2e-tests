#!/usr/bin/env node

/**
 * Backend Orchestration Test
 * 
 * Directly creates a task via backend API and monitors orchestration.
 * This bypasses UI complexities to test the core orchestration flow.
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user
const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';

async function step1_createTaskDirectly() {
  console.log('\n📝 STEP 1: Create Task Directly in Database');
  console.log('=' .repeat(60));
  
  const taskId = uuidv4();
  const now = new Date().toISOString();
  
  const taskData = {
    id: taskId,
    user_id: TEST_USER_ID,
    title: `Onboarding Task - ${now}`,
    description: 'Testing declarative template orchestration',
    status: 'pending',
    priority: 'high',
    task_type: 'onboarding',
    template_id: 'onboarding',
    metadata: {
      source: 'backend_orchestration_test',
      templateSnapshot: {
        id: 'onboarding',
        version: '1.0.0',
        goals: {
          primary: [
            { id: 'verify_identity', description: 'Establish user and business identity', required: true }
          ]
        }
      }
    },
    created_at: now,
    updated_at: now
  };
  
  console.log('Creating task with ID:', taskId);
  
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
  console.log('   Title:', task.title);
  console.log('   Type:', task.task_type);
  console.log('   Template:', task.template_id);
  
  // Create initial event to trigger orchestration
  const eventData = {
    id: uuidv4(),
    task_id: taskId,
    user_id: TEST_USER_ID,
    operation: 'TASK_CREATED',
    actor_id: 'system',
    data: {
      templateId: 'onboarding',
      trigger: 'direct_test'
    },
    reasoning: 'Task created - orchestration needed',
    created_at: now
  };
  
  console.log('\n🎯 Creating orchestration trigger event...');
  
  const { data: event, error: eventError } = await supabase
    .from('task_context_events')
    .insert(eventData)
    .select()
    .single();
  
  if (eventError) {
    console.error('❌ Failed to create trigger event:', eventError);
  } else {
    console.log('✅ Trigger event created');
  }
  
  return taskId;
}

async function step2_monitorOrchestration(taskId, duration = 15000) {
  console.log('\n📊 STEP 2: Monitor Orchestration Activity');
  console.log('=' .repeat(60));
  console.log(`Monitoring task ${taskId.substring(0, 8)}... for ${duration/1000} seconds`);
  
  const startTime = Date.now();
  let lastEventCount = 0;
  const orchestratorEvents = [];
  const agentEvents = new Set();
  
  // Set up real-time subscription
  const channel = supabase.channel(`orchestration-${taskId}`)
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
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`\n📡 [+${elapsed}s] Real-time Event Detected!`);
        console.log(`   Operation: ${event.operation}`);
        console.log(`   Actor: ${event.actor_id}`);
        
        if (event.actor_id === 'OrchestratorAgent') {
          console.log('   🎉 ORCHESTRATOR IS ACTIVE!');
          orchestratorEvents.push(event);
        }
        
        if (event.operation?.includes('EXECUTION_PLAN')) {
          console.log('   📋 EXECUTION PLAN CREATED!');
        }
        
        if (event.actor_id && event.actor_id !== 'system') {
          agentEvents.add(event.actor_id);
        }
      }
    )
    .subscribe();
  
  console.log('📡 Real-time subscription active');
  
  // Poll for events periodically
  const pollInterval = setInterval(async () => {
    const { data: events } = await supabase
      .from('task_context_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (events && events.length > lastEventCount) {
      const newEvents = events.slice(lastEventCount);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      console.log(`\n📈 [+${elapsed}s] ${newEvents.length} new events in database`);
      
      newEvents.forEach(e => {
        console.log(`   - ${e.operation} by ${e.actor_id}`);
        
        if (e.actor_id === 'OrchestratorAgent' && !orchestratorEvents.find(o => o.id === e.id)) {
          orchestratorEvents.push(e);
        }
        
        if (e.actor_id && e.actor_id !== 'system') {
          agentEvents.add(e.actor_id);
        }
      });
      
      lastEventCount = events.length;
    }
  }, 3000);
  
  // Wait for monitoring duration
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
  
  return {
    totalEvents: allEvents?.length || 0,
    orchestratorEvents: orchestratorEvents.length,
    activeAgents: Array.from(agentEvents),
    allEvents: allEvents || []
  };
}

async function step3_checkBackendLogs() {
  console.log('\n🔍 STEP 3: Check Backend Status');
  console.log('=' .repeat(60));
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Backend is healthy');
      console.log('   Status:', health.status);
      console.log('   Database:', health.database ? '✅ Connected' : '❌ Disconnected');
    } else {
      console.log('⚠️ Backend health check failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot connect to backend:', error.message);
  }
}

async function analyzeResults(result) {
  console.log('\n📋 ANALYSIS');
  console.log('=' .repeat(60));
  
  console.log('\n📊 Event Statistics:');
  console.log(`   Total events: ${result.totalEvents}`);
  console.log(`   Orchestrator events: ${result.orchestratorEvents}`);
  console.log(`   Active agents: ${result.activeAgents.length}`);
  
  if (result.activeAgents.length > 0) {
    console.log('\n🤖 Active Agents:');
    result.activeAgents.forEach(agent => {
      const agentEvents = result.allEvents.filter(e => e.actor_id === agent);
      console.log(`   - ${agent}: ${agentEvents.length} events`);
    });
  }
  
  // Check for specific orchestration patterns
  const hasTaskCreatedEvent = result.allEvents.some(e => e.operation === 'TASK_CREATED');
  const hasOrchestrationStart = result.allEvents.some(e => 
    e.operation === 'ORCHESTRATION_STARTED' || 
    e.operation === 'ANALYZING_TASK'
  );
  const hasExecutionPlan = result.allEvents.some(e => 
    e.operation === 'EXECUTION_PLAN_CREATED' || 
    e.data?.executionPlan
  );
  
  console.log('\n✅ Orchestration Checkpoints:');
  console.log(`   Task created event: ${hasTaskCreatedEvent ? '✅' : '❌'}`);
  console.log(`   Orchestration started: ${hasOrchestrationStart ? '✅' : '❌'}`);
  console.log(`   Execution plan created: ${hasExecutionPlan ? '✅' : '❌'}`);
  console.log(`   OrchestratorAgent active: ${result.orchestratorEvents > 0 ? '✅' : '❌'}`);
  
  const success = result.orchestratorEvents > 0 || result.activeAgents.length > 0;
  
  if (!success) {
    console.log('\n⚠️ Potential Issues Detected:');
    console.log('   1. OrchestratorAgent may not be initialized on backend');
    console.log('   2. Event listeners may not be configured properly');
    console.log('   3. LISTEN/NOTIFY may not be working in PostgreSQL');
    console.log('   4. Template loading may have failed');
    console.log('   5. Backend may not be running or connected to database');
    
    console.log('\n🔧 Debug Steps:');
    console.log('   1. Check backend logs for OrchestratorAgent initialization');
    console.log('   2. Verify PostgreSQL LISTEN/NOTIFY is enabled');
    console.log('   3. Check if declarative template is loading correctly');
    console.log('   4. Ensure backend EventListener is subscribed to task_context_events');
  } else {
    console.log('\n🎉 SUCCESS! Orchestration is working!');
  }
  
  return success;
}

async function runBackendOrchestrationTest() {
  console.log('🔬 Backend Orchestration Test');
  console.log('=' .repeat(60));
  console.log('Testing orchestration with declarative templates\n');
  
  try {
    // Step 1: Create task
    const taskId = await step1_createTaskDirectly();
    if (!taskId) {
      console.error('❌ Task creation failed');
      return;
    }
    
    // Step 2: Monitor orchestration
    const result = await step2_monitorOrchestration(taskId);
    
    // Step 3: Check backend status
    await step3_checkBackendLogs();
    
    // Analyze results
    const success = await analyzeResults(result);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    if (success) {
      console.log('\n✅ Orchestration is functional!');
      console.log('   Task ID:', taskId);
      console.log('   View events in Supabase dashboard');
    } else {
      console.log('\n❌ Orchestration not detected');
      console.log('   Task ID for debugging:', taskId);
      console.log('   Check backend logs and database events');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
runBackendOrchestrationTest().catch(console.error);