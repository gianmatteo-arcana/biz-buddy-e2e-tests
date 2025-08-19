#!/usr/bin/env node

/**
 * TEST: Orchestrator Event Creation
 * 
 * This test triggers the onboarding orchestrator and monitors
 * whether events are actually being created and saved to the database
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testOrchestratorEventCreation() {
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/orchestrator-events-${Date.now()}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🔬 ORCHESTRATOR EVENT CREATION TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('👤 User: gianmatteo.allyn.test@gmail.com');
  console.log('📁 Output:', outputDir);
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  // Collect console logs
  const consoleLogs = [];
  const eventLogs = [];

  try {
    // Step 1: Open main app and monitor console
    console.log('📍 STEP 1: OPEN APP AND MONITOR CONSOLE');
    console.log('-' .repeat(40));
    
    const mainPage = await context.newPage();
    
    // Capture all console messages
    mainPage.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        time: new Date().toISOString()
      });
      
      // Look for our specific debug logs
      if (text.includes('[OnboardingOrchestrator]') || 
          text.includes('[EventSourced]')) {
        console.log('  🔍', text.substring(0, 200));
        eventLogs.push(text);
      }
    });
    
    // Also capture any errors
    mainPage.on('pageerror', error => {
      console.error('  ❌ Page error:', error.message);
      consoleLogs.push({
        type: 'error',
        text: error.message,
        time: new Date().toISOString()
      });
    });
    
    await mainPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await mainPage.waitForTimeout(5000);
    
    await mainPage.screenshot({
      path: path.join(outputDir, 'screenshots', '01-app-loaded.png'),
      fullPage: true
    });
    
    // Step 2: Check if onboarding was triggered
    console.log('\n📍 STEP 2: CHECK IF ONBOARDING WAS TRIGGERED');
    console.log('-' .repeat(40));
    
    // Look for onboarding-related logs
    const onboardingLogs = eventLogs.filter(log => 
      log.includes('createOnboardingTask') || 
      log.includes('ATTEMPTING TO CREATE EVENT')
    );
    
    if (onboardingLogs.length > 0) {
      console.log(`  ✅ Found ${onboardingLogs.length} onboarding-related logs`);
      onboardingLogs.forEach((log, i) => {
        console.log(`    ${i + 1}. ${log.substring(0, 150)}...`);
      });
    } else {
      console.log('  ⚠️ No onboarding logs found - may need to trigger manually');
    }
    
    // Step 3: Open Dev Toolkit and check for events
    console.log('\n📍 STEP 3: OPEN DEV TOOLKIT TO CHECK FOR EVENTS');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    
    // Monitor dev toolkit console too
    devPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RealTimeVisualizer]') || 
          text.includes('task_context_events')) {
        console.log('  🔍 DevToolkit:', text.substring(0, 150));
      }
    });
    
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(3000);
    
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
    
    // Refresh
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
    
    await devPage.screenshot({
      path: path.join(outputDir, 'screenshots', '02-task-history.png'),
      fullPage: true
    });
    
    // Step 4: Check database directly for events
    console.log('\n📍 STEP 4: CHECK DATABASE FOR EVENTS');
    console.log('-' .repeat(40));
    
    // Try to query the database through the page context
    const dbCheck = await devPage.evaluate(async () => {
      // Check if we can access Supabase
      if (typeof window !== 'undefined' && window.location.hostname.includes('lovableproject')) {
        try {
          // Try to make a direct API call to check events
          const response = await fetch('https://raenkewzlvrdqufwxjpl.supabase.co/rest/v1/task_context_events?select=count', {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MDUzMTgsImV4cCI6MjA0NjQ4MTMxOH0.GOEr-RJQG8VmAnCCaIScmUrGfvZ2h6WMU-5S_MzoJzg',
              'Prefer': 'count=exact'
            }
          });
          
          const count = response.headers.get('content-range');
          return { count, status: response.status };
        } catch (e) {
          return { error: e.message };
        }
      }
      return { error: 'Not in Lovable context' };
    });
    
    console.log('  Database check result:', JSON.stringify(dbCheck, null, 2));
    
    // Step 5: Analyze logs for success/failure patterns
    console.log('\n📍 STEP 5: ANALYZE LOGS FOR PATTERNS');
    console.log('-' .repeat(40));
    
    const successLogs = eventLogs.filter(log => 
      log.includes('✅') || 
      log.includes('EVENT SAVED TO DATABASE')
    );
    
    const errorLogs = eventLogs.filter(log => 
      log.includes('FAILED') || 
      log.includes('ERROR') ||
      log.includes('error')
    );
    
    console.log(`  ✅ Success indicators: ${successLogs.length}`);
    successLogs.forEach((log, i) => {
      console.log(`    ${i + 1}. ${log.substring(0, 100)}...`);
    });
    
    console.log(`\n  ❌ Error indicators: ${errorLogs.length}`);
    errorLogs.forEach((log, i) => {
      console.log(`    ${i + 1}. ${log.substring(0, 100)}...`);
    });
    
    // Step 6: Generate summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const hasOrchestratorLogs = eventLogs.some(log => log.includes('[OnboardingOrchestrator]'));
    const hasEventSourcedLogs = eventLogs.some(log => log.includes('[EventSourced]'));
    const hasSuccessLogs = successLogs.length > 0;
    const hasErrorLogs = errorLogs.length > 0;
    
    console.log('\n📋 Diagnostics:');
    console.log(`  • Orchestrator called: ${hasOrchestratorLogs ? '✅' : '❌'}`);
    console.log(`  • Event creation attempted: ${hasEventSourcedLogs ? '✅' : '❌'}`);
    console.log(`  • Success indicators: ${hasSuccessLogs ? '✅' : '❌'}`);
    console.log(`  • Error indicators: ${hasErrorLogs ? '⚠️ Yes' : '✅ No'}`);
    console.log(`  • Total console logs captured: ${consoleLogs.length}`);
    console.log(`  • Event-related logs: ${eventLogs.length}`);
    
    // Save all logs
    await fs.writeFile(
      path.join(outputDir, 'console-logs.json'),
      JSON.stringify(consoleLogs, null, 2)
    );
    
    await fs.writeFile(
      path.join(outputDir, 'event-logs.json'),
      JSON.stringify(eventLogs, null, 2)
    );
    
    // Generate HTML report
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Orchestrator Event Creation Test</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; }
    .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .status { display: inline-block; padding: 5px 10px; border-radius: 4px; margin: 5px; }
    .success { background: #c6f6d5; color: #22543d; }
    .error { background: #fed7d7; color: #742a2a; }
    .warning { background: #feebc8; color: #744210; }
    .logs { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto; }
    .log-entry { margin: 5px 0; }
    .log-orchestrator { color: #4fc3f7; }
    .log-eventsourced { color: #81c784; }
    .log-error { color: #ff8a80; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; margin-top: 20px; }
    .screenshot { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    img { width: 100%; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔬 Orchestrator Event Creation Test</h1>
    
    <div class="summary">
      <h2>Test Results</h2>
      <div>
        <span class="status ${hasOrchestratorLogs ? 'success' : 'error'}">
          Orchestrator: ${hasOrchestratorLogs ? '✅ Called' : '❌ Not Called'}
        </span>
        <span class="status ${hasEventSourcedLogs ? 'success' : 'error'}">
          Event Creation: ${hasEventSourcedLogs ? '✅ Attempted' : '❌ Not Attempted'}
        </span>
        <span class="status ${hasSuccessLogs ? 'success' : 'warning'}">
          Success Logs: ${successLogs.length}
        </span>
        <span class="status ${hasErrorLogs ? 'error' : 'success'}">
          Error Logs: ${errorLogs.length}
        </span>
      </div>
    </div>
    
    <h2>Event Logs</h2>
    <div class="logs">
      ${eventLogs.map(log => {
        let className = 'log-entry';
        if (log.includes('[OnboardingOrchestrator]')) className += ' log-orchestrator';
        else if (log.includes('[EventSourced]')) className += ' log-eventsourced';
        else if (log.includes('ERROR') || log.includes('FAILED')) className += ' log-error';
        return '<div class="' + className + '">' + log.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
      }).join('')}
    </div>
    
    <h2>Screenshots</h2>
    <div class="screenshots">
      <div class="screenshot">
        <h3>App Loaded</h3>
        <img src="screenshots/01-app-loaded.png" alt="App loaded">
      </div>
      <div class="screenshot">
        <h3>Task History</h3>
        <img src="screenshots/02-task-history.png" alt="Task history">
      </div>
    </div>
  </div>
</body>
</html>`;
    
    await fs.writeFile(path.join(outputDir, 'report.html'), html);
    
    console.log(`\n📁 Results saved to: ${outputDir}`);
    
    // Open report
    const { exec } = require('child_process');
    exec(`open ${path.join(outputDir, 'report.html')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testOrchestratorEventCreation().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});