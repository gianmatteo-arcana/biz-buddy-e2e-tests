#!/usr/bin/env node

/**
 * Step-by-Step Integration Test for Task Orchestration
 * 
 * We'll build this incrementally, discovering and fixing issues as we go.
 * Uses authenticated user context for proper testing.
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NTU1OTQsImV4cCI6MjAzODIzMTU5NH0.EiKtRdABPInkg2ltL0Zt-TMfLq5Hj0uVQDb4KdixHB8';

// Helper to load auth state
async function loadAuthState() {
  try {
    const authState = require('./.auth/user-state.json');
    const origins = authState.origins || [];
    
    // Look for Supabase auth token in any origin's localStorage
    for (const origin of origins) {
      const localStorage = origin.localStorage || [];
      const authItem = localStorage.find(item => 
        item.name && item.name.includes('sb-raenkewzlvrdqufwxjpl-auth-token')
      );
      
      if (authItem) {
        const authData = JSON.parse(authItem.value);
        return {
          token: authData.access_token,
          refreshToken: authData.refresh_token,
          userId: authData.user?.id,
          email: authData.user?.email
        };
      }
    }
    
    console.log('⚠️ No Supabase auth token found in any origin');
  } catch (error) {
    console.log('⚠️ Could not load auth state:', error.message);
  }
  return null;
}

// Create authenticated Supabase client
async function createAuthenticatedClient(auth) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false
    }
  });
  
  // Set the session
  const { data, error } = await client.auth.setSession({
    access_token: auth.token,
    refresh_token: auth.refreshToken
  });
  
  if (error) {
    console.error('Failed to set session:', error);
    return null;
  }
  
  return client;
}

async function step1_testAPITaskCreation(auth) {
  console.log('\n📝 STEP 1: Test Task Creation via API (Authenticated)');
  console.log('=' .repeat(60));
  
  try {
    const taskData = {
      templateId: 'onboarding',
      initialData: {
        source: 'integration_test',
        businessName: 'Test Business LLC',
        email: auth.email,
        state: 'California',
        entityType: 'LLC'
      }
    };
    
    console.log('Creating task via API as:', auth.email);
    console.log('Template:', taskData.templateId);
    
    const response = await axios.post(
      `${BACKEND_URL}/api/tasks/create`,
      taskData,
      {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Task created successfully!');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    
    // Extract task ID from response
    const contextId = response.data.contextId;
    
    // Now get the actual task from database
    const supabase = await createAuthenticatedClient(auth);
    if (supabase) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('context_id', contextId)
        .single();
      
      if (tasks) {
        console.log('   Task ID:', tasks.id);
        console.log('   Status:', tasks.status);
        return tasks.id;
      }
    }
    
    return contextId; // Fallback to context ID
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Failed to create task:', error.message);
    }
    return null;
  }
}

async function step2_checkTaskEvents(auth, taskId) {
  console.log('\n📊 STEP 2: Check for Task Events');
  console.log('=' .repeat(60));
  
  if (!taskId) {
    console.log('⚠️ No task ID provided, skipping...');
    return;
  }
  
  try {
    const supabase = await createAuthenticatedClient(auth);
    if (!supabase) {
      console.log('❌ Failed to create authenticated client');
      return;
    }
    
    const { data: events, error } = await supabase
      .from('task_context_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Failed to fetch events:', error);
      return;
    }
    
    if (!events || events.length === 0) {
      console.log('⚠️ No events found for task');
      console.log('   This suggests orchestration may not be triggered');
      return;
    }
    
    console.log(`✅ Found ${events.length} events:`);
    events.forEach((event, index) => {
      console.log(`\n   Event #${index + 1}:`);
      console.log('   Operation:', event.operation);
      console.log('   Actor:', event.actor_id || 'system');
      console.log('   Created:', event.created_at);
      if (event.reasoning) {
        console.log('   Reasoning:', event.reasoning);
      }
      if (event.data) {
        console.log('   Data preview:', JSON.stringify(event.data).substring(0, 100) + '...');
      }
    });
    
    // Check for specific orchestration events
    const orchestrationEvents = events.filter(e => 
      e.operation === 'EXECUTION_PLAN_CREATED' ||
      e.operation === 'ORCHESTRATION_STARTED' ||
      e.actor_id === 'OrchestratorAgent'
    );
    
    if (orchestrationEvents.length > 0) {
      console.log('\n🎯 Orchestration activity detected!');
      orchestrationEvents.forEach(e => {
        console.log(`   - ${e.operation} at ${e.created_at}`);
      });
    } else {
      console.log('\n⚠️ No orchestration events found');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function step3_subscribeToEvents(auth, taskId) {
  console.log('\n📡 STEP 3: Subscribe to Real-time Events');
  console.log('=' .repeat(60));
  
  if (!taskId) {
    console.log('⚠️ No task ID provided, skipping...');
    return;
  }
  
  try {
    const supabase = await createAuthenticatedClient(auth);
    if (!supabase) {
      console.log('❌ Failed to create authenticated client');
      return;
    }
    
    console.log('Setting up real-time subscription for task:', taskId);
    
    let eventCount = 0;
    const channel = supabase.channel(`task-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_context_events',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          eventCount++;
          const event = payload.new;
          console.log(`\n📡 Real-time Event #${eventCount}:`);
          console.log('   Operation:', event.operation);
          console.log('   Actor:', event.actor_id);
          console.log('   Timestamp:', event.created_at);
        }
      )
      .subscribe();
    
    console.log('✅ Subscribed to real-time events');
    console.log('⏳ Waiting 10 seconds for events...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    if (eventCount === 0) {
      console.log('⚠️ No real-time events received');
      console.log('   Orchestration may not be running or may have completed');
    } else {
      console.log(`\n✅ Received ${eventCount} real-time events`);
    }
    
    // Unsubscribe
    await channel.unsubscribe();
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function step4_checkBackendHealth() {
  console.log('\n🏥 STEP 4: Check Backend Health');
  console.log('=' .repeat(60));
  
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    
    console.log('✅ Backend is healthy!');
    console.log('   Status:', response.data.status);
    console.log('   Database:', response.data.database);
    console.log('   Timestamp:', response.data.timestamp);
    
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    console.log('   Make sure the backend is running: npm run dev');
    return false;
  }
}

async function step5_checkTaskDetails(auth, taskId) {
  console.log('\n🔍 STEP 5: Check Task Details');
  console.log('=' .repeat(60));
  
  if (!taskId) {
    console.log('⚠️ No task ID provided, skipping...');
    return;
  }
  
  try {
    const supabase = await createAuthenticatedClient(auth);
    if (!supabase) {
      console.log('❌ Failed to create authenticated client');
      return;
    }
    
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (error) {
      console.error('❌ Failed to fetch task:', error);
      return;
    }
    
    console.log('✅ Task details:');
    console.log('   ID:', task.id);
    console.log('   Title:', task.title);
    console.log('   Status:', task.status);
    console.log('   Type:', task.task_type);
    console.log('   Priority:', task.priority);
    console.log('   Created:', task.created_at);
    
    if (task.metadata) {
      console.log('   Metadata:');
      console.log('     Template ID:', task.metadata.templateId);
      console.log('     Template Snapshot:', task.metadata.templateSnapshot ? 'Present' : 'Missing');
      
      if (task.metadata.templateSnapshot) {
        const snapshot = task.metadata.templateSnapshot;
        console.log('     Template Goals:', snapshot.goals?.primary?.length || 0, 'primary goals');
      }
    }
    
    // Check if orchestration has been attempted
    if (task.metadata?.orchestration) {
      console.log('\n🎯 Orchestration metadata found:');
      console.log('   Status:', task.metadata.orchestration.status);
      console.log('   Started:', task.metadata.orchestration.startedAt);
      console.log('   Plan:', task.metadata.orchestration.executionPlan ? 'Present' : 'Missing');
    } else {
      console.log('\n⚠️ No orchestration metadata found');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function runIntegrationTest() {
  console.log('🔬 Step-by-Step Orchestration Integration Test');
  console.log('=' .repeat(60));
  console.log('Testing with authenticated user context\n');
  
  // Load authentication
  const auth = await loadAuthState();
  if (!auth) {
    console.error('❌ No authentication found. Run universal-auth-capture.js first');
    return;
  }
  
  console.log('✅ Authenticated as:', auth.email);
  console.log('   User ID:', auth.userId);
  
  // Step 4: Check backend health first
  const backendHealthy = await step4_checkBackendHealth();
  if (!backendHealthy) {
    console.log('\n⚠️ Backend not healthy. Please start it with: npm run dev');
    return;
  }
  
  // Step 1: Create a task via API
  const taskId = await step1_testAPITaskCreation(auth);
  
  if (taskId) {
    // Step 2: Check for events
    await step2_checkTaskEvents(auth, taskId);
    
    // Step 3: Subscribe to real-time events
    await step3_subscribeToEvents(auth, taskId);
    
    // Step 5: Check final task details
    await step5_checkTaskDetails(auth, taskId);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 INTEGRATION TEST SUMMARY');
  console.log('=' .repeat(60));
  
  console.log('\nKey Findings:');
  console.log('1. Backend health: ' + (backendHealthy ? '✅ Healthy' : '❌ Not running'));
  console.log('2. Task creation: ' + (taskId ? '✅ Working' : '❌ Failed'));
  console.log('3. Event generation: Check events above');
  console.log('4. Real-time updates: Check subscription results');
  
  console.log('\nNext Steps:');
  console.log('- If no orchestration events, check OrchestratorAgent initialization');
  console.log('- If no real-time events, check PostgreSQL LISTEN/NOTIFY');
  console.log('- Review backend logs for orchestration activity');
  console.log('- Verify template is loaded correctly');
  
  // Don't cleanup - keep task for investigation
  if (taskId) {
    console.log('\n📌 Task ID for investigation:', taskId);
    console.log('   (Task not deleted for debugging purposes)');
  }
}

// Run the test
runIntegrationTest().catch(console.error);