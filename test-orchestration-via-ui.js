#!/usr/bin/env node

/**
 * Orchestration Test via UI
 * 
 * Uses the Dev Toolkit UI to create a task and monitor orchestration events.
 * This bypasses authentication complexities by using the UI's built-in auth.
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NTU1OTQsImV4cCI6MjAzODIzMTU5NH0.o0PnwdsML8gNvcSfiDq0yQnqQx1v9J-xpWYrZEHhTQI';

// Create Supabase client for monitoring
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function step1_createTaskViaUI(page) {
  console.log('\n📝 STEP 1: Create Task via Dev Toolkit UI');
  console.log('=' .repeat(60));
  
  // Navigate to dev toolkit
  await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Check authentication status
  const isAuthenticated = await page.locator('text=Authenticated').isVisible().catch(() => false);
  console.log('   Authentication status:', isAuthenticated ? '✅ Authenticated' : '⚠️ Not authenticated');
  
  // Find the task creation dropdown
  const dropdown = page.locator('button[role="combobox"]').first();
  const isDisabled = await dropdown.getAttribute('disabled');
  
  if (isDisabled !== null) {
    console.log('❌ Dropdown is disabled - authentication may be required');
    return null;
  }
  
  console.log('✅ Dropdown is enabled, clicking...');
  await dropdown.click();
  await page.waitForTimeout(500);
  
  // Look for any task option in the dropdown
  // Try different possible labels
  const possibleOptions = [
    'text=Onboarding',
    'text=User Onboarding',
    'text=Business Onboarding',
    'text=onboarding',
    '[role="option"]' // Generic option selector
  ];
  
  let selectedOption = null;
  let optionText = null;
  
  for (const selector of possibleOptions) {
    const option = page.locator(selector).first();
    if (await option.isVisible().catch(() => false)) {
      selectedOption = option;
      optionText = await option.textContent();
      console.log(`✅ Found option: "${optionText}"`);
      break;
    }
  }
  
  if (!selectedOption) {
    // List all visible options for debugging
    const allOptions = await page.locator('[role="option"]').allTextContents().catch(() => []);
    console.log('❌ No suitable option found');
    console.log('   Available options:', allOptions.length > 0 ? allOptions : 'None visible');
    return null;
  }
  
  console.log(`✅ Clicking option: "${optionText}"...`);
  await selectedOption.click();
  
  // Wait for task creation
  console.log('⏳ Waiting for task creation...');
  await page.waitForTimeout(3000);
  
  // Try to capture the task ID from the UI
  let taskId = null;
  
  // Method 1: Check for task badge with various patterns
  const taskPatterns = [
    'text=/Task:.*[a-f0-9-]{36}/',
    'text=/task.*[a-f0-9-]{36}/i',
    'text=/[a-f0-9]{8}-[a-f0-9]{4}/'
  ];
  
  for (const pattern of taskPatterns) {
    const taskBadge = page.locator(pattern).first();
    if (await taskBadge.isVisible().catch(() => false)) {
      const taskText = await taskBadge.textContent();
      const match = taskText.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
      if (match) {
        taskId = match[1];
        console.log('✅ Task created via UI!');
        console.log('   Task ID:', taskId);
        break;
      }
    }
  }
  
  // Method 2: Check for success toast/notification
  if (!taskId) {
    const successIndicators = [
      'text=/Task.*created/i',
      'text=/Success/i',
      'text=/Created.*task/i'
    ];
    
    for (const indicator of successIndicators) {
      const element = page.locator(indicator).first();
      if (await element.isVisible().catch(() => false)) {
        console.log('✅ Task creation success indicator found');
        const text = await element.textContent();
        console.log('   Message:', text);
        // Try to extract task ID from the message
        const match = text.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
        if (match) {
          taskId = match[1];
          console.log('   Extracted Task ID:', taskId);
        }
        break;
      }
    }
  }
  
  // If no task badge, check the timeline for new task
  if (!taskId) {
    // Click on Task History tab
    const historyTab = page.locator('text=Task History');
    if (await historyTab.isVisible()) {
      await historyTab.click();
      await page.waitForTimeout(1000);
      
      // Look for the most recent task
      const taskCards = page.locator('[data-testid*="task"]');
      const count = await taskCards.count();
      if (count > 0) {
        // Get the first (most recent) task
        const firstTask = taskCards.first();
        const taskText = await firstTask.textContent();
        const match = taskText.match(/([a-f0-9-]{36})/);
        if (match) {
          taskId = match[1];
          console.log('✅ Found task in history');
          console.log('   Task ID:', taskId);
        }
      }
    }
  }
  
  // Fallback: Query database for most recent task
  if (!taskId) {
    console.log('⚠️ Could not find task ID in UI, checking database...');
    
    // Get user ID from localStorage
    const userData = await page.evaluate(() => {
      const tokenData = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      return tokenData ? JSON.parse(tokenData) : null;
    });
    
    if (userData?.user?.id) {
      const userId = userData.user.id;
      console.log('   User ID:', userId);
      
      // Query for most recent task
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, created_at, task_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (tasks && tasks.length > 0) {
        const recentTask = tasks[0];
        // Check if it was created recently (within last 10 seconds)
        const createdAt = new Date(recentTask.created_at);
        const now = new Date();
        const ageMs = now - createdAt;
        
        if (ageMs < 10000) { // Less than 10 seconds old
          taskId = recentTask.id;
          console.log('✅ Found recently created task in database');
          console.log('   Task ID:', taskId);
          console.log('   Title:', recentTask.title);
          console.log('   Type:', recentTask.task_type);
        } else {
          console.log('   Most recent task is too old:', Math.floor(ageMs/1000), 'seconds');
        }
      }
    }
  }
  
  return taskId;
}

async function step2_monitorOrchestration(taskId) {
  console.log('\n🎯 STEP 2: Monitor Orchestration Events');
  console.log('=' .repeat(60));
  console.log('Task ID:', taskId);
  
  const duration = 20000; // 20 seconds
  const startTime = Date.now();
  
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
        console.log(`\n📡 [+${elapsed}s] Real-time Event:`);
        console.log(`   Operation: ${event.operation}`);
        console.log(`   Actor: ${event.actor_id}`);
        if (event.reasoning) {
          console.log(`   Reasoning: ${event.reasoning.substring(0, 100)}`);
        }
        
        // Check for orchestration activity
        if (event.actor_id === 'OrchestratorAgent') {
          console.log('   🎉 ORCHESTRATOR ACTIVE!');
        }
        if (event.operation?.includes('EXECUTION_PLAN')) {
          console.log('   📋 EXECUTION PLAN CREATED!');
        }
      }
    )
    .subscribe();
  
  console.log('📡 Real-time subscription active');
  console.log(`⏱️ Monitoring for ${duration/1000} seconds...`);
  
  // Poll for events periodically
  let lastEventCount = 0;
  const orchestrationEvents = [];
  const agentEvents = new Set();
  
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
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`   [+${elapsed}s] ${e.operation} by ${e.actor_id}`);
        
        // Track orchestration events
        if (e.actor_id === 'OrchestratorAgent' || 
            e.operation?.includes('ORCHESTRATION') ||
            e.operation?.includes('EXECUTION_PLAN')) {
          orchestrationEvents.push(e);
        }
        
        // Track agent activity
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
    events: allEvents || [],
    orchestrationEvents,
    activeAgents: Array.from(agentEvents)
  };
}

async function step3_checkTaskDetails(page, taskId) {
  console.log('\n📋 STEP 3: Check Task Details in UI');
  console.log('=' .repeat(60));
  
  // Navigate to Task Timeline tab
  const timelineTab = page.locator('text=Task Timeline');
  if (await timelineTab.isVisible()) {
    await timelineTab.click();
    await page.waitForTimeout(2000);
    
    // Check for timeline events
    const timelineEvents = await page.locator('.timeline-item').count();
    console.log(`   Timeline events visible: ${timelineEvents}`);
    
    // Look for orchestration indicators
    const orchestratorMentions = await page.locator('text=/OrchestratorAgent/i').count();
    console.log(`   OrchestratorAgent mentions: ${orchestratorMentions}`);
    
    // Check for execution plan
    const executionPlan = await page.locator('text=/execution.*plan/i').isVisible().catch(() => false);
    console.log(`   Execution plan visible: ${executionPlan ? '✅' : '❌'}`);
  }
  
  // Check Task History tab
  const historyTab = page.locator('text=Task History');
  if (await historyTab.isVisible()) {
    await historyTab.click();
    await page.waitForTimeout(1000);
    
    // Look for our task
    const taskCard = page.locator(`text=/${taskId.substring(0, 8)}/`).first();
    if (await taskCard.isVisible()) {
      console.log('   Task found in history: ✅');
      const taskContent = await taskCard.textContent();
      if (taskContent.includes('Onboarding')) {
        console.log('   Task type confirmed: Onboarding ✅');
      }
    }
  }
}

async function analyzeResults(result) {
  console.log('\n📊 ANALYSIS');
  console.log('=' .repeat(60));
  
  const { events, orchestrationEvents, activeAgents } = result;
  
  console.log('\n📈 Event Statistics:');
  console.log(`   Total events: ${events.length}`);
  console.log(`   Orchestration events: ${orchestrationEvents.length}`);
  console.log(`   Active agents: ${activeAgents.length}`);
  
  if (activeAgents.length > 0) {
    console.log('\n🤖 Active Agents:');
    activeAgents.forEach(agent => {
      const agentEvents = events.filter(e => e.actor_id === agent);
      console.log(`   - ${agent}: ${agentEvents.length} events`);
    });
  }
  
  if (orchestrationEvents.length > 0) {
    console.log('\n🎯 Orchestration Activity:');
    orchestrationEvents.slice(0, 5).forEach(e => {
      console.log(`   - ${e.operation}`);
      if (e.data?.executionPlan) {
        console.log('     📋 Execution plan present');
      }
    });
  }
  
  // Determine success
  const hasOrchestration = orchestrationEvents.length > 0;
  const hasExecutionPlan = orchestrationEvents.some(e => 
    e.operation === 'EXECUTION_PLAN_CREATED' || e.data?.executionPlan
  );
  const hasAgentActivity = activeAgents.length > 1; // More than just system/orchestrator
  
  console.log('\n✅ Success Criteria:');
  console.log(`   Orchestration active: ${hasOrchestration ? '✅' : '❌'}`);
  console.log(`   Execution plan created: ${hasExecutionPlan ? '✅' : '❌'}`);
  console.log(`   Multiple agents active: ${hasAgentActivity ? '✅' : '❌'}`);
  
  return {
    success: hasOrchestration || hasAgentActivity,
    hasOrchestration,
    hasExecutionPlan,
    hasAgentActivity
  };
}

async function runOrchestrationTest() {
  console.log('🔬 Orchestration Test via UI');
  console.log('=' .repeat(60));
  console.log('Using Dev Toolkit UI to create task and monitor orchestration\n');
  
  let browser;
  let context;
  let page;
  
  try {
    // Load auth session
    const authPath = path.join(process.cwd(), '.auth', 'user-state.json');
    const authExists = await fs.access(authPath).then(() => true).catch(() => false);
    
    if (!authExists) {
      console.error('❌ No auth session found. Run universal-auth-capture.js first');
      return;
    }
    
    const authState = JSON.parse(await fs.readFile(authPath, 'utf-8'));
    console.log('✅ Auth session loaded');
    
    // Launch browser
    browser = await chromium.launch({ 
      headless: process.env.HEADLESS !== 'false' 
    });
    
    context = await browser.newContext({
      storageState: authState,
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Orchestrator') || text.includes('Task created')) {
        console.log('🔍 Browser log:', text);
      }
    });
    
    // Step 1: Create task via UI
    const taskId = await step1_createTaskViaUI(page);
    if (!taskId) {
      throw new Error('Failed to create task via UI');
    }
    
    // Step 2: Monitor orchestration events
    const result = await step2_monitorOrchestration(taskId);
    
    // Step 3: Check task details in UI
    await step3_checkTaskDetails(page, taskId);
    
    // Analyze results
    const analysis = await analyzeResults(result);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    if (analysis.success) {
      console.log('\n🎉 SUCCESS! Orchestration is working!');
      if (analysis.hasOrchestration) {
        console.log('   ✅ OrchestratorAgent is responding to task creation');
      }
      if (analysis.hasExecutionPlan) {
        console.log('   ✅ Execution plan was generated');
      }
      if (analysis.hasAgentActivity) {
        console.log('   ✅ Multiple agents are active');
      }
    } else {
      console.log('\n⚠️ Orchestration not detected');
      console.log('   Possible issues:');
      console.log('   - OrchestratorAgent may not be initialized');
      console.log('   - Event listeners may not be configured');
      console.log('   - Template loading may have failed');
    }
    
    console.log('\n📌 Task ID for debugging:', taskId);
    console.log('   View at:', `${APP_URL}/dev-toolkit-standalone`);
    
    // Keep browser open for a bit to see results
    if (process.env.HEADLESS === 'false') {
      console.log('\n⏰ Keeping browser open for 10 seconds...');
      await page.waitForTimeout(10000);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Take screenshot on failure
    if (page) {
      const screenshotPath = `test-orchestration-ui-error-${Date.now()}.png`;
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
runOrchestrationTest().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});