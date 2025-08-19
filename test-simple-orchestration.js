#!/usr/bin/env node

/**
 * Simple Orchestration Test
 * 
 * Just creates a task and waits to see if the backend orchestration system responds.
 * No manual event creation - let the system work naturally.
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user
const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';

async function createSimpleTask() {
  console.log('\n📝 Creating Simple Task');
  console.log('=' .repeat(50));
  
  const taskId = uuidv4();
  const now = new Date().toISOString();
  
  const taskData = {
    id: taskId,
    user_id: TEST_USER_ID,
    title: `Simple Orchestration Test - ${now}`,
    description: 'Testing if backend responds to task creation',
    status: 'pending',
    task_type: 'onboarding',
    template_id: 'onboarding',
    created_at: now,
    updated_at: now
  };
  
  console.log('Creating task:', taskId.substring(0, 8) + '...');
  
  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create task:', error);
    return null;
  }
  
  console.log('✅ Task created!');
  console.log('   Type:', task.task_type);
  console.log('   Template:', task.template_id);
  
  return taskId;
}

async function waitForOrchestration(taskId, duration = 10000) {
  console.log('\n⏳ Waiting for orchestration response...');
  console.log('=' .repeat(50));
  console.log(`Listening for ${duration/1000} seconds...`);
  
  const startTime = Date.now();
  let events = [];
  
  // Set up real-time subscription
  const channel = supabase.channel(`simple-test-${taskId}`)
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
        console.log(`📡 [+${elapsed}s] Event detected!`);
        console.log(`   Operation: ${event.operation}`);
        console.log(`   Actor: ${event.actor_id}`);
        
        events.push(event);
        
        if (event.actor_id === 'OrchestratorAgent') {
          console.log('   🎉 ORCHESTRATOR IS RESPONDING!');
        }
      }
    )
    .subscribe();
  
  // Simple polling as backup
  const pollInterval = setInterval(async () => {
    try {
      const { data: polledEvents } = await supabase
        .from('task_context_events')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (polledEvents && polledEvents.length > 0) {
        console.log(`📊 Found ${polledEvents.length} events in database`);
      }
    } catch (error) {
      // Ignore polling errors
    }
  }, 3000);
  
  // Wait for specified duration
  await new Promise(resolve => setTimeout(resolve, duration));
  
  // Clean up
  clearInterval(pollInterval);
  await channel.unsubscribe();
  
  return events;
}

async function checkResults(events) {
  console.log('\n📋 Results');
  console.log('=' .repeat(50));
  
  if (events.length === 0) {
    console.log('❌ No orchestration events detected');
    console.log('');
    console.log('Possible issues:');
    console.log('- Backend OrchestratorAgent not initialized');
    console.log('- Event system not configured');
    console.log('- Template loading failed');
    console.log('- Database connection issues');
    
    return false;
  }
  
  console.log(`✅ ${events.length} orchestration events detected!`);
  
  events.forEach((event, i) => {
    console.log(`   ${i+1}. ${event.operation} by ${event.actor_id}`);
  });
  
  const hasOrchestratorEvent = events.some(e => e.actor_id === 'OrchestratorAgent');
  if (hasOrchestratorEvent) {
    console.log('\n🎉 SUCCESS: OrchestratorAgent is working!');
    return true;
  } else {
    console.log('\n⚠️ Events detected, but no OrchestratorAgent activity');
    return false;
  }
}

async function runSimpleTest() {
  console.log('🧪 Simple Orchestration Test');
  console.log('=' .repeat(50));
  console.log('Testing if the backend responds to task creation');
  
  try {
    // Create a task
    const taskId = await createSimpleTask();
    if (!taskId) {
      console.error('❌ Could not create task');
      return;
    }
    
    // Wait for orchestration
    const events = await waitForOrchestration(taskId);
    
    // Check results
    const success = await checkResults(events);
    
    console.log('\n' + '=' .repeat(50));
    if (success) {
      console.log('✅ ORCHESTRATION IS WORKING!');
    } else {
      console.log('❌ Orchestration not detected');
    }
    console.log('Task ID:', taskId);
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the simple test
runSimpleTest().catch(console.error);