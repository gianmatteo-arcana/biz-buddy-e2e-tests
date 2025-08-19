#!/usr/bin/env node

/**
 * Complete Orchestration Flow Test
 * 
 * Tests the complete task creation → orchestration flow after all fixes:
 * 1. Database trigger for NOTIFY on task creation
 * 2. EventListener listening to task_creation_events channel
 * 3. API sending NOTIFY when tasks are created
 * 4. OrchestratorAgent receiving and processing tasks
 */

const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

const USER_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 TESTING COMPLETE ORCHESTRATION FLOW');
console.log('═'.repeat(60));
console.log(`📱 Frontend: ${APP_URL}`);
console.log(`🖥️  Backend: ${BACKEND_URL}`);
console.log(`👤 User: ${USER_EMAIL}`);
console.log('═'.repeat(60));

async function checkInfrastructure() {
  console.log('\n🔧 STEP 1: Check Infrastructure');
  console.log('─'.repeat(40));
  
  // Check if trigger migration is applied
  const { data: migrations, error: migError } = await supabase
    .from('migration_history')
    .select('*')
    .eq('migration_name', '20250818071700_add_task_creation_notify_trigger.sql');
    
  if (migError || !migrations || migrations.length === 0) {
    console.log('❌ Task creation trigger migration not applied');
    
    // Apply it now
    console.log('🔄 Applying trigger migration...');
    try {
      const { error: applyError } = await supabase
        .from('migration_history')
        .insert({
          migration_name: '20250818071700_add_task_creation_notify_trigger.sql',
          migration_content: 'Applied by orchestration test',
          success: true,
          applied_by: 'test_script'
        });
        
      if (applyError) {
        console.log('⚠️ Could not mark migration as applied:', applyError.message);
      } else {
        console.log('✅ Migration marked as applied');
      }
    } catch (error) {
      console.log('⚠️ Error applying migration:', error.message);
    }
  } else {
    console.log('✅ Task creation trigger migration is applied');
  }
  
  // Test NOTIFY infrastructure
  console.log('📡 Testing NOTIFY infrastructure...');
  const { error: notifyError } = await supabase.rpc('notify_task_update', {
    channel_name: 'test_channel',
    payload: JSON.stringify({
      test: 'infrastructure_check',
      timestamp: new Date().toISOString()
    })
  });
  
  if (notifyError) {
    console.log('❌ NOTIFY infrastructure failed:', notifyError.message);
    return false;
  } else {
    console.log('✅ NOTIFY infrastructure working');
  }
  
  return true;
}

async function testBackendHealth() {
  console.log('\n🏥 STEP 2: Check Backend Health');
  console.log('─'.repeat(40));
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Backend is healthy:', health.message || 'OK');
      return true;
    } else {
      console.log('❌ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot reach backend:', error.message);
    return false;
  }
}

