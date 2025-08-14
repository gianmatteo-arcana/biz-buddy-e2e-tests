/**
 * E2E Test for Task Introspection Feature
 * 
 * Verifies that the new Task Introspection component:
 * - Loads in the Dev Toolkit
 * - Shows task selector
 * - Displays timeline visualization
 * - Allows context inspection
 * - Shows flow analysis
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testTaskIntrospection() {
  console.log('🔍 Testing Task Introspection Enhancement');
  console.log('=========================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Error:', msg.text());
      }
    });

    console.log('📱 Opening Dev Toolkit Standalone...');
    // Use production URL with cache busting
    const timestamp = Date.now();
    await page.goto(`https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone?t=${timestamp}`, {
      waitUntil: 'networkidle'
    });
    await page.waitForLoadState('networkidle');

    // Check authentication
    const isAuthenticated = await page.locator('text=/✅ Authenticated/').count() > 0;
    console.log(`🔐 Authentication Status: ${isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated (Demo mode)'}`);

    // Click on Agent Visualizer tab
    console.log('🎯 Clicking Agent Visualizer tab...');
    await page.click('button:has-text("Agent Visualizer")');
    await page.waitForTimeout(3000);

    // Debug: Check what's visible
    console.log('🔍 Debugging: Looking for tabs container...');
    const tabsContainer = await page.locator('[data-testid="visualizer-tabs"]').count() > 0;
    console.log(`  Tabs Container Visible: ${tabsContainer ? '✅' : '❌'}`);
    
    // Check for "No Task Selected" message
    const noTaskMessage = await page.locator('text=/No Task Selected/').count() > 0;
    console.log(`  "No Task Selected" Message: ${noTaskMessage ? 'Visible' : 'Not visible'}`);
    
    // Check for loading state
    const loadingCard = await page.locator('[data-testid="loading-card"]').count() > 0;
    console.log(`  Loading Card: ${loadingCard ? 'Visible' : 'Not visible'}`);

    // Check if Introspection tab exists
    console.log('🔍 Looking for Introspection tab...');
    const introspectionTabExists = await page.locator('[data-testid="introspection-tab"]').count() > 0;
    
    if (!introspectionTabExists) {
      // Try alternate selector
      const altExists = await page.locator('button:has-text("Introspection")').count() > 0;
      console.log(`📊 Introspection Tab: ${altExists ? '✅ Found (alternate selector)' : '❌ Not found'}`);
      
      if (altExists) {
        await page.click('button:has-text("Introspection")');
      }
    } else {
      console.log('✅ Introspection Tab Found!');
      await page.click('[data-testid="introspection-tab"]');
    }

    await page.waitForTimeout(2000);

    // Check for Task Selector
    console.log('🔍 Checking for Task Selector...');
    const taskSelectorExists = await page.locator('text=/Select a task to inspect/').count() > 0;
    console.log(`📋 Task Selector: ${taskSelectorExists ? '✅ Present' : '❌ Not found'}`);

    // Check for main components
    const components = {
      'Task Selector': await page.locator('button[role="combobox"]').count() > 0,
      'Refresh Button': await page.locator('button:has(svg.lucide-refresh-cw)').count() > 0,
      'Agent Timeline Card': await page.locator('text=/Agent Timeline/').count() > 0,
      'Context Details Card': await page.locator('text=/Selected Context Details/').count() > 0,
      'Flow Analysis Card': await page.locator('text=/Task Flow Analysis/').count() > 0
    };

    console.log('\n📊 Component Verification:');
    for (const [name, exists] of Object.entries(components)) {
      console.log(`  ${exists ? '✅' : '❌'} ${name}`);
    }

    // If in demo mode, check for sample task
    if (!isAuthenticated) {
      console.log('\n🎭 Demo Mode - Checking for sample task...');
      
      // Click on task selector
      const selectorButton = await page.locator('button[role="combobox"]').first();
      if (selectorButton) {
        await selectorButton.click();
        await page.waitForTimeout(1000);
        
        // Look for sample task
        const sampleTaskExists = await page.locator('text=/Sample Onboarding Task/').count() > 0;
        console.log(`📝 Sample Task: ${sampleTaskExists ? '✅ Available' : '❌ Not found'}`);
        
        if (sampleTaskExists) {
          await page.click('text=/Sample Onboarding Task/');
          await page.waitForTimeout(2000);
          
          // Check if timeline loads
          const timelineLoaded = await page.locator('text=/ProfileCollector/').count() > 0;
          console.log(`📈 Timeline Loaded: ${timelineLoaded ? '✅ Yes' : '❌ No'}`);
        }
      }
    }

    // Take screenshot
    const screenshotTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotDir = path.join('uploaded-screenshots', 'task-introspection', screenshotTimestamp);
    fs.mkdirSync(screenshotDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotDir, 'introspection-test.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

    // Generate test report
    const allComponentsPresent = Object.values(components).every(v => v);
    const testPassed = introspectionTabExists && taskSelectorExists && allComponentsPresent;

    const report = {
      timestamp: new Date().toISOString(),
      testName: 'Task Introspection Enhancement',
      environment: isAuthenticated ? 'Authenticated' : 'Demo Mode',
      results: {
        introspectionTabExists,
        taskSelectorExists,
        components,
        overallStatus: testPassed ? 'PASS' : 'PARTIAL'
      },
      screenshotPath
    };

    fs.writeFileSync(
      path.join(screenshotDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n🏁 TEST RESULTS:');
    console.log('================');
    console.log(`Overall Status: ${testPassed ? '✅ PASS' : '⚠️ PARTIAL SUCCESS'}`);
    console.log(`Environment: ${isAuthenticated ? 'Authenticated' : 'Demo Mode'}`);
    console.log(`Screenshot: ${screenshotPath}`);

    if (testPassed) {
      console.log('\n🎉 Task Introspection Enhancement is working successfully!');
      console.log('✅ PRD implementation Phase 1 complete!');
    } else {
      console.log('\n⚠️ Some components may need additional work.');
      console.log('Check the screenshot for visual verification.');
    }

    await context.close();
    return { success: testPassed, report };

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the test
testTaskIntrospection().then(result => {
  console.log('\n📊 Final Result:', result.success ? 'SUCCESS' : 'NEEDS WORK');
  process.exit(result.success ? 0 : 1);
});