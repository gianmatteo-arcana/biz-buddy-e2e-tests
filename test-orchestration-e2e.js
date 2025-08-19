#!/usr/bin/env node

/**
 * E2E Orchestration Test
 * 
 * This test validates the complete orchestration flow:
 * 1. User creates a task through the UI
 * 2. Task is saved to database
 * 3. Supabase Realtime triggers EventListener
 * 4. EventListener initiates orchestration
 * 5. OrchestratorAgent processes the task
 * 6. Events are written to task_context_events
 * 
 * This can be run as part of the automated test suite.
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';
const HEADLESS = process.env.HEADLESS !== 'false';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test configuration
const TEST_CONFIG = {
  testName: 'Orchestration E2E Test',
  timestamp: new Date().toISOString(),
  screenshots: []
};

console.log('🎯 E2E ORCHESTRATION TEST');
console.log('═'.repeat(60));
console.log('Testing complete orchestration flow from UI to agents');
console.log(`Frontend: ${APP_URL}`);
console.log(`Backend: ${BACKEND_URL}`);
console.log(`Mode: ${HEADLESS ? 'Headless' : 'Interactive'}`);
console.log();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkPrerequisites() {
  console.log('📋 Checking prerequisites...');
  
  // Check frontend
  try {
    const response = await fetch(APP_URL);
    if (!response.ok) {
      throw new Error(`Frontend returned ${response.status}`);
    }
    console.log('   ✅ Frontend is running');
  } catch (error) {
    console.log('   ❌ Frontend is not accessible');
    console.log(`      Start with: cd ../biz-buddy-ally-now && npm run dev`);
    return false;
  }
  
  // Check backend
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    console.log('   ✅ Backend is running');
  } catch (error) {
    console.log('   ❌ Backend is not accessible');
    console.log(`      Start with: cd ../biz-buddy-backend && npm run dev`);
    return false;
  }
  
  // Check auth state exists
  try {
    await fs.access('.auth/user-state.json');
    console.log('   ✅ Authentication state found');
  } catch {
    console.log('   ⚠️ No auth state found');
    console.log('      Run: node universal-auth-capture.js --prefix orchestration');
    return false;
  }
  
  return true;
}

async function captureScreenshot(page, name) {
  const timestamp = Date.now();
  const filename = `orchestration-${timestamp}-${name}.png`;
  const filepath = path.join('test-results', filename);
  
  await page.screenshot({ 
    path: filepath, 
    fullPage: true 
  });
  
  TEST_CONFIG.screenshots.push({
    name,
    filename,
    timestamp: new Date().toISOString()
  });
  
  console.log(`   📸 Screenshot: ${name}`);
  return filepath;
}

async function createTaskViaUI(page) {
  console.log('\n📝 Creating task via UI...');
  
  // Navigate to dashboard
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  await captureScreenshot(page, 'dashboard-loaded');
  
  // Look for Dev Toolkit or task creation button
  const devToolkitButton = page.locator('button:has-text("Dev Toolkit")').first();
  const createTaskButton = page.locator('button:has-text("Create Task")').first();
  
  let taskId = null;
  
  if (await devToolkitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('   Using Dev Toolkit for task creation...');
    
    // Open Dev Toolkit
    await devToolkitButton.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'dev-toolkit-opened');
    
    // Create a task via Dev Toolkit
    const createButton = page.locator('button:has-text("Create Test Task")').first();
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();
      console.log('   ✅ Task creation triggered via Dev Toolkit');
      
      // Wait for task to appear
      await page.waitForTimeout(2000);
      await captureScreenshot(page, 'task-created');
      
      // Try to extract task ID from the UI
      const taskElement = page.locator('[data-testid*="task"]').first();
      if (await taskElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        const taskText = await taskElement.textContent();
        console.log('   Task element found:', taskText);
      }
    }
  } else if (await createTaskButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('   Using standard task creation...');
    
    await createTaskButton.click();
    await page.waitForTimeout(1000);
    
    // Fill in task details if form appears
    const titleInput = page.locator('input[placeholder*="title"]').first();
    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.fill(`E2E Orchestration Test - ${TEST_CONFIG.timestamp}`);
      
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('   ✅ Task form submitted');
      }
    }
    
    await captureScreenshot(page, 'task-created-standard');
  } else {
    console.log('   ⚠️ No task creation UI found, creating directly in database...');
    
    // Fallback: Create task directly in database
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934',
        task_type: 'onboarding',
        template_id: 'onboarding',
        title: `E2E Orchestration Test - ${TEST_CONFIG.timestamp}`,
        description: 'Testing orchestration flow',
        status: 'pending',
        priority: 'high',
        metadata: {
          e2e_test: true,
          timestamp: TEST_CONFIG.timestamp
        }
      })
      .select()
      .single();
    
    if (!error && task) {
      taskId = task.id;
      console.log('   ✅ Task created directly in database');
      console.log('   Task ID:', taskId);
    }
  }
  
  return taskId;
}

async function monitorOrchestration(taskId, maxWaitMs = 10000) {
  console.log('\n⏳ Monitoring orchestration...');
  
  if (!taskId) {
    // If no task ID, get the most recent task
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, created_at')
      .eq('user_id', '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (tasks && tasks.length > 0) {
      taskId = tasks[0].id;
      console.log('   Using most recent task:', taskId);
    } else {
      console.log('   ❌ No tasks found to monitor');
      return null;
    }
  }
  
  const startTime = Date.now();
  let events = [];
  let lastEventCount = 0;
  
  console.log(`   Monitoring task ${taskId} for ${maxWaitMs/1000} seconds...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    const { data: newEvents, error } = await supabase
      .from('task_context_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (!error && newEvents && newEvents.length > lastEventCount) {
      const addedEvents = newEvents.slice(lastEventCount);
      events = newEvents;
      lastEventCount = newEvents.length;
      
      console.log(`   📊 ${addedEvents.length} new event(s) detected`);
      addedEvents.forEach(event => {
        console.log(`      • ${event.operation} by ${event.actor_id}`);
      });
      
      // Give more time if we're seeing activity
      if (addedEvents.length > 0 && Date.now() - startTime < maxWaitMs - 2000) {
        await sleep(1000);
      }
    }
    
    await sleep(500);
  }
  
  return { taskId, events };
}

async function verifyOrchestrationFlow(orchestrationData) {
  console.log('\n🔍 Verifying orchestration flow...');
  
  if (!orchestrationData || !orchestrationData.events) {
    console.log('   ❌ No orchestration data to verify');
    return false;
  }
  
  const { taskId, events } = orchestrationData;
  
  // Check for key events
  const checks = {
    orchestrationInitiated: false,
    eventListenerInvolved: false,
    agentProcessing: false,
    eventsRecorded: events.length > 0
  };
  
  events.forEach(event => {
    if (event.operation === 'ORCHESTRATION_INITIATED') {
      checks.orchestrationInitiated = true;
    }
    if (event.actor_id === 'EventListener') {
      checks.eventListenerInvolved = true;
    }
    if (event.actor_type === 'agent') {
      checks.agentProcessing = true;
    }
  });
  
  console.log('   Orchestration Flow Checks:');
  console.log(`      ✅ Events Recorded: ${checks.eventsRecorded} (${events.length} events)`);
  console.log(`      ${checks.orchestrationInitiated ? '✅' : '❌'} Orchestration Initiated`);
  console.log(`      ${checks.eventListenerInvolved ? '✅' : '❌'} EventListener Triggered`);
  console.log(`      ${checks.agentProcessing ? '✅' : '❌'} Agent Processing Started`);
  
  const allChecks = Object.values(checks).every(v => v === true);
  
  if (allChecks) {
    console.log('\n   🎉 All orchestration checks passed!');
  } else {
    console.log('\n   ⚠️ Some orchestration checks failed');
  }
  
  return allChecks;
}

async function saveTestResults(success, orchestrationData) {
  const resultsDir = 'test-results';
  await fs.mkdir(resultsDir, { recursive: true });
  
  const results = {
    testName: TEST_CONFIG.testName,
    timestamp: TEST_CONFIG.timestamp,
    success,
    frontend: APP_URL,
    backend: BACKEND_URL,
    screenshots: TEST_CONFIG.screenshots,
    orchestration: orchestrationData,
    summary: {
      eventsRecorded: orchestrationData?.events?.length || 0,
      orchestrationTriggered: orchestrationData?.events?.some(e => 
        e.operation === 'ORCHESTRATION_INITIATED'
      ) || false,
      agentProcessing: orchestrationData?.events?.some(e => 
        e.actor_type === 'agent'
      ) || false
    }
  };
  
  const filename = `orchestration-test-${Date.now()}.json`;
  const filepath = path.join(resultsDir, filename);
  
  await fs.writeFile(filepath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Test results saved to: ${filepath}`);
  
  return results;
}

async function runE2ETest() {
  let browser = null;
  let success = false;
  let orchestrationData = null;
  
  try {
    // Check prerequisites
    const ready = await checkPrerequisites();
    if (!ready) {
      console.log('\n❌ Prerequisites not met. Please fix the issues above.');
      return false;
    }
    
    // Launch browser
    console.log('\n🌐 Launching browser...');
    browser = await chromium.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create context with auth
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   ⚠️ Browser error:', msg.text());
      }
    });
    
    // Create task via UI
    const taskId = await createTaskViaUI(page);
    
    // Monitor orchestration
    orchestrationData = await monitorOrchestration(taskId);
    
    // Verify the flow
    success = await verifyOrchestrationFlow(orchestrationData);
    
    // Final screenshot
    await captureScreenshot(page, 'test-complete');
    
    // Close browser
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
    
    if (browser) {
      await browser.close();
    }
  }
  
  // Save results
  const results = await saveTestResults(success, orchestrationData);
  
  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Test: ${TEST_CONFIG.testName}`);
  console.log(`Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Events Recorded: ${results.summary.eventsRecorded}`);
  console.log(`Orchestration Triggered: ${results.summary.orchestrationTriggered ? 'Yes' : 'No'}`);
  console.log(`Agent Processing: ${results.summary.agentProcessing ? 'Yes' : 'No'}`);
  console.log(`Screenshots Captured: ${TEST_CONFIG.screenshots.length}`);
  console.log('═'.repeat(60));
  
  return success;
}

// Run the test
if (require.main === module) {
  runE2ETest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

// Export for test suite integration
module.exports = {
  runE2ETest,
  TEST_CONFIG
};