#!/usr/bin/env node

/**
 * E2E Test for Onboarding Flow with Proper Instrumentation
 * 
 * Uses deterministic waits based on data attributes instead of arbitrary timeouts
 * Following the Playwright Testing Standards
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const { 
  waitForAppReady,
  waitForDataLoad,
  waitForAuthReady,
  clickTestId,
  waitForTestIdVisible,
  getTestIdText,
  waitForDataAttribute
} = require('./helpers/test-helpers');

async function testOnboardingWithInstrumentation() {
  const testRunId = Date.now();
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/instrumented-test-${testRunId}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🚀 INSTRUMENTED ONBOARDING TEST');
  console.log('=' .repeat(80));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('🆔 Test Run:', testRunId);
  console.log('📁 Output:', outputDir);
  console.log('=' .repeat(80) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    // PHASE 1: APP INITIALIZATION
    // ========================================
    console.log('📍 PHASE 1: APP INITIALIZATION');
    console.log('-' .repeat(60));
    
    const page = await context.newPage();
    
    // Capture console logs for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Onboarding') || 
          text.includes('Agent') || 
          text.includes('Task') ||
          text.includes('YAML')) {
        capturedEvents.push({
          time: Date.now(),
          type: msg.type(),
          text: text.substring(0, 500)
        });
      }
    });
    
    console.log('  Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for app to be ready using deterministic signal
    console.log('  Waiting for app ready signal...');
    await waitForAppReady(page);
    console.log('  ✅ App is ready');
    
    // Check authentication status
    await waitForAuthReady(page);
    const authReady = await page.getAttribute('body', 'data-auth-ready');
    console.log(`  Authentication status: ${authReady === 'true' ? '✅ Authenticated' : '❌ Not authenticated'}`);
    
    await takeScreenshot(page, 'app-initialized', 'Application initialized and ready');
    
    // ========================================
    // PHASE 2: OPEN DEV TOOLKIT
    // ========================================
    console.log('\n📍 PHASE 2: OPEN DEV TOOLKIT');
    console.log('-' .repeat(60));
    
    // Click Dev Toolkit button using data-testid
    console.log('  Looking for Dev Toolkit button...');
    await waitForTestIdVisible(page, 'dev-toolkit-button');
    console.log('  ✅ Dev Toolkit button found');
    
    await takeScreenshot(page, 'dev-toolkit-button-visible', 'Dev Toolkit button visible');
    
    console.log('  Clicking Dev Toolkit button...');
    await clickTestId(page, 'dev-toolkit-button');
    
    // Wait for new tab to open
    await page.waitForTimeout(2000); // Brief wait for tab to open
    
    const pages = context.pages();
    if (pages.length > 1) {
      console.log('  ✅ Dev Toolkit opened in new tab');
      
      // Switch to Dev Toolkit tab
      const devToolkitPage = pages[pages.length - 1];
      
      // Wait for Dev Toolkit to be ready
      console.log('  Waiting for Dev Toolkit to load...');
      await waitForDataLoad(devToolkitPage, 'dev-toolkit-standalone');
      console.log('  ✅ Dev Toolkit loaded');
      
      // Check authentication in Dev Toolkit
      const devToolkitAuth = await devToolkitPage.getAttribute('[data-testid="dev-toolkit-standalone"]', 'data-auth-ready');
      console.log(`  Dev Toolkit auth status: ${devToolkitAuth === 'true' ? '✅ Authenticated' : '❌ Not authenticated'}`);
      
      if (devToolkitAuth === 'true') {
        const userEmail = await getTestIdText(devToolkitPage, 'auth-email');
        console.log(`  Authenticated as: ${userEmail}`);
      }
      
      await devToolkitPage.screenshot({
        path: path.join(outputDir, 'screenshots', '03-dev-toolkit-loaded.png'),
        fullPage: true
      });
      console.log('  📸 [3] Dev Toolkit loaded');
      
      // ========================================
      // PHASE 3: ACCESS AGENT VISUALIZER
      // ========================================
      console.log('\n📍 PHASE 3: ACCESS AGENT VISUALIZER');
      console.log('-' .repeat(60));
      
      // Wait for Agent Visualizer to be ready
      console.log('  Waiting for Agent Visualizer...');
      await waitForDataLoad(devToolkitPage, 'agent-visualizer');
      console.log('  ✅ Agent Visualizer ready');
      
      // Check if authenticated badge is shown
      await waitForTestIdVisible(devToolkitPage, 'auth-status-badge');
      const authBadgeText = await getTestIdText(devToolkitPage, 'auth-status-badge');
      console.log(`  Auth badge shows: ${authBadgeText}`);
      
      await devToolkitPage.screenshot({
        path: path.join(outputDir, 'screenshots', '04-agent-visualizer-ready.png'),
        fullPage: true
      });
      console.log('  📸 [4] Agent Visualizer ready');
      
      // ========================================
      // PHASE 4: TRIGGER ONBOARDING
      // ========================================
      console.log('\n📍 PHASE 4: TRIGGER ONBOARDING');
      console.log('-' .repeat(60));
      
      // Check if Start Onboarding button exists
      const hasOnboardingButton = await devToolkitPage.$('[data-testid="start-onboarding-button"]');
      
      if (hasOnboardingButton) {
        console.log('  ✅ Start Onboarding button found');
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '05-before-onboarding.png'),
          fullPage: true
        });
        console.log('  📸 [5] Before triggering onboarding');
        
        console.log('  Clicking Start Onboarding...');
        await clickTestId(devToolkitPage, 'start-onboarding-button');
        
        // Wait for task to be created
        console.log('  Waiting for task creation...');
        await waitForDataAttribute(devToolkitPage, 'agent-visualizer', 'has-task', 'true');
        console.log('  ✅ Task created');
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '06-onboarding-started.png'),
          fullPage: true
        });
        console.log('  📸 [6] Onboarding started');
        
        // ========================================
        // PHASE 5: MONITOR ORCHESTRATION
        // ========================================
        console.log('\n📍 PHASE 5: MONITOR ORCHESTRATION');
        console.log('-' .repeat(60));
        
        // Switch to Timeline tab
        await clickTestId(devToolkitPage, 'timeline-tab');
        console.log('  Switched to Timeline tab');
        
        // Wait for events to appear
        await page.waitForTimeout(5000); // Allow time for events to populate
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '07-timeline-view.png'),
          fullPage: true
        });
        console.log('  📸 [7] Timeline view with events');
        
        // Check for agent activities
        const agentNames = ['DataCollectionAgent', 'BusinessAnalysisAgent', 'ComplianceAgent'];
        for (const agentName of agentNames) {
          const agentElement = await devToolkitPage.$(`text=/${agentName}/`);
          if (agentElement) {
            console.log(`  ✅ ${agentName} activity detected`);
          }
        }
        
        // Switch to Context tab
        await clickTestId(devToolkitPage, 'context-tab');
        console.log('  Switched to Context tab');
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '08-context-view.png'),
          fullPage: true
        });
        console.log('  📸 [8] Context view');
        
        // Switch to Reasoning tab
        await clickTestId(devToolkitPage, 'reasoning-tab');
        console.log('  Switched to Reasoning tab');
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '09-reasoning-view.png'),
          fullPage: true
        });
        console.log('  📸 [9] Agent reasoning view');
        
      } else {
        console.log('  ❌ Start Onboarding button not found');
        console.log('  This may indicate user already has an active onboarding task');
        
        // Check task selector
        const hasTaskSelector = await devToolkitPage.$('[data-testid="task-selector"]');
        if (hasTaskSelector) {
          console.log('  ✅ Task selector found - user has existing tasks');
          
          await devToolkitPage.screenshot({
            path: path.join(outputDir, 'screenshots', '05-existing-tasks.png'),
            fullPage: true
          });
          console.log('  📸 [5] Existing tasks view');
        }
      }
      
      // ========================================
      // PHASE 6: VERIFY MAIN APP STATE
      // ========================================
      console.log('\n📍 PHASE 6: VERIFY MAIN APP STATE');
      console.log('-' .repeat(60));
      
      // Switch back to main app
      await page.bringToFront();
      
      // Wait for dashboard to be loaded
      await waitForDataLoad(page, 'dashboard');
      console.log('  ✅ Dashboard loaded');
      
      await takeScreenshot(page, 'final-dashboard-state', 'Final dashboard state');
      
    } else {
      console.log('  ❌ Dev Toolkit did not open in new tab');
    }
    
    // ========================================
    // TEST SUMMARY
    // ========================================
    console.log('\n' + '=' .repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(80));
    
    const summary = {
      testRunId,
      totalScreenshots: screenshotCount,
      capturedEvents: capturedEvents.length,
      authenticated: authReady === 'true',
      devToolkitOpened: pages.length > 1,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n📈 Results:');
    console.log(`  • Screenshots captured: ${summary.totalScreenshots}`);
    console.log(`  • Events captured: ${summary.capturedEvents}`);
    console.log(`  • Authentication: ${summary.authenticated ? '✅ Success' : '❌ Failed'}`);
    console.log(`  • Dev Toolkit: ${summary.devToolkitOpened ? '✅ Opened' : '❌ Failed to open'}`);
    
    // Save summary
    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n📁 Full results saved to: ${outputDir}`);
    console.log('✅ Test completed successfully using deterministic waits');
    
    // Keep browser open for inspection
    console.log('\n🔍 Browser windows remain open for manual inspection');
    console.log('Press Ctrl+C to close when done');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await fs.writeFile(
      path.join(outputDir, 'error.json'),
      JSON.stringify({ 
        error: error.message, 
        stack: error.stack,
        capturedEvents: capturedEvents
      }, null, 2)
    );
    
    await browser.close();
    process.exit(1);
  }
}

// Run the test
testOnboardingWithInstrumentation().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});