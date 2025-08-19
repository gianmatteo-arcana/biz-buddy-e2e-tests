#!/usr/bin/env node

/**
 * Direct Orchestration Test
 * 
 * Tests orchestration by directly creating a task through the API
 * and monitoring the backend logs for orchestration activity.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';
const BACKEND_URL = 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🎯 DIRECT ORCHESTRATION TEST');
console.log('═'.repeat(60));

async function getTestUserToken() {
  console.log('🔐 Getting test user authentication...');
  
  // Get the test user from tasks table (we know they have tasks)
  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('user_id')
    .limit(1);
    
  if (taskError || !tasks || tasks.length === 0) {
    console.log('❌ No tasks found to identify user');
    // Use a known test user ID
    const testUserId = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';
    console.log('⚠️ Using fallback test user ID:', testUserId);
    
    return {
      userId: testUserId,
      email: 'gianmatteo.allyn.test@gmail.com',
      token: 'test-token'
    };
  }
  
  const userId = tasks[0].user_id;
  console.log('✅ Found user ID from existing tasks:', userId);
  
  return {
    userId: userId,
    email: 'gianmatteo.allyn.test@gmail.com',
    token: 'test-token-' + userId
  };
}

async function createTaskDirectly(userId) {
  console.log('\n📝 Creating task directly in database...');
  
  const taskId = crypto.randomUUID();
  const taskData = {
    id: taskId,
    user_id: userId,
    task_type: 'onboarding',
    template_id: 'onboarding',
    title: `Direct Orchestration Test - ${new Date().toISOString()}`,
    description: 'Testing orchestration trigger via direct insert',
    status: 'pending',
    priority: 'medium',
    metadata: {
      test: true,
      directInsert: true,
      timestamp: new Date().toISOString()
    }
  };
  
  const { error: insertError } = await supabase
    .from('tasks')
    .insert(taskData);
    
  if (insertError) {
    console.log('❌ Failed to create task:', insertError.message);
    return null;
  }
  
  console.log('✅ Task created successfully');
  console.log('   Task ID:', taskId);
  console.log('   Title:', taskData.title);
  
  return taskId;
}

async function monitorOrchestration(taskId, durationMs = 10000) {
  console.log('\n🔍 Monitoring orchestration activity...');
  console.log(`   Watching task ${taskId} for ${durationMs/1000} seconds`);
  
  const startTime = Date.now();
  let eventCount = 0;
  let orchestrationStarted = false;
  
  // Poll for events
  while (Date.now() - startTime < durationMs) {
    const { data: events, error } = await supabase
      .from('task_context_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
      
    if (!error && events && events.length > eventCount) {
      const newEvents = events.slice(eventCount);
      eventCount = events.length;
      
      console.log(`\n📊 ${newEvents.length} new event(s) detected:`);
      newEvents.forEach(event => {
        console.log(`   • ${event.operation} by ${event.actor_id} (${event.actor_type})`);
        if (event.reasoning) {
          console.log(`     "${event.reasoning}"`);
        }
        
        // Check for orchestration
        if (event.actor_type === 'agent' || event.actor_id?.includes('Orchestrator')) {
          orchestrationStarted = true;
        }
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return orchestrationStarted;
}

async function checkBackendHealth() {
  console.log('\n🏥 Checking backend health...');
  
  try {
    // Use built-in fetch (available in Node 18+)
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      console.log('✅ Backend is healthy');
      return true;
    } else {
      console.log('❌ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot reach backend:', error.message);
    console.log('💡 Make sure backend is running: cd ../biz-buddy-backend && npm run dev');
    return false;
  }
}

async function runTest() {
  try {
    // Check backend
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      console.log('\n⚠️ Backend must be running for orchestration to work');
      return false;
    }
    
    // Get test user
    const userInfo = await getTestUserToken();
    if (!userInfo) {
      console.log('\n❌ Could not get test user');
      return false;
    }
    
    // Create task directly (should trigger database trigger)
    const taskId = await createTaskDirectly(userInfo.userId);
    if (!taskId) {
      console.log('\n❌ Task creation failed');
      return false;
    }
    
    // Monitor for orchestration
    console.log('\n⏳ Waiting for orchestration to start...');
    console.log('   The database trigger should fire pg_notify');
    console.log('   EventListener should receive the notification');
    console.log('   OrchestratorAgent should start processing');
    
    const orchestrationDetected = await monitorOrchestration(taskId, 10000);
    
    // Results
    console.log('\n═'.repeat(60));
    if (orchestrationDetected) {
      console.log('🎉 ORCHESTRATION TRIGGERED SUCCESSFULLY!');
      console.log('✅ Database trigger → NOTIFY → EventListener → OrchestratorAgent');
    } else {
      console.log('⚠️ ORCHESTRATION NOT DETECTED');
      console.log('💡 Possible issues:');
      console.log('   1. Database trigger not firing');
      console.log('   2. EventListener not listening to task_creation_events');
      console.log('   3. OrchestratorAgent not processing');
      console.log('   4. Events not being written to task_context_events');
    }
    console.log('═'.repeat(60));
    
    return orchestrationDetected;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});