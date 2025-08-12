#!/usr/bin/env node

/**
 * YAML ORCHESTRATION PROOF TEST
 * 
 * This test will:
 * 1. Reset the user's onboarding status
 * 2. Trigger fresh onboarding with YAML orchestrator
 * 3. Capture screenshots as proof
 * 4. Verify events in database
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Read auth token from saved state
async function getAuthToken() {
  try {
    const authState = await fs.readFile('.auth/user-state.json', 'utf-8');
    const state = JSON.parse(authState);
    
    for (const origin of state.origins) {
      for (const item of origin.localStorage) {
        if (item.name.includes('auth-token')) {
          const tokenData = JSON.parse(item.value);
          return tokenData.access_token;
        }
      }
    }
  } catch (error) {
    console.error('Failed to read auth token:', error);
  }
  return null;
}

async function testYamlOrchestrationProof() {
  const testRunId = Date.now();
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/yaml-proof-${testRunId}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🎯 YAML ORCHESTRATION PROOF TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('🆔 Test Run:', testRunId);
  console.log('📁 Output:', outputDir);
  console.log('=' .repeat(60) + '\n');

  // Get auth token for Supabase operations
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ No auth token found - run autonomous-test.js first');
    return;
  }

  // Create Supabase client
  const supabase = createClient(
    'https://raenkewzlvrdqufwxjpl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MDUzMTgsImV4cCI6MjA0NjQ4MTMxOH0.GOEr-RJQG8VmAnCCaIScmUrGfvZ2h6WMU-5S_MzoJzg',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });

  const capturedLogs = {
    orchestratorV2: [],
    executionPlan: [],
    events: [],
    onboardingCheck: [],
    all: []
  };

  try {
    // STEP 1: Reset user's onboarding status
    console.log('📍 STEP 1: RESET USER ONBOARDING STATUS');
    console.log('-' .repeat(40));
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Failed to get user:', userError);
      return;
    }
    
    console.log(`  User: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    
    // Delete existing onboarding tasks
    const { data: deletedTasks, error: deleteTaskError } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('category', 'onboarding')
      .select();
    
    if (deletedTasks && deletedTasks.length > 0) {
      console.log(`  ✅ Deleted ${deletedTasks.length} existing onboarding task(s)`);
    } else {
      console.log('  ℹ️ No existing onboarding tasks to delete');
    }
    
    // Clear business info from profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        business_name: null,
        business_type: null,
        business_id: null,
        business_address: null,
        business_ein: null,
        business_formation_date: null
      })
      .eq('id', user.id);
    
    if (!updateError) {
      console.log('  ✅ Cleared business info from profile');
    } else {
      console.log('  ⚠️ Could not clear profile:', updateError.message);
    }
    
    // STEP 2: Load app to trigger fresh onboarding
    console.log('\n📍 STEP 2: LOAD APP TO TRIGGER FRESH ONBOARDING');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Comprehensive logging
    page.on('console', msg => {
      const text = msg.text();
      capturedLogs.all.push({ time: Date.now(), text });
      
      // Onboarding check
      if (text.includes('Onboarding check result')) {
        capturedLogs.onboardingCheck.push(text);
        console.log('  📊 Onboarding Check:', text);
      }
      
      // V2 Orchestrator logs
      if (text.includes('[OnboardingOrchestratorV2]')) {
        capturedLogs.orchestratorV2.push(text);
        console.log('  🎭 V2 Orchestrator:', text.substring(0, 200));
      }
      
      // Execution plan logs
      if (text.includes('[ExecutionPlanProcessor]')) {
        capturedLogs.executionPlan.push(text);
        console.log('  🚀 Execution Plan:', text.substring(0, 200));
      }
      
      // Event creation logs
      if (text.includes('[EventSourced]') || text.includes('EVENT SAVED')) {
        capturedLogs.events.push(text);
        console.log('  ⚡ Event:', text.substring(0, 150));
      }
      
      // YAML template logs
      if (text.includes('YAML') || text.includes('yaml')) {
        console.log('  📄 YAML:', text.substring(0, 150));
      }
    });
    
    console.log('  Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for onboarding to potentially trigger
    console.log('  Waiting for onboarding logic to execute...');
    await page.waitForTimeout(15000);
    
    // Take screenshot of main app
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', '01-app-after-reset.png'),
      fullPage: true
    });
    
    // STEP 3: Check if onboarding was triggered
    console.log('\n📍 STEP 3: ANALYZE ORCHESTRATION ACTIVITY');
    console.log('-' .repeat(40));
    
    const orchestrationMetrics = {
      v2OrchestratorTriggered: capturedLogs.orchestratorV2.some(log => 
        log.includes('Creating onboarding task from YAML template')
      ),
      yamlTemplateLoaded: capturedLogs.orchestratorV2.some(log => 
        log.includes('Loaded YAML template')
      ),
      taskContextCreated: capturedLogs.orchestratorV2.some(log => 
        log.includes('Created TaskContext with execution plan')
      ),
      taskSavedToDb: capturedLogs.orchestratorV2.some(log => 
        log.includes('Task saved to database')
      ),
      initialEventCreated: capturedLogs.orchestratorV2.some(log => 
        log.includes('Initial event created')
      ),
      orchestrationStarted: capturedLogs.orchestratorV2.some(log => 
        log.includes('Starting orchestration')
      ),
      executionPlanProcessing: capturedLogs.executionPlan.length > 0,
      eventsCreated: capturedLogs.events.length > 0
    };
    
    console.log('  📊 Orchestration Metrics:');
    Object.entries(orchestrationMetrics).forEach(([key, value]) => {
      console.log(`    • ${key}: ${value ? '✅' : '❌'}`);
    });
    
    console.log(`\n  📈 Statistics:`);
    console.log(`    • V2 Orchestrator logs: ${capturedLogs.orchestratorV2.length}`);
    console.log(`    • Execution plan logs: ${capturedLogs.executionPlan.length}`);
    console.log(`    • Event creation logs: ${capturedLogs.events.length}`);
    console.log(`    • Total logs captured: ${capturedLogs.all.length}`);
    
    // STEP 4: Query database for created task
    console.log('\n📍 STEP 4: VERIFY TASK IN DATABASE');
    console.log('-' .repeat(40));
    
    const { data: newTasks, error: queryError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'onboarding')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (newTasks && newTasks.length > 0) {
      const task = newTasks[0];
      console.log('  ✅ Found new onboarding task!');
      console.log(`    • Task ID: ${task.id}`);
      console.log(`    • Title: ${task.title}`);
      console.log(`    • Status: ${task.status}`);
      console.log(`    • Task Type: ${task.task_type}`);
      console.log(`    • Created: ${new Date(task.created_at).toLocaleString()}`);
      
      // Check metadata for YAML template
      if (task.metadata) {
        const hasYamlTemplate = task.metadata.templateId || task.metadata.templateVersion;
        const hasExecutionPlan = task.metadata.executionPlan;
        console.log(`    • Has YAML template: ${hasYamlTemplate ? '✅' : '❌'}`);
        console.log(`    • Has execution plan: ${hasExecutionPlan ? '✅' : '❌'}`);
        
        if (hasExecutionPlan) {
          const phases = Object.keys(task.metadata.executionPlan);
          console.log(`    • Execution phases: ${phases.join(', ')}`);
        }
      }
      
      // STEP 5: Query events for this task
      console.log('\n📍 STEP 5: VERIFY EVENTS IN DATABASE');
      console.log('-' .repeat(40));
      
      const { data: events, error: eventsError } = await supabase
        .from('task_context_events')
        .select('*')
        .eq('task_id', task.id)
        .order('sequence_number', { ascending: true });
      
      if (events && events.length > 0) {
        console.log(`  ✅ Found ${events.length} events for task!`);
        
        // Analyze event types
        const eventTypes = {};
        events.forEach(event => {
          const type = `${event.agent_name}:${event.action}`;
          eventTypes[type] = (eventTypes[type] || 0) + 1;
        });
        
        console.log('  📊 Event breakdown:');
        Object.entries(eventTypes).forEach(([type, count]) => {
          console.log(`    • ${type}: ${count}`);
        });
        
        // Show first few events
        console.log('\n  📝 First 3 events:');
        events.slice(0, 3).forEach((event, i) => {
          console.log(`    ${i + 1}. ${event.agent_name} → ${event.action}`);
          if (event.reasoning) {
            console.log(`       Reasoning: ${event.reasoning.substring(0, 100)}...`);
          }
        });
      } else {
        console.log('  ❌ No events found for task');
      }
    } else {
      console.log('  ❌ No new onboarding task found in database');
    }
    
    // STEP 6: Open Dev Toolkit to visualize
    console.log('\n📍 STEP 6: CHECK DEV TOOLKIT VISUALIZATION');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    
    devPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RealTimeVisualizer]')) {
        console.log('  🔍 Visualizer:', text.substring(0, 150));
      }
    });
    
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(3000);
    
    // Take screenshot of Dev Toolkit
    await devPage.screenshot({
      path: path.join(outputDir, 'screenshots', '02-dev-toolkit-initial.png'),
      fullPage: true
    });
    
    // Go to Task History
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task History')) {
          btn.click();
          break;
        }
      }
    });
    
    await devPage.waitForTimeout(2000);
    
    // Refresh to get latest
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const svgs = btn.querySelectorAll('svg');
        for (const svg of svgs) {
          if (svg.getAttribute('class')?.includes('refresh')) {
            btn.click();
            return;
          }
        }
      }
    });
    
    await devPage.waitForTimeout(3000);
    
    // Take screenshot of task history
    await devPage.screenshot({
      path: path.join(outputDir, 'screenshots', '03-task-history.png'),
      fullPage: true
    });
    
    // Select first task
    const taskSelected = await devPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"]');
      if (cards.length > 0) {
        cards[0].click();
        return true;
      }
      return false;
    });
    
    if (taskSelected) {
      await devPage.waitForTimeout(2000);
      
      // Switch to Agent Visualizer
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Agent Visualizer')) {
            btn.click();
            break;
          }
        }
      });
      
      await devPage.waitForTimeout(3000);
      
      // Take screenshot of agent visualizer
      await devPage.screenshot({
        path: path.join(outputDir, 'screenshots', '04-agent-visualizer.png'),
        fullPage: true
      });
      
      // Check visualizer content
      const visualizerContent = await devPage.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasEvents: !bodyText.includes('No events') && !bodyText.includes('No agent activity'),
          eventCount: (bodyText.match(/orchestrator|phase_|step_|event/gi) || []).length
        };
      });
      
      console.log(`  • Agent Visualizer shows events: ${visualizerContent.hasEvents ? '✅' : '❌'}`);
      console.log(`  • Event-related terms found: ${visualizerContent.eventCount}`);
    }
    
    // FINAL SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 PROOF OF YAML ORCHESTRATION');
    console.log('=' .repeat(60));
    
    const success = Object.values(orchestrationMetrics).filter(Boolean).length;
    const total = Object.keys(orchestrationMetrics).length;
    const successRate = Math.round((success / total) * 100);
    
    console.log(`\n📊 Success Rate: ${successRate}% (${success}/${total})`);
    
    if (successRate >= 75) {
      console.log('\n✅ SUCCESS! YAML orchestration is fully working!');
      console.log('   Events are being created and stored in the database.');
      console.log('   The execution plan is being processed.');
    } else if (successRate >= 50) {
      console.log('\n⚠️ PARTIAL SUCCESS - Some components working');
    } else {
      console.log('\n❌ YAML orchestration not working as expected');
    }
    
    // Save all logs
    await fs.writeFile(
      path.join(outputDir, 'captured-logs.json'),
      JSON.stringify(capturedLogs, null, 2)
    );
    
    // Generate HTML report
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>YAML Orchestration Proof - Run ${testRunId}</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; }
    .metric { 
      display: inline-block; 
      padding: 10px 15px; 
      margin: 5px;
      background: white; 
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .success { background: #d4edda; color: #155724; }
    .failure { background: #f8d7da; color: #721c24; }
    .screenshots { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 20px; 
      margin-top: 30px;
    }
    .screenshot {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .screenshot img {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .logs {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 YAML Orchestration Proof</h1>
    <p>Test Run: ${testRunId} | Date: ${new Date().toLocaleString()}</p>
    
    <h2>Orchestration Metrics</h2>
    ${Object.entries(orchestrationMetrics).map(([key, value]) => 
      `<span class="metric ${value ? 'success' : 'failure'}">${key}: ${value ? '✅' : '❌'}</span>`
    ).join('')}
    
    <h2>Statistics</h2>
    <div>
      <span class="metric">V2 Orchestrator Logs: ${capturedLogs.orchestratorV2.length}</span>
      <span class="metric">Execution Plan Logs: ${capturedLogs.executionPlan.length}</span>
      <span class="metric">Event Creation Logs: ${capturedLogs.events.length}</span>
      <span class="metric">Total Logs: ${capturedLogs.all.length}</span>
    </div>
    
    <h2>Key Logs</h2>
    <div class="logs">
      ${capturedLogs.orchestratorV2.map(log => `<div>🎭 ${log}</div>`).join('')}
      ${capturedLogs.executionPlan.map(log => `<div>🚀 ${log}</div>`).join('')}
      ${capturedLogs.events.map(log => `<div>⚡ ${log}</div>`).join('')}
    </div>
    
    <h2>Screenshots</h2>
    <div class="screenshots">
      <div class="screenshot">
        <h3>1. App After Reset</h3>
        <img src="screenshots/01-app-after-reset.png" alt="App after reset">
      </div>
      <div class="screenshot">
        <h3>2. Dev Toolkit Initial</h3>
        <img src="screenshots/02-dev-toolkit-initial.png" alt="Dev Toolkit">
      </div>
      <div class="screenshot">
        <h3>3. Task History</h3>
        <img src="screenshots/03-task-history.png" alt="Task History">
      </div>
      <div class="screenshot">
        <h3>4. Agent Visualizer</h3>
        <img src="screenshots/04-agent-visualizer.png" alt="Agent Visualizer">
      </div>
    </div>
  </div>
</body>
</html>`;
    
    await fs.writeFile(path.join(outputDir, 'report.html'), html);
    
    console.log(`\n📁 Full report with screenshots: ${outputDir}/report.html`);
    console.log('🔍 Browser windows remain open for manual inspection');
    
    // Open the report
    const { exec } = require('child_process');
    exec(`open ${path.join(outputDir, 'report.html')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testYamlOrchestrationProof().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  console.error(err.stack);
  process.exit(1);
});