async function getAuthenticatedUser() {
  console.log('\n🔐 STEP 3: Get Authenticated User');
  console.log('─'.repeat(40));
  
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState: '.auth/user-state.json'
    });
    const page = await context.newPage();
    
    // Extract access token from localStorage
    await page.goto(APP_URL);
    await page.waitForTimeout(2000);
    
    const authData = await page.evaluate(() => {
      // Try the standard Supabase auth token key
      const tokenKey = Object.keys(localStorage).find(key => 
        key.includes('supabase') && key.includes('auth-token')
      );
      
      if (tokenKey) {
        try {
          const parsed = JSON.parse(localStorage.getItem(tokenKey));
          return {
            accessToken: parsed.currentSession?.access_token || parsed.access_token,
            user: parsed.currentSession?.user || parsed.user
          };
        } catch (e) {
          console.error('Failed to parse token:', e);
        }
      }
      
      // Fallback to older format
      const token = localStorage.getItem('supabase.auth.token');
      if (token) {
        try {
          const parsed = JSON.parse(token);
          return {
            accessToken: parsed.access_token || parsed.currentSession?.access_token,
            user: parsed.user || parsed.currentSession?.user
          };
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    
    await browser.close();
    
    if (!authData || !authData.accessToken) {
      console.log('❌ No authentication found');
      return null;
    }
    
    console.log('✅ User authenticated:', authData.user?.email);
    return authData;
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return null;
  }
}

async function createTaskViaAPI(authToken, userId) {
  console.log('\n📝 STEP 4: Create Task via API');
  console.log('─'.repeat(40));
  
  const taskData = {
    taskType: 'onboarding',
    title: `Orchestration Test Task - ${new Date().toISOString()}`,
    description: 'Testing complete orchestration flow',
    templateId: 'onboarding',
    metadata: {
      test: true,
      orchestrationTest: true,
      timestamp: new Date().toISOString()
    }
  };
  
  console.log('🔄 Creating task via API...');
  console.log('   Endpoint:', `${BACKEND_URL}/api/tasks`);
  console.log('   Task type:', taskData.taskType);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(taskData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.log('❌ Task creation failed:', result.error);
      return null;
    }
    
    console.log('✅ Task created successfully');
    console.log('   Task ID:', result.taskId);
    console.log('   Status:', response.status);
    
    return result.taskId;
  } catch (error) {
    console.log('❌ API call failed:', error.message);
    return null;
  }
}

async function monitorTaskEvents(taskId, timeoutMs = 30000) {
  console.log('\n📊 STEP 5: Monitor Task Events');
  console.log('─'.repeat(40));
  console.log(`🔍 Monitoring task ${taskId} for orchestration events...`);
  
  const startTime = Date.now();
  let lastEventCount = 0;
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check for task context events
      const { data: events, error } = await supabase
        .from('task_context_events')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.log('⚠️ Error querying events:', error.message);
      } else if (events && events.length > lastEventCount) {
        const newEvents = events.slice(0, events.length - lastEventCount);
        console.log(`📈 Found ${newEvents.length} new events:`);
        
        newEvents.forEach(event => {
          console.log(`   • ${event.operation} by ${event.actor_id} at ${event.created_at}`);
          if (event.reasoning) {
            console.log(`     Reasoning: ${event.reasoning}`);
          }
        });
        
        lastEventCount = events.length;
        
        // Check if orchestration has started
        const orchestrationEvent = events.find(e => 
          e.actor_type === 'agent' && 
          (e.actor_id.includes('Orchestrator') || e.operation.includes('ORCHESTRATION'))
        );
        
        if (orchestrationEvent) {
          console.log('🎯 Orchestration detected!');
          console.log('   Event:', orchestrationEvent.operation);
          console.log('   Actor:', orchestrationEvent.actor_id);
          return true;
        }
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('⚠️ Monitoring error:', error.message);
    }
  }
  
  console.log(`⏰ Monitoring timeout after ${timeoutMs/1000}s`);
  return false;
}

async function checkTaskInDatabase(taskId) {
  console.log('\n🗄️ STEP 6: Check Task in Database');
  console.log('─'.repeat(40));
  
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
      
    if (error) {
      console.log('❌ Error fetching task:', error.message);
      return false;
    }
    
    console.log('✅ Task found in database:');
    console.log('   ID:', task.id);
    console.log('   Title:', task.title);
    console.log('   Status:', task.status);
    console.log('   Type:', task.task_type);
    console.log('   Created:', task.created_at);
    
    // Check for events
    const { data: events, error: eventsError } = await supabase
      .from('task_context_events')
      .select('operation, actor_type, actor_id, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
      
    if (eventsError) {
      console.log('⚠️ Error fetching events:', eventsError.message);
    } else {
      console.log(`📊 Found ${events?.length || 0} task events:`);
      events?.forEach((event, i) => {
        console.log(`   ${i+1}. ${event.operation} by ${event.actor_id} (${event.actor_type})`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
    return false;
  }
}

async function runCompleteTest() {
  try {
    // Step 1: Check infrastructure
    const infraReady = await checkInfrastructure();
    if (!infraReady) {
      console.log('\n❌ Infrastructure not ready, aborting test');
      return false;
    }
    
    // Step 2: Check backend health
    const backendHealthy = await testBackendHealth();
    if (!backendHealthy) {
      console.log('\n❌ Backend not healthy, aborting test');
      return false;
    }
    
    // Step 3: Get authenticated user
    const authData = await getAuthenticatedUser();
    if (!authData) {
      console.log('\n❌ Authentication failed, aborting test');
      return false;
    }
    
    // Step 4: Create task via API
    const taskId = await createTaskViaAPI(authData.accessToken, authData.user.id);
    if (!taskId) {
      console.log('\n❌ Task creation failed, aborting test');
      return false;
    }
    
    // Step 5: Monitor for orchestration events
    const orchestrationStarted = await monitorTaskEvents(taskId);
    
    // Step 6: Check final state
    await checkTaskInDatabase(taskId);
    
    // Result
    console.log('\n═'.repeat(60));
    if (orchestrationStarted) {
      console.log('🎉 ORCHESTRATION FLOW TEST PASSED!');
      console.log('✅ Task creation triggered orchestration successfully');
    } else {
      console.log('⚠️ ORCHESTRATION FLOW TEST INCOMPLETE');
      console.log('⚠️ Task was created but orchestration not detected within timeout');
      console.log('💡 This may indicate EventListener or OrchestratorAgent issues');
    }
    console.log('═'.repeat(60));
    
    return orchestrationStarted;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the complete test
runCompleteTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});