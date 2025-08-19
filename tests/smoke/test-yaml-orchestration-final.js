#!/usr/bin/env node

/**
 * FINAL TEST: YAML Orchestration with Force Button
 * 
 * Complete test showing YAML orchestration creating events
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function finalYamlOrchestrationTest() {
  const testRunId = Date.now();
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/yaml-final-${testRunId}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🚀 FINAL YAML ORCHESTRATION TEST');
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

  const orchestrationLogs = {
    button: [],
    imports: [],
    orchestrator: [],
    yaml: [],
    execution: [],
    events: [],
    errors: []
  };

  try {
    console.log('📍 STEP 1: WAIT FOR DEPLOYMENT');
    console.log('-' .repeat(40));
    console.log('  Waiting 60 seconds for Lovable deployment...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    console.log('  ✅ Deployment wait complete\n');
    
    console.log('📍 STEP 2: LOAD APPLICATION');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      // Categorize logs
      if (text.includes('[ForceOnboarding]')) {
        orchestrationLogs.button.push(text);
        console.log('  🎯', text.substring(0, 200));
      }
      
      if (text.includes('Importing') || text.includes('imported')) {
        orchestrationLogs.imports.push(text);
        console.log('  📦', text.substring(0, 200));
      }
      
      if (text.includes('[OnboardingOrchestratorV2]')) {
        orchestrationLogs.orchestrator.push(text);
        console.log('  🎭', text.substring(0, 200));
      }
      
      if (text.includes('YAML') || text.includes('yaml')) {
        orchestrationLogs.yaml.push(text);
        console.log('  📄', text.substring(0, 200));
      }
      
      if (text.includes('[ExecutionPlanProcessor]')) {
        orchestrationLogs.execution.push(text);
        console.log('  🚀', text.substring(0, 200));
      }
      
      if (text.includes('[EventSourced]') || text.includes('event') || text.includes('Event')) {
        orchestrationLogs.events.push(text);
        console.log('  ⚡', text.substring(0, 150));
      }
      
      if (type === 'error' && !text.includes('X-Frame-Options') && !text.includes('lovable.js')) {
        orchestrationLogs.errors.push(text);
        console.log('  ❌', text.substring(0, 200));
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
    
    console.log('  ✅ Application loaded\n');
    
    // STEP 3: Find and click the Force YAML Onboarding button
    console.log('📍 STEP 3: TRIGGER YAML ORCHESTRATION');
    console.log('-' .repeat(40));
    
    const buttonCheck = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        forceButton: buttons.find(btn => btn.textContent?.includes('Force YAML Onboarding')),
        testButton: buttons.find(btn => btn.textContent?.includes('Test Orchestrator Import')),
        devToolkitButton: buttons.find(btn => btn.querySelector('svg'))
      };
    });
    
    if (buttonCheck.forceButton) {
      console.log('  ✅ Force YAML Onboarding button found');
      console.log('  Clicking button...\n');
      
      await page.click('button:has-text("Force YAML Onboarding")');
      
      // Wait for orchestration to run
      console.log('  Waiting for orchestration (15 seconds)...');
      await page.waitForTimeout(15000);
      
      // Take screenshot after orchestration
      await page.screenshot({
        path: path.join(outputDir, 'screenshots', '02-after-orchestration.png'),
        fullPage: true
      });
      
    } else {
      console.log('  ❌ Force YAML Onboarding button NOT found');
      
      if (buttonCheck.testButton) {
        console.log('  ℹ️ Test Orchestrator Import button is visible');
      }
      
      if (buttonCheck.devToolkitButton) {
        console.log('  ℹ️ Dev Toolkit button is visible');
      }
    }
    
    // Check if Dev Toolkit opened
    const pages = context.pages();
    if (pages.length > 1) {
      console.log('\n  ✅ Dev Toolkit opened in new tab');
      const devToolkitPage = pages[pages.length - 1];
      await devToolkitPage.waitForTimeout(5000);
      
      await devToolkitPage.screenshot({
        path: path.join(outputDir, 'screenshots', '03-dev-toolkit.png'),
        fullPage: true
      });
      
      // Check for Agent Visualizer tab
      const hasVisualizerTab = await devToolkitPage.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        return tabs.some(tab => tab.textContent?.includes('Agent Visualizer'));
      });
      
      if (hasVisualizerTab) {
        console.log('  ✅ Agent Visualizer tab found');
        await devToolkitPage.click('button:has-text("Agent Visualizer")');
        await devToolkitPage.waitForTimeout(3000);
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '04-agent-visualizer.png'),
          fullPage: true
        });
      }
    }
    
    // STEP 4: ANALYZE RESULTS
    console.log('\n' + '=' .repeat(60));
    console.log('📊 ORCHESTRATION ANALYSIS');
    console.log('=' .repeat(60));
    
    const metrics = {
      buttonClicked: orchestrationLogs.button.length > 0,
      importsSuccessful: orchestrationLogs.imports.some(log => 
        log.includes('imported successfully') || log.includes('✅')
      ),
      orchestratorTriggered: orchestrationLogs.orchestrator.length > 0,
      yamlLoaded: orchestrationLogs.yaml.length > 0,
      executionPlanRan: orchestrationLogs.execution.length > 0,
      eventsCreated: orchestrationLogs.events.length > 0,
      errorsOccurred: orchestrationLogs.errors.length > 0
    };
    
    console.log('\n📈 Metrics:');
    Object.entries(metrics).forEach(([key, value]) => {
      const icon = value ? (key === 'errorsOccurred' ? '❌' : '✅') : '❌';
      console.log(`  • ${key}: ${icon}`);
    });
    
    console.log('\n📊 Log Counts:');
    Object.entries(orchestrationLogs).forEach(([category, logs]) => {
      if (logs.length > 0) {
        console.log(`  • ${category}: ${logs.length} entries`);
      }
    });
    
    // Save detailed logs
    await fs.writeFile(
      path.join(outputDir, 'orchestration-logs.json'),
      JSON.stringify(orchestrationLogs, null, 2)
    );
    
    // Generate HTML report
    const successCount = Object.values(metrics).filter((v, i) => 
      i < 6 ? v : !v  // First 6 should be true, last one (errors) should be false
    ).length;
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>YAML Orchestration Test - ${testRunId}</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                   gap: 15px; margin: 20px 0; }
    .metric { background: white; padding: 15px; border-radius: 8px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .success { border-left: 4px solid #10b981; }
    .failure { border-left: 4px solid #ef4444; }
    .screenshots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px; }
    .screenshot img { width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .logs { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; 
            font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 YAML Orchestration Test Results</h1>
    <p>Test Run: ${testRunId} | ${new Date().toLocaleString()}</p>
    <h2 style="margin-top: 20px;">Overall: ${successCount >= 5 ? '✅ SUCCESS' : successCount >= 3 ? '⚠️ PARTIAL' : '❌ FAILED'}</h2>
  </div>
  
  <div class="metric-grid">
    ${Object.entries(metrics).map(([key, value]) => {
      const isError = key === 'errorsOccurred';
      const isSuccess = isError ? !value : value;
      return `
        <div class="metric ${isSuccess ? 'success' : 'failure'}">
          <h3>${key.replace(/([A-Z])/g, ' $1').trim()}</h3>
          <p style="font-size: 24px;">${isSuccess ? '✅' : '❌'}</p>
        </div>
      `;
    }).join('')}
  </div>
  
  <h2>Key Logs</h2>
  <div class="logs">
    ${Object.entries(orchestrationLogs).map(([category, logs]) => 
      logs.length > 0 ? `<h3>${category.toUpperCase()}</h3>${logs.slice(0, 10).map(log => 
        `<div>${log}</div>`).join('')}` : ''
    ).join('')}
  </div>
  
  <h2>Screenshots</h2>
  <div class="screenshots">
    <div class="screenshot">
      <h3>1. Initial State</h3>
      <img src="screenshots/01-initial.png" alt="Initial">
    </div>
    <div class="screenshot">
      <h3>2. After Orchestration</h3>
      <img src="screenshots/02-after-orchestration.png" alt="After Orchestration">
    </div>
    <div class="screenshot">
      <h3>3. Dev Toolkit</h3>
      <img src="screenshots/03-dev-toolkit.png" alt="Dev Toolkit">
    </div>
    <div class="screenshot">
      <h3>4. Agent Visualizer</h3>
      <img src="screenshots/04-agent-visualizer.png" alt="Agent Visualizer">
    </div>
  </div>
</body>
</html>`;
    
    await fs.writeFile(path.join(outputDir, 'report.html'), html);
    
    // FINAL SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('=' .repeat(60));
    
    if (metrics.eventsCreated && metrics.orchestratorTriggered) {
      console.log('\n✅ SUCCESS! YAML orchestration is working!');
      console.log('Events are being created and can be visualized in Dev Toolkit.');
    } else if (metrics.importsSuccessful) {
      console.log('\n⚠️ PARTIAL SUCCESS');
      console.log('Imports work but orchestration may not be creating events.');
    } else if (metrics.buttonClicked) {
      console.log('\n❌ ORCHESTRATION FAILED');
      console.log('Button was clicked but orchestration did not run.');
    } else {
      console.log('\n❌ TEST FAILED');
      console.log('Could not find or click the Force YAML Onboarding button.');
    }
    
    console.log(`\n📁 Full report: ${outputDir}/report.html`);
    console.log('🔍 Browser windows remain open for inspection');
    
    // Open report
    const { exec } = require('child_process');
    exec(`open ${path.join(outputDir, 'report.html')}`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await fs.writeFile(
      path.join(outputDir, 'error.json'),
      JSON.stringify({ error: error.message, stack: error.stack }, null, 2)
    );
  }
}

// Run the test
finalYamlOrchestrationTest().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});