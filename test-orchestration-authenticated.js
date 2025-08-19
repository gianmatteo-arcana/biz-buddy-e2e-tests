#!/usr/bin/env node

/**
 * Authenticated Orchestration Integration Test
 * 
 * Uses the authenticated session from e2e tests to validate
 * the complete orchestration flow with declarative templates.
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NTU1OTQsImV4cCI6MjAzODIzMTU5NH0.o0PnwdsML8gNvcSfiDq0yQnqQx1v9J-xpWYrZEHhTQI';

// Create Supabase client with anon key for monitoring
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadAuthSession() {
  console.log('\n🔐 Loading authenticated session');
  console.log('=' .repeat(60));
  
  const authPath = path.join(process.cwd(), '.auth', 'user-state.json');
  
  try {
    const authData = await fs.readFile(authPath, 'utf-8');
    const authState = JSON.parse(authData);
    
    // Extract user info from cookies
    const cookies = authState.cookies || [];
    let userId = null;
    let userEmail = null;
    
    // Look for sb-auth-token cookie
    const authCookie = cookies.find(c => c.name.includes('sb-') && c.name.includes('auth-token'));
    if (authCookie) {
      try {
        // Parse JWT to get user info
        const tokenParts = authCookie.value.split('.');
        if (tokenParts.length >= 2) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          userId = payload.sub;
          userEmail = payload.email;
        }
      } catch (e) {
        console.log('Could not parse auth token');
      }
    }
    
    console.log('✅ Auth session loaded');
    console.log('   User ID:', userId || 'Unknown');
    console.log('   Email:', userEmail || 'Unknown');
    
    return { authState, userId, userEmail };
  } catch (error) {
    console.error('❌ Failed to load auth session:', error.message);
    throw new Error('Please run universal-auth-capture.js first to create auth session');
  }
}

async function step1_createTaskViaUI(page) {
  console.log('\n📝 STEP 1: Create Task via UI');
  console.log('=' .repeat(60));
  
  // Navigate to dashboard
  await page.goto(APP_URL);
  await page.waitForTimeout(2000);
  
  // Check if we're authenticated
  const isAuthenticated = await page.evaluate(() => {
    return !!localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
  });
  
  if (!isAuthenticated) {
    throw new Error('Not authenticated - auth session may be expired');
  }
  
  console.log('✅ Authenticated and on dashboard');
  
  // Create a new task through the UI
  // Look for "New Task" or similar button
  const newTaskButton = await page.getByRole('button', { name: /new task|create task|add task/i }).first();
  if (await newTaskButton.isVisible()) {
    await newTaskButton.click();
    console.log('   Clicked New Task button');
    
    // Wait for form/modal
    await page.waitForTimeout(1000);
    
    // Fill in task details
    const titleInput = await page.getByPlaceholder(/title|name/i).first();
    if (await titleInput.isVisible()) {
      const taskTitle = `Integration Test: Onboarding ${Date.now()}`;
      await titleInput.fill(taskTitle);
      console.log('   Filled task title:', taskTitle);
      
      // Look for template selector
      const templateSelect = await page.getByRole('combobox').first();
      if (await templateSelect.isVisible()) {
        await templateSelect.selectOption('onboarding');
        console.log('   Selected onboarding template');
      }
      
      // Submit the form
      const submitButton = await page.getByRole('button', { name: /create|submit|save/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('   Submitted task creation');
        
        // Wait for task to be created
        await page.waitForTimeout(2000);
        
        // Get the created task ID from the URL or page
        const url = page.url();
        const taskIdMatch = url.match(/task[s]?\/([a-f0-9-]+)/);
        const taskId = taskIdMatch ? taskIdMatch[1] : null;
        
        console.log('✅ Task created via UI');
        console.log('   Task ID:', taskId || 'Unknown');
        
        return taskId;
      }
    }
  }
  
  // Fallback: Create task programmatically via API
  console.log('⚠️ Could not find UI elements, creating via API');
  return await createTaskViaAPI(page);
}

async function createTaskViaAPI(page) {
  // Get auth token from page context - it's stored as JSON
  const authData = await page.evaluate(() => {
    const tokenData = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
    return tokenData ? JSON.parse(tokenData) : null;
  });
  
  if (!authData || !authData.access_token) {
    throw new Error('No auth token found in localStorage');
  }
  
  const accessToken = authData.access_token;
  console.log('   Found access token:', accessToken.substring(0, 20) + '...');
  
  const response = await fetch(`${BACKEND_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      title: `Integration Test: Onboarding ${Date.now()}`,
      description: 'Testing declarative template orchestration',
      task_type: 'onboarding',
      template_id: 'onboarding',
      metadata: {
        source: 'authenticated_integration_test',
        businessName: 'Test Business LLC'
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create task via API: ${error}`);
  }
  
  const task = await response.json();
  console.log('✅ Task created via API');
  console.log('   Task ID:', task.id);
  
  return task.id;
}

async function step2_monitorOrchestration(taskId, userId) {
  console.log('\n🎯 STEP 2: Monitor Orchestration');
  console.log('=' .repeat(60));
  console.log('Monitoring task:', taskId);
  console.log('User ID:', userId);
  
  const startTime = Date.now();
  const duration = 20000; // 20 seconds
  
  // Set up real-time subscription
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
        const event = payload.new;
        console.log(`\n📡 Real-time Event:`);
        console.log(`   Time: ${new Date(event.created_at).toISOString()}`);
        console.log(`   Operation: ${event.operation}`);
        console.log(`   Actor: ${event.actor_id}`);
        if (event.data) {
          console.log(`   Data:`, JSON.stringify(event.data).substring(0, 100));
        }
      }
    )
    .subscribe();
  
  console.log('📡 Real-time subscription active');
  console.log(`⏱️ Monitoring for ${duration/1000} seconds...`);
  
  // Poll for events periodically
  let lastEventCount = 0;
  const pollInterval = setInterval(async () => {
    const { data: events, error } = await supabase
      .from('task_context_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching events:', error);
      return;
    }
    
    if (events && events.length > lastEventCount) {
      const newEvents = events.slice(lastEventCount);
      console.log(`\n📈 ${newEvents.length} new events detected`);
      
      newEvents.forEach(e => {
        console.log(`   - ${e.operation} by ${e.actor_id}`);
      });
      
      lastEventCount = events.length;
      
      // Check for orchestration activity
      const orchestrationEvent = newEvents.find(e => 
        e.actor_id === 'OrchestratorAgent' ||
        e.operation?.includes('ORCHESTRATION') ||
        e.operation?.includes('EXECUTION_PLAN')
      );
      
      if (orchestrationEvent) {
        console.log('\n🎉 Orchestration detected!');
        console.log('   Event:', orchestrationEvent.operation);
      }
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
  
  return allEvents || [];
}

async function step3_analyzeResults(taskId, events) {
  console.log('\n📋 STEP 3: Analyze Results');
  console.log('=' .repeat(60));
  
  // Get task details
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  
  console.log('\n📌 Task State:');
  console.log('   Status:', task?.status || 'unknown');
  console.log('   Template:', task?.template_id || 'none');
  console.log('   Metadata:', task?.metadata ? 'Present' : 'Missing');
  
  console.log('\n📊 Event Analysis:');
  console.log('   Total Events:', events.length);
  
  // Group events by actor
  const eventsByActor = {};
  events.forEach(e => {
    const actor = e.actor_id || 'system';
    if (!eventsByActor[actor]) {
      eventsByActor[actor] = [];
    }
    eventsByActor[actor].push(e.operation);
  });
  
  console.log('\n🤖 Activity by Agent:');
  Object.entries(eventsByActor).forEach(([actor, operations]) => {
    console.log(`   ${actor}: ${operations.length} events`);
    operations.slice(0, 3).forEach(op => {
      console.log(`     - ${op}`);
    });
  });
  
  // Check for key events
  const hasOrchestration = events.some(e => 
    e.actor_id === 'OrchestratorAgent' ||
    e.operation?.includes('ORCHESTRATION')
  );
  
  const hasExecutionPlan = events.some(e => 
    e.operation === 'EXECUTION_PLAN_CREATED' ||
    e.data?.executionPlan
  );
  
  const hasAgentActivity = events.some(e => 
    e.actor_id && 
    e.actor_id !== 'system' && 
    e.actor_id !== 'OrchestratorAgent'
  );
  
  return {
    totalEvents: events.length,
    hasOrchestration,
    hasExecutionPlan,
    hasAgentActivity,
    eventsByActor,
    finalStatus: task?.status
  };
}

async function runAuthenticatedTest() {
  console.log('🔬 Authenticated Orchestration Integration Test');
  console.log('=' .repeat(60));
  console.log('Testing with real authentication and declarative templates\n');
  
  let browser;
  let context;
  let page;
  
  try {
    // Load auth session
    const { authState, userId } = await loadAuthSession();
    
    // Launch browser with auth
    browser = await chromium.launch({ 
      headless: process.env.HEADLESS !== 'false' 
    });
    
    context = await browser.newContext({
      storageState: authState
    });
    
    page = await context.newPage();
    
    // Step 1: Create task
    const taskId = await step1_createTaskViaUI(page);
    if (!taskId) {
      throw new Error('Failed to create task');
    }
    
    // Step 2: Monitor orchestration
    const events = await step2_monitorOrchestration(taskId, userId);
    
    // Step 3: Analyze results
    const analysis = await step3_analyzeResults(taskId, events);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n✅ Test Steps:');
    console.log('   1. Authentication: ✅');
    console.log('   2. Task Creation: ✅');
    console.log('   3. Event Monitoring: ✅');
    
    console.log('\n📊 Orchestration Results:');
    console.log('   Total Events:', analysis.totalEvents);
    console.log('   Orchestration Active:', analysis.hasOrchestration ? '✅ Yes' : '❌ No');
    console.log('   Execution Plan:', analysis.hasExecutionPlan ? '✅ Yes' : '❌ No');
    console.log('   Agent Activity:', analysis.hasAgentActivity ? '✅ Yes' : '❌ No');
    console.log('   Final Status:', analysis.finalStatus);
    
    if (!analysis.hasOrchestration) {
      console.log('\n⚠️ Potential Issues:');
      console.log('   - OrchestratorAgent may not be responding to events');
      console.log('   - Check backend logs for agent initialization');
      console.log('   - Verify LISTEN/NOTIFY is configured correctly');
      console.log('   - Ensure declarative template is loading properly');
    } else {
      console.log('\n✅ Orchestration is working with declarative templates!');
    }
    
    // Keep task for debugging
    console.log('\n📌 Debug Information:');
    console.log('   Task ID:', taskId);
    console.log('   User ID:', userId);
    console.log('   View at:', `${APP_URL}/tasks/${taskId}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Take screenshot on failure
    if (page) {
      const screenshotPath = `test-orchestration-error-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('📸 Error screenshot saved:', screenshotPath);
    }
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
runAuthenticatedTest().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});