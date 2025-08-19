#!/usr/bin/env node

/**
 * TEST: Force YAML Onboarding Button
 * 
 * Tests the new Force YAML Onboarding button to trigger V2 orchestrator
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testForceOnboardingButton() {
  const testRunId = Date.now();
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/force-button-${testRunId}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🚀 FORCE YAML ONBOARDING BUTTON TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('🆔 Test Run:', testRunId);
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

  const capturedLogs = {
    forceOnboarding: [],
    orchestratorV2: [],
    executionPlan: [],
    events: [],
    all: []
  };

  try {
    // STEP 1: Load app and look for button
    console.log('📍 STEP 1: LOAD APP AND FIND FORCE ONBOARDING BUTTON');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      capturedLogs.all.push({ time: Date.now(), type: msg.type(), text });
      
      // Force onboarding logs
      if (text.includes('[ForceOnboarding]')) {
        capturedLogs.forceOnboarding.push(text);
        console.log('  🎯', text.substring(0, 200));
      }
      
      // V2 Orchestrator logs
      if (text.includes('[OnboardingOrchestratorV2]')) {
        capturedLogs.orchestratorV2.push(text);
        console.log('  🎭', text.substring(0, 200));
      }
      
      // Execution plan logs
      if (text.includes('[ExecutionPlanProcessor]')) {
        capturedLogs.executionPlan.push(text);
        console.log('  🚀', text.substring(0, 200));
      }
      
      // Event creation logs
      if (text.includes('[EventSourced]')) {
        capturedLogs.events.push(text);
        console.log('  ⚡', text.substring(0, 150));
      }
    });
    
    console.log('  Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(5000);
    
    // Take initial screenshot
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', '01-initial.png'),
      fullPage: true
    });
    
    // Look for the Force YAML Onboarding button
    const buttonFound = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Force YAML Onboarding')) {
          return true;
        }
      }
      return false;
    });
    
    if (buttonFound) {
      console.log('  ✅ Force YAML Onboarding button found!');
    } else {
      console.log('  ❌ Force YAML Onboarding button NOT found');
      console.log('  Note: Button only appears in development mode when authenticated');
    }
    
    // STEP 2: Click the button if found
    if (buttonFound) {
      console.log('\n📍 STEP 2: CLICK FORCE YAML ONBOARDING BUTTON');
      console.log('-' .repeat(40));
      
      await page.click('button:has-text("Force YAML Onboarding")');
      console.log('  ✅ Button clicked!');
      
      // Wait for orchestration to run
      await page.waitForTimeout(10000);
      
      // Take screenshot after clicking
      await page.screenshot({
        path: path.join(outputDir, 'screenshots', '02-after-click.png'),
        fullPage: true
      });
      
      // Check if Dev Toolkit opened in new tab
      const pages = context.pages();
      console.log(`  • Total browser tabs: ${pages.length}`);
      
      if (pages.length > 1) {
        console.log('  ✅ Dev Toolkit opened in new tab');
        
        // Switch to Dev Toolkit tab
        const devToolkitPage = pages[pages.length - 1];
        await devToolkitPage.waitForTimeout(5000);
        
        // Take screenshot of Dev Toolkit
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '03-dev-toolkit.png'),
          fullPage: true
        });
      }
    }
    
    // STEP 3: Analyze captured logs
    console.log('\n📍 STEP 3: ANALYZE ORCHESTRATION ACTIVITY');
    console.log('-' .repeat(40));
    
    const metrics = {
      buttonClicked: capturedLogs.forceOnboarding.some(log => 
        log.includes('Button clicked')
      ),
      v2OrchestratorTriggered: capturedLogs.orchestratorV2.length > 0,
      yamlTemplateLoaded: capturedLogs.orchestratorV2.some(log => 
        log.includes('YAML template')
      ),
      taskCreated: capturedLogs.orchestratorV2.some(log => 
        log.includes('Task created') || log.includes('Task saved')
      ),
      executionPlanRan: capturedLogs.executionPlan.length > 0,
      eventsCreated: capturedLogs.events.length > 0
    };
    
    console.log('  📊 Orchestration Metrics:');
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`    • ${key}: ${value ? '✅' : '❌'}`);
    });
    
    console.log(`\n  📈 Log Statistics:`);
    console.log(`    • Force onboarding logs: ${capturedLogs.forceOnboarding.length}`);
    console.log(`    • V2 Orchestrator logs: ${capturedLogs.orchestratorV2.length}`);
    console.log(`    • Execution plan logs: ${capturedLogs.executionPlan.length}`);
    console.log(`    • Event logs: ${capturedLogs.events.length}`);
    console.log(`    • Total logs: ${capturedLogs.all.length}`);
    
    // FINAL SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const successCount = Object.values(metrics).filter(Boolean).length;
    const totalMetrics = Object.keys(metrics).length;
    const successRate = Math.round((successCount / totalMetrics) * 100);
    
    console.log(`\n📈 Success Rate: ${successRate}% (${successCount}/${totalMetrics})`);
    
    if (!buttonFound) {
      console.log('\n⚠️ BUTTON NOT VISIBLE');
      console.log('The Force YAML Onboarding button is not showing.');
      console.log('This could mean:');
      console.log('  1. Not in development mode (NODE_ENV !== "development")');
      console.log('  2. User not authenticated');
      console.log('  3. Code not deployed yet to Lovable');
    } else if (successRate >= 80) {
      console.log('\n✅ SUCCESS! YAML orchestration triggered successfully!');
      console.log('The V2 orchestrator created a task with YAML template.');
      console.log('Events should be visible in the Dev Toolkit.');
    } else if (successRate >= 50) {
      console.log('\n⚠️ PARTIAL SUCCESS');
      console.log('Button clicked but orchestration may not have completed fully.');
    } else {
      console.log('\n❌ ORCHESTRATION FAILED');
      console.log('Button was clicked but orchestration did not run properly.');
    }
    
    // Save logs
    await fs.writeFile(
      path.join(outputDir, 'captured-logs.json'),
      JSON.stringify(capturedLogs, null, 2)
    );
    
    // Generate HTML report
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Force YAML Onboarding Button Test - ${testRunId}</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; }
    .metric { 
      display: inline-block; 
      padding: 10px 15px; 
      margin: 5px;
      background: white; 
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .success { background: #d4edda; }
    .failure { background: #f8d7da; }
    .warning { background: #fff3cd; }
    .screenshots { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); 
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
    <h1>🚀 Force YAML Onboarding Button Test</h1>
    <p>Test Run: ${testRunId} | ${new Date().toLocaleString()}</p>
    
    <h2>Results</h2>
    <div>
      <span class="metric ${buttonFound ? 'success' : 'failure'}">
        Button Found: ${buttonFound ? '✅' : '❌'}
      </span>
      ${Object.entries(metrics).map(([key, value]) => 
        `<span class="metric ${value ? 'success' : 'failure'}">${key}: ${value ? '✅' : '❌'}</span>`
      ).join('')}
    </div>
    
    <h2>Key Logs</h2>
    <div class="logs">
      ${capturedLogs.forceOnboarding.map(log => `<div>🎯 ${log}</div>`).join('')}
      ${capturedLogs.orchestratorV2.map(log => `<div>🎭 ${log}</div>`).join('')}
      ${capturedLogs.executionPlan.map(log => `<div>🚀 ${log}</div>`).join('')}
      ${capturedLogs.events.slice(0, 10).map(log => `<div>⚡ ${log}</div>`).join('')}
    </div>
    
    <h2>Screenshots</h2>
    <div class="screenshots">
      <div class="screenshot">
        <h3>1. Initial State</h3>
        <img src="screenshots/01-initial.png" alt="Initial">
      </div>
      <div class="screenshot">
        <h3>2. After Click</h3>
        <img src="screenshots/02-after-click.png" alt="After Click">
      </div>
      <div class="screenshot">
        <h3>3. Dev Toolkit</h3>
        <img src="screenshots/03-dev-toolkit.png" alt="Dev Toolkit">
      </div>
    </div>
  </div>
</body>
</html>`;
    
    await fs.writeFile(path.join(outputDir, 'report.html'), html);
    
    console.log(`\n📁 Full report: ${outputDir}/report.html`);
    console.log('🔍 Browser windows remain open for inspection');
    
    // Open report
    const { exec } = require('child_process');
    exec(`open ${path.join(outputDir, 'report.html')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testForceOnboardingButton().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});