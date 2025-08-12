#!/usr/bin/env node

/**
 * PRD ONBOARDING DEMONSTRATION
 * 
 * Complete E2E demonstration of the YAML-based onboarding flow
 * with exhaustive screenshots for all steps and behaviors
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function demonstratePRDOnboarding() {
  const testRunId = Date.now();
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/prd-demo-${testRunId}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🚀 PRD ONBOARDING DEMONSTRATION');
  console.log('=' .repeat(80));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('🆔 Test Run:', testRunId);
  console.log('📁 Output:', outputDir);
  console.log('=' .repeat(80) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 500 // Slow down actions for better visibility
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });

  const capturedEvents = [];
  let screenshotCount = 0;

  const takeScreenshot = async (page, name, description) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', filename),
      fullPage: true
    });
    console.log(`  📸 [${screenshotCount}] ${description}`);
    return filename;
  };

  try {
    // ========================================
    // PHASE 1: INITIAL LOAD AND AUTHENTICATION
    // ========================================
    console.log('📍 PHASE 1: INITIAL LOAD AND AUTHENTICATION');
    console.log('-' .repeat(60));
    
    const page = await context.newPage();
    
    // Capture all console logs
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      // Capture important logs
      if (text.includes('Onboarding') || 
          text.includes('Orchestrator') || 
          text.includes('YAML') || 
          text.includes('Event') ||
          text.includes('Agent') ||
          text.includes('Task')) {
        capturedEvents.push({
          time: Date.now(),
          type,
          text: text.substring(0, 500)
        });
        
        // Show agent-related logs
        if (text.includes('Agent')) {
          console.log(`    🤖 ${text.substring(0, 150)}`);
        }
      }
    });
    
    console.log('  Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(3000);
    
    await takeScreenshot(page, 'initial-dashboard', 'Initial dashboard with authenticated user');
    
    // Check authentication status
    const isAuthenticated = await page.evaluate(() => {
      const user = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      return !!user;
    });
    
    console.log(`  Authentication status: ${isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);
    
    // ========================================
    // PHASE 2: ACCESS DEV TOOLKIT
    // ========================================
    console.log('\n📍 PHASE 2: ACCESS DEV TOOLKIT');
    console.log('-' .repeat(60));
    
    // Click the Dev Toolkit button
    const devToolkitButton = await page.$('button[title="Open Dev Toolkit"]');
    if (devToolkitButton) {
      console.log('  ✅ Dev Toolkit button found');
      await takeScreenshot(page, 'dev-toolkit-button', 'Dev Toolkit button visible in bottom-right');
      
      await devToolkitButton.click();
      console.log('  Clicked Dev Toolkit button');
      await page.waitForTimeout(3000);
      
      // Check if new tab opened
      const pages = context.pages();
      if (pages.length > 1) {
        console.log('  ✅ Dev Toolkit opened in new tab');
        
        // Switch to Dev Toolkit tab
        const devToolkitPage = pages[pages.length - 1];
        await devToolkitPage.waitForTimeout(2000);
        
        await takeScreenshot(devToolkitPage, 'dev-toolkit-initial', 'Dev Toolkit initial view');
        
        // ========================================
        // PHASE 3: EXPLORE DEV TOOLKIT TABS
        // ========================================
        console.log('\n📍 PHASE 3: EXPLORE DEV TOOLKIT INTERFACE');
        console.log('-' .repeat(60));
        
        // Check for authenticated user display
        const authDisplay = await devToolkitPage.$('text=/Authenticated as:/');
        if (authDisplay) {
          console.log('  ✅ Shows authenticated user email');
          await takeScreenshot(devToolkitPage, 'auth-display', 'Authenticated user displayed');
        }
        
        // Look for tabs
        const tabs = await devToolkitPage.$$eval('button', buttons => 
          buttons.map(btn => btn.textContent).filter(text => text && text.length < 30)
        );
        
        console.log('  Available tabs:', tabs.filter(t => t).slice(0, 10).join(', '));
        
        // Click on Agent Visualizer tab if available
        const agentVisualizerTab = await devToolkitPage.$('button:has-text("Agent Visualizer")');
        if (agentVisualizerTab) {
          console.log('  Clicking Agent Visualizer tab...');
          await agentVisualizerTab.click();
          await devToolkitPage.waitForTimeout(2000);
          
          await takeScreenshot(devToolkitPage, 'agent-visualizer-empty', 'Agent Visualizer with no active task');
          
          // Check authentication badge
          const authBadge = await devToolkitPage.$('text=/Authenticated/');
          if (authBadge) {
            console.log('  ✅ Agent Visualizer shows "Authenticated" badge');
          } else {
            const demoMode = await devToolkitPage.$('text=/Demo Mode/');
            if (demoMode) {
              console.log('  ⚠️ Agent Visualizer shows "Demo Mode" badge');
            }
          }
        }
        
        // Click on Task Inspector tab
        const taskInspectorTab = await devToolkitPage.$('button:has-text("Task Inspector")');
        if (taskInspectorTab) {
          console.log('  Clicking Task Inspector tab...');
          await taskInspectorTab.click();
          await devToolkitPage.waitForTimeout(2000);
          
          await takeScreenshot(devToolkitPage, 'task-inspector', 'Task Inspector showing task list');
        }
        
        // Click on Migrations tab
        const migrationsTab = await devToolkitPage.$('button:has-text("Migrations")');
        if (migrationsTab) {
          console.log('  Clicking Migrations tab...');
          await migrationsTab.click();
          await devToolkitPage.waitForTimeout(2000);
          
          await takeScreenshot(devToolkitPage, 'migrations-tab', 'Migrations tab with applied migrations');
        }
        
        // Return to Agent Visualizer
        if (agentVisualizerTab) {
          console.log('  Returning to Agent Visualizer...');
          await agentVisualizerTab.click();
          await devToolkitPage.waitForTimeout(2000);
        }
        
        // ========================================
        // PHASE 4: TRIGGER ONBOARDING FLOW
        // ========================================
        console.log('\n📍 PHASE 4: TRIGGER ONBOARDING FLOW');
        console.log('-' .repeat(60));
        
        // Look for "Start New Onboarding" button in Agent Visualizer
        const startOnboardingButton = await devToolkitPage.$('button:has-text("Start New Onboarding")');
        if (startOnboardingButton) {
          console.log('  ✅ "Start New Onboarding" button found');
          await takeScreenshot(devToolkitPage, 'start-onboarding-button', 'Start New Onboarding button visible');
          
          console.log('  Clicking "Start New Onboarding"...');
          await startOnboardingButton.click();
          await devToolkitPage.waitForTimeout(3000);
          
          await takeScreenshot(devToolkitPage, 'onboarding-triggered', 'Onboarding task triggered');
          
          // ========================================
          // PHASE 5: MONITOR ORCHESTRATION
          // ========================================
          console.log('\n📍 PHASE 5: MONITOR YAML ORCHESTRATION');
          console.log('-' .repeat(60));
          
          // Wait for events to appear
          console.log('  Waiting for orchestration events...');
          await devToolkitPage.waitForTimeout(5000);
          
          await takeScreenshot(devToolkitPage, 'orchestration-active', 'Orchestration actively running');
          
          // Check for timeline view
          const timelineElements = await devToolkitPage.$$('[class*="timeline"]');
          if (timelineElements.length > 0) {
            console.log(`  ✅ Timeline view showing ${timelineElements.length} elements`);
            await takeScreenshot(devToolkitPage, 'timeline-view', 'Timeline view with orchestration events');
          }
          
          // Check for event cards
          const eventCards = await devToolkitPage.$$('[class*="card"]');
          console.log(`  Found ${eventCards.length} event cards`);
          
          if (eventCards.length > 0) {
            await takeScreenshot(devToolkitPage, 'event-cards', 'Event cards showing agent activities');
          }
          
          // Look for specific agent activities
          const agentNames = ['DataCollectionAgent', 'BusinessAnalysisAgent', 'ComplianceAgent', 'OnboardingAgent'];
          for (const agentName of agentNames) {
            const agentActivity = await devToolkitPage.$(`text=/${agentName}/`);
            if (agentActivity) {
              console.log(`  ✅ ${agentName} activity detected`);
            }
          }
          
          // Wait for more events
          await devToolkitPage.waitForTimeout(5000);
          await takeScreenshot(devToolkitPage, 'orchestration-progress', 'Orchestration in progress');
          
        } else {
          console.log('  ❌ "Start New Onboarding" button not found');
          console.log('  This may indicate:');
          console.log('    • User already has an active onboarding task');
          console.log('    • Authentication issue preventing task creation');
          console.log('    • Component not fully loaded');
        }
        
        // ========================================
        // PHASE 6: INSPECT TASK DETAILS
        // ========================================
        console.log('\n📍 PHASE 6: INSPECT TASK DETAILS');
        console.log('-' .repeat(60));
        
        // Switch to Task Inspector to see created tasks
        if (taskInspectorTab) {
          await taskInspectorTab.click();
          await devToolkitPage.waitForTimeout(2000);
          
          await takeScreenshot(devToolkitPage, 'task-list-after', 'Task list after onboarding creation');
          
          // Look for onboarding task
          const onboardingTask = await devToolkitPage.$('text=/onboarding/i');
          if (onboardingTask) {
            console.log('  ✅ Onboarding task found in task list');
            await onboardingTask.click();
            await devToolkitPage.waitForTimeout(2000);
            
            await takeScreenshot(devToolkitPage, 'task-details', 'Onboarding task details');
          }
        }
        
        // ========================================
        // PHASE 7: CHECK MAIN APP STATE
        // ========================================
        console.log('\n📍 PHASE 7: CHECK MAIN APPLICATION STATE');
        console.log('-' .repeat(60));
        
        // Switch back to main app
        await page.bringToFront();
        await page.waitForTimeout(2000);
        
        await takeScreenshot(page, 'main-app-after', 'Main app after onboarding triggered');
        
        // Check if onboarding card appeared
        const onboardingCard = await page.$('[class*="onboarding"]');
        if (onboardingCard) {
          console.log('  ✅ Onboarding card visible in main app');
          await takeScreenshot(page, 'onboarding-card', 'Onboarding card in main application');
        }
        
      } else {
        console.log('  ❌ Dev Toolkit did not open in new tab');
        
        // Check if it opened inline
        const devToolkitInline = await page.$('[class*="dev-toolkit"]');
        if (devToolkitInline) {
          console.log('  ℹ️ Dev Toolkit opened inline');
          await takeScreenshot(page, 'dev-toolkit-inline', 'Dev Toolkit inline view');
        }
      }
    } else {
      console.log('  ❌ Dev Toolkit button not found');
      console.log('  Checking for alternative access...');
      
      // Try keyboard shortcut
      await page.keyboard.press('Control+Shift+D');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'after-keyboard-shortcut', 'After keyboard shortcut attempt');
    }
    
    // ========================================
    // PHASE 8: GENERATE SUMMARY REPORT
    // ========================================
    console.log('\n' + '=' .repeat(80));
    console.log('📊 DEMONSTRATION SUMMARY');
    console.log('=' .repeat(80));
    
    const summary = {
      totalScreenshots: screenshotCount,
      capturedEvents: capturedEvents.length,
      phasesCompleted: [],
      yamlOrchestrationDetected: false,
      agentsDetected: [],
      issues: []
    };
    
    // Analyze captured events
    capturedEvents.forEach(event => {
      if (event.text.includes('YAML')) summary.yamlOrchestrationDetected = true;
      if (event.text.includes('DataCollectionAgent')) summary.agentsDetected.push('DataCollectionAgent');
      if (event.text.includes('BusinessAnalysisAgent')) summary.agentsDetected.push('BusinessAnalysisAgent');
      if (event.text.includes('ComplianceAgent')) summary.agentsDetected.push('ComplianceAgent');
    });
    
    summary.agentsDetected = [...new Set(summary.agentsDetected)];
    
    console.log('\n📈 Results:');
    console.log(`  • Screenshots captured: ${summary.totalScreenshots}`);
    console.log(`  • Events captured: ${summary.capturedEvents}`);
    console.log(`  • YAML orchestration: ${summary.yamlOrchestrationDetected ? '✅ Detected' : '❌ Not detected'}`);
    console.log(`  • Agents detected: ${summary.agentsDetected.length > 0 ? summary.agentsDetected.join(', ') : 'None'}`);
    
    // Save summary
    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // Generate HTML report with all screenshots
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>PRD Onboarding Demonstration - ${testRunId}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    h1 {
      margin: 0;
      font-size: 36px;
      font-weight: 700;
    }
    .subtitle {
      margin-top: 10px;
      opacity: 0.9;
      font-size: 18px;
    }
    .phase {
      padding: 40px;
      border-bottom: 1px solid #e5e7eb;
    }
    .phase:last-child {
      border-bottom: none;
    }
    .phase-title {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .phase-number {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .screenshots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .screenshot-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .screenshot-card img {
      width: 100%;
      display: block;
    }
    .screenshot-label {
      padding: 12px;
      background: #f9fafb;
      font-size: 14px;
      color: #4b5563;
      font-weight: 500;
    }
    .summary {
      background: #f3f4f6;
      padding: 30px 40px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    .metric {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .metric-label {
      font-size: 14px;
      color: #6b7280;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 PRD Onboarding Flow Demonstration</h1>
      <div class="subtitle">Complete E2E demonstration with YAML orchestration</div>
      <div class="subtitle">Test Run: ${testRunId} | ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="summary">
      <div class="metric">
        <div class="metric-value">${screenshotCount}</div>
        <div class="metric-label">Screenshots</div>
      </div>
      <div class="metric">
        <div class="metric-value">${capturedEvents.length}</div>
        <div class="metric-label">Events Captured</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.agentsDetected.length}</div>
        <div class="metric-label">Agents Detected</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.yamlOrchestrationDetected ? '✅' : '❌'}</div>
        <div class="metric-label">YAML Orchestration</div>
      </div>
    </div>
    
    <div class="phase">
      <div class="phase-title">
        <span class="phase-number">1</span>
        Initial Load and Authentication
      </div>
      <div class="screenshots-grid">
        ${await generateScreenshotCards(outputDir, 1, 1)}
      </div>
    </div>
    
    <div class="phase">
      <div class="phase-title">
        <span class="phase-number">2</span>
        Dev Toolkit Access
      </div>
      <div class="screenshots-grid">
        ${await generateScreenshotCards(outputDir, 2, 3)}
      </div>
    </div>
    
    <div class="phase">
      <div class="phase-title">
        <span class="phase-number">3</span>
        Dev Toolkit Interface
      </div>
      <div class="screenshots-grid">
        ${await generateScreenshotCards(outputDir, 4, 8)}
      </div>
    </div>
    
    <div class="phase">
      <div class="phase-title">
        <span class="phase-number">4</span>
        Onboarding Trigger
      </div>
      <div class="screenshots-grid">
        ${await generateScreenshotCards(outputDir, 9, 10)}
      </div>
    </div>
    
    <div class="phase">
      <div class="phase-title">
        <span class="phase-number">5</span>
        YAML Orchestration Monitoring
      </div>
      <div class="screenshots-grid">
        ${await generateScreenshotCards(outputDir, 11, 15)}
      </div>
    </div>
    
    <div class="phase">
      <div class="phase-title">
        <span class="phase-number">6</span>
        Task Details & Final State
      </div>
      <div class="screenshots-grid">
        ${await generateScreenshotCards(outputDir, 16, screenshotCount)}
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
    console.error('\n❌ Error during demonstration:', error.message);
    await fs.writeFile(
      path.join(outputDir, 'error.json'),
      JSON.stringify({ 
        error: error.message, 
        stack: error.stack,
        capturedEvents: capturedEvents
      }, null, 2)
    );
  }
}

async function generateScreenshotCards(outputDir, start, end) {
  const cards = [];
  const screenshots = await fs.readdir(path.join(outputDir, 'screenshots'));
  
  for (let i = start; i <= end && i <= screenshots.length; i++) {
    const filename = screenshots.find(f => f.startsWith(String(i).padStart(2, '0')));
    if (filename) {
      const label = filename.replace(/^\d+-/, '').replace('.png', '').replace(/-/g, ' ');
      cards.push(`
        <div class="screenshot-card">
          <img src="screenshots/${filename}" alt="${label}">
          <div class="screenshot-label">${i}. ${label}</div>
        </div>
      `);
    }
  }
  
  return cards.join('');
}

// Run the demonstration
demonstratePRDOnboarding().then(() => {
  console.log('\n✅ Demonstration completed successfully');
}).catch(err => {
  console.error('❌ Demonstration failed:', err);
  process.exit(1);
});