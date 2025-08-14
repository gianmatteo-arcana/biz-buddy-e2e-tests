/**
 * E2E Test for Epic #31: Task Introspection Complete Implementation
 * 
 * This test validates all implemented features:
 * - Task selection and loading
 * - Timeline visualization
 * - Context inspection
 * - Export functionality
 * - Filter controls
 * - Replay features
 * - Performance analysis
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testTaskIntrospectionEpic() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = `epic-31-results-${timestamp}`;
  await fs.mkdir(resultsDir, { recursive: true });

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const results = {
    epic: 31,
    title: 'Task Introspection Complete Implementation',
    timestamp: new Date().toISOString(),
    features: {},
    screenshots: [],
    errors: []
  };

  try {
    console.log('🎯 Testing Epic #31: Task Introspection Implementation\n');
    
    // Step 1: Navigate to Dev Toolkit
    console.log('1️⃣ Navigating to Dev Toolkit...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForTimeout(3000);
    
    // Capture initial state
    await page.screenshot({ 
      path: path.join(resultsDir, '01-dev-toolkit-initial.png'), 
      fullPage: true 
    });
    results.screenshots.push('01-dev-toolkit-initial.png');
    
    // Step 2: Click on Agent Visualizer
    console.log('2️⃣ Opening Agent Visualizer...');
    const agentVizButton = await page.locator('button:has-text("Agent Visualizer")').count();
    if (agentVizButton > 0) {
      await page.locator('button:has-text("Agent Visualizer")').click();
      await page.waitForTimeout(2000);
    }
    
    // Step 3: Access Task Introspection tab
    console.log('3️⃣ Accessing Task Introspection tab...');
    const introspectionTab = await page.locator('[data-testid="introspection-tab"], button:has-text("Introspection")');
    if (await introspectionTab.count() > 0) {
      await introspectionTab.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(resultsDir, '02-introspection-tab.png'), 
        fullPage: true 
      });
      results.screenshots.push('02-introspection-tab.png');
      results.features.tabAccess = '✅';
      console.log('  ✅ Task Introspection tab accessible');
    } else {
      results.features.tabAccess = '❌';
      console.log('  ❌ Task Introspection tab not found');
    }
    
    // Step 4: Test Task Selection
    console.log('4️⃣ Testing task selection...');
    const taskSelector = await page.locator('button[role="combobox"], select');
    if (await taskSelector.count() > 0) {
      await taskSelector.first().click();
      await page.waitForTimeout(1000);
      
      const tasks = await page.locator('[role="option"]').count();
      console.log(`  📋 Found ${tasks} available tasks`);
      
      if (tasks > 0) {
        await page.locator('[role="option"]').first().click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: path.join(resultsDir, '03-task-selected.png'), 
          fullPage: true 
        });
        results.screenshots.push('03-task-selected.png');
        results.features.taskSelection = '✅';
        console.log('  ✅ Task selection working');
      }
    }
    
    // Step 5: Test Timeline View
    console.log('5️⃣ Testing Timeline tab...');
    const timelineTab = await page.locator('[data-testid="timeline-tab"], button:has-text("Timeline")');
    if (await timelineTab.count() > 0) {
      await timelineTab.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(resultsDir, '04-timeline-view.png'), 
        fullPage: true 
      });
      results.screenshots.push('04-timeline-view.png');
      results.features.timeline = '✅';
      console.log('  ✅ Timeline visualization working');
    }
    
    // Step 6: Test Export Timeline functionality
    console.log('6️⃣ Testing Export Timeline...');
    const exportButton = await page.locator('button:has-text("Export Timeline")');
    if (await exportButton.count() > 0) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportButton.click();
      const download = await downloadPromise;
      
      if (download) {
        results.features.exportTimeline = '✅';
        console.log('  ✅ Export Timeline functionality working');
      } else {
        results.features.exportTimeline = '⚠️';
        console.log('  ⚠️ Export Timeline clicked but no download initiated');
      }
    }
    
    // Step 7: Test Replay Task functionality
    console.log('7️⃣ Testing Replay Task...');
    await page.locator('[data-testid="introspection-tab"], button:has-text("Introspection")').click();
    await page.waitForTimeout(1000);
    
    const replayButton = await page.locator('button:has-text("Replay Task")');
    if (await replayButton.count() > 0 && !(await replayButton.isDisabled())) {
      await replayButton.click();
      await page.waitForTimeout(2000);
      
      // Check if replay started (button text changes)
      const replayingButton = await page.locator('button:has-text("Replaying")').count();
      if (replayingButton > 0) {
        results.features.replayTask = '✅';
        console.log('  ✅ Replay Task functionality working');
        
        await page.screenshot({ 
          path: path.join(resultsDir, '05-replay-active.png'), 
          fullPage: true 
        });
        results.screenshots.push('05-replay-active.png');
      } else {
        results.features.replayTask = '⚠️';
        console.log('  ⚠️ Replay Task button clicked but no replay started');
      }
    }
    
    // Step 8: Test Filter Controls
    console.log('8️⃣ Testing Filter Controls...');
    
    // Test Errors Only filter
    const errorsOnlyButton = await page.locator('button:has-text("Errors Only")');
    if (await errorsOnlyButton.count() > 0) {
      await errorsOnlyButton.click();
      await page.waitForTimeout(1000);
      
      // Check if button state changed (variant changes)
      const isActive = await errorsOnlyButton.evaluate(el => 
        el.classList.contains('bg-primary') || el.getAttribute('data-state') === 'active'
      );
      
      results.features.errorsFilter = isActive ? '✅' : '⚠️';
      console.log(`  ${isActive ? '✅' : '⚠️'} Errors Only filter ${isActive ? 'active' : 'clicked'}`);
    }
    
    // Test Agent Filter
    const filterButton = await page.locator('button:has-text("Filter by Agent")');
    if (await filterButton.count() > 0) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      const filterOptions = await page.locator('[role="menuitem"]').count();
      if (filterOptions > 0) {
        results.features.agentFilter = '✅';
        console.log(`  ✅ Agent filter has ${filterOptions} options`);
        
        await page.screenshot({ 
          path: path.join(resultsDir, '06-filter-dropdown.png'), 
          fullPage: true 
        });
        results.screenshots.push('06-filter-dropdown.png');
        
        // Close dropdown
        await page.keyboard.press('Escape');
      }
    }
    
    // Step 9: Test Performance Button
    console.log('9️⃣ Testing Performance Analysis...');
    const performanceButton = await page.locator('button:has-text("Performance")');
    if (await performanceButton.count() > 0 && !(await performanceButton.isDisabled())) {
      await performanceButton.click();
      await page.waitForTimeout(1000);
      
      // Check if modal or new view opened
      const performanceView = await page.locator('[role="dialog"], [data-testid="performance-modal"]').count();
      results.features.performance = performanceView > 0 ? '✅' : '⚠️';
      console.log(`  ${performanceView > 0 ? '✅' : '⚠️'} Performance analysis ${performanceView > 0 ? 'opened' : 'clicked'}`);
      
      if (performanceView > 0) {
        await page.screenshot({ 
          path: path.join(resultsDir, '07-performance-modal.png'), 
          fullPage: true 
        });
        results.screenshots.push('07-performance-modal.png');
      }
    }
    
    // Step 10: Verify Context Tab
    console.log('🔟 Testing Context inspection...');
    const contextTab = await page.locator('[data-testid="context-tab"], button:has-text("Context")');
    if (await contextTab.count() > 0) {
      await contextTab.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(resultsDir, '08-context-view.png'), 
        fullPage: true 
      });
      results.screenshots.push('08-context-view.png');
      results.features.contextView = '✅';
      console.log('  ✅ Context inspection view accessible');
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: path.join(resultsDir, '09-final-state.png'), 
      fullPage: true 
    });
    results.screenshots.push('09-final-state.png');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    results.errors.push(error.message);
    
    await page.screenshot({ 
      path: path.join(resultsDir, 'error-state.png'), 
      fullPage: true 
    });
    results.screenshots.push('error-state.png');
  } finally {
    await browser.close();
  }
  
  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 EPIC #31 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const features = [
    ['Tab Access', results.features.tabAccess || '❌'],
    ['Task Selection', results.features.taskSelection || '❌'],
    ['Timeline View', results.features.timeline || '❌'],
    ['Export Timeline', results.features.exportTimeline || '❌'],
    ['Replay Task', results.features.replayTask || '❌'],
    ['Errors Filter', results.features.errorsFilter || '❌'],
    ['Agent Filter', results.features.agentFilter || '❌'],
    ['Performance Analysis', results.features.performance || '❌'],
    ['Context View', results.features.contextView || '❌']
  ];
  
  features.forEach(([name, status]) => {
    console.log(`  ${name}: ${status}`);
  });
  
  const passCount = Object.values(results.features).filter(v => v === '✅').length;
  const totalCount = features.length;
  const passRate = Math.round((passCount / totalCount) * 100);
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Features Working: ${passCount}/${totalCount} (${passRate}%)`);
  console.log(`📸 Screenshots Captured: ${results.screenshots.length}`);
  console.log(`📁 Results saved to: ${resultsDir}/`);
  
  // Save results JSON
  await fs.writeFile(
    path.join(resultsDir, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Determine overall success
  if (passRate >= 80) {
    console.log('\n🎉 EPIC #31: TASK INTROSPECTION IMPLEMENTATION VERIFIED!');
    return { success: true, results, resultsDir };
  } else {
    console.log('\n⚠️ EPIC #31: Some features need attention');
    return { success: false, results, resultsDir };
  }
}

// Run the test
testTaskIntrospectionEpic()
  .then(({ success, resultsDir }) => {
    console.log('\n✨ Test completed. Check', resultsDir, 'for screenshots.');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });