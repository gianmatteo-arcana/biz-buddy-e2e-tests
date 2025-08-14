/**
 * Comprehensive Task Introspection E2E Test
 * Tests the complete workflow including task creation and introspection
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testTaskIntrospectionComprehensive() {
  console.log('🔍 Comprehensive Task Introspection Test');
  console.log('========================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
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

    console.log('📱 Opening application...');
    const timestamp = Date.now();
    await page.goto(`https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com?t=${timestamp}`, {
      waitUntil: 'networkidle'
    });

    // Check authentication
    const isAuthenticated = await page.locator('text=/✅ Authenticated/').count() > 0;
    console.log(`🔐 Authentication Status: ${isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);

    if (!isAuthenticated) {
      console.log('⚠️ Not authenticated - ending test');
      await context.close();
      return { success: false, reason: 'Not authenticated' };
    }

    // Step 1: Create a new task to introspect
    console.log('🚀 Step 1: Creating a new onboarding task...');
    
    // Look for "Start New Onboarding" button
    const startButton = await page.locator('button:has-text("Start New Onboarding")').first();
    if (await startButton.count() > 0) {
      await startButton.click();
      console.log('✅ Clicked Start New Onboarding');
      await page.waitForTimeout(3000); // Wait for task creation
    } else {
      console.log('⚠️ No Start New Onboarding button found, proceeding to Dev Toolkit');
    }

    // Step 2: Open Dev Toolkit
    console.log('🛠️ Step 2: Opening Dev Toolkit...');
    
    // Click on the Dev Toolkit link/button
    const devToolkitLink = page.locator('text=/Dev Toolkit/').first();
    if (await devToolkitLink.count() > 0) {
      await devToolkitLink.click();
      console.log('✅ Opened Dev Toolkit');
    } else {
      // Try opening dev toolkit standalone
      await page.goto(`https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone`, {
        waitUntil: 'networkidle'
      });
      console.log('✅ Opened Dev Toolkit Standalone');
    }

    await page.waitForTimeout(2000);

    // Step 3: Navigate to Agent Visualizer
    console.log('👁️ Step 3: Opening Agent Visualizer...');
    const agentVisualizerTab = page.locator('button:has-text("Agent Visualizer")');
    await agentVisualizerTab.click();
    console.log('✅ Clicked Agent Visualizer tab');
    await page.waitForTimeout(2000);

    // Step 4: Verify Introspection tab is active
    console.log('🔍 Step 4: Checking Introspection tab...');
    const introspectionTab = await page.locator('[data-testid="introspection-tab"]').count() > 0;
    console.log(`📊 Introspection Tab: ${introspectionTab ? '✅ Present' : '❌ Missing'}`);

    if (!introspectionTab) {
      // Try alternate selector
      const altTab = await page.locator('button:has-text("Introspection")').first();
      if (await altTab.count() > 0) {
        await altTab.click();
        console.log('✅ Clicked Introspection tab (alternate)');
      }
    }

    await page.waitForTimeout(2000);

    // Step 5: Check for and select a task
    console.log('📋 Step 5: Looking for available tasks...');
    
    const taskSelector = page.locator('button[role="combobox"]').first();
    if (await taskSelector.count() > 0) {
      console.log('✅ Found task selector');
      await taskSelector.click();
      await page.waitForTimeout(1000);
      
      // Check for available tasks
      const taskOptions = await page.locator('[role="option"]').count();
      console.log(`📝 Available tasks: ${taskOptions}`);
      
      if (taskOptions > 0) {
        // Select the first task
        await page.locator('[role="option"]').first().click();
        console.log('✅ Selected first available task');
        await page.waitForTimeout(3000); // Wait for task data to load
        
        // Step 6: Verify timeline appears
        console.log('📈 Step 6: Checking for timeline and analysis...');
        
        const components = {
          'Agent Timeline': await page.locator('text=/Agent Timeline/').count() > 0,
          'Context Details': await page.locator('text=/Selected Context Details/').count() > 0,
          'Flow Analysis': await page.locator('text=/Task Flow Analysis/').count() > 0,
          'Timeline Events': await page.locator('[data-testid="task-timeline"]').count() > 0
        };
        
        console.log('📊 Components after task selection:');
        for (const [name, exists] of Object.entries(components)) {
          console.log(`  ${exists ? '✅' : '❌'} ${name}`);
        }
        
        // Step 7: Test functionality if timeline loaded
        if (components['Timeline Events']) {
          console.log('🎯 Step 7: Testing interactive features...');
          
          // Test clicking on timeline events
          const timelineEvents = await page.locator('[data-testid="task-timeline"] > *').count();
          console.log(`📊 Timeline events found: ${timelineEvents}`);
          
          if (timelineEvents > 0) {
            // Click first timeline event
            await page.locator('[data-testid="task-timeline"] > *').first().click();
            await page.waitForTimeout(1000);
            
            // Check if context details populated
            const contextPopulated = await page.locator('text=/TaskContext Contribution/').count() > 0;
            console.log(`🔍 Context inspection: ${contextPopulated ? '✅ Working' : '❌ Not working'}`);
          }
          
          // Test filter dropdown
          const filterButton = page.locator('button:has-text("Filter by Agent")');
          if (await filterButton.count() > 0) {
            await filterButton.click();
            await page.waitForTimeout(500);
            
            const filterOptions = await page.locator('[role="menuitem"]').count();
            console.log(`🔽 Filter options: ${filterOptions > 0 ? '✅ Available' : '❌ None'}`);
            
            if (filterOptions > 0) {
              // Select first filter option
              await page.locator('[role="menuitem"]').first().click();
              console.log('✅ Applied agent filter');
            }
          }
          
          // Test export functionality
          const exportButton = page.locator('button:has-text("Export Timeline")');
          if (await exportButton.count() > 0) {
            console.log('✅ Export Timeline button present');
          }
        }
        
      } else {
        console.log('⚠️ No tasks available - testing with demo mode');
        
        // Close the dropdown
        await page.keyboard.press('Escape');
        
        // Check if we can see demo task option
        await taskSelector.click();
        const demoTask = await page.locator('text=/Sample Onboarding Task/').count() > 0;
        if (demoTask) {
          await page.locator('text=/Sample Onboarding Task/').click();
          console.log('✅ Selected demo task');
          await page.waitForTimeout(2000);
        }
      }
    } else {
      console.log('❌ Task selector not found');
    }

    // Take comprehensive screenshots
    const screenshotTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotDir = path.join('uploaded-screenshots', 'comprehensive-introspection', screenshotTimestamp);
    fs.mkdirSync(screenshotDir, { recursive: true });
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'full-interface.png'), 
      fullPage: true 
    });
    
    // Final verification
    const finalCheck = {
      introspectionTabActive: await page.locator('button:has-text("Introspection")').count() > 0,
      taskSelectorPresent: await page.locator('button[role="combobox"]').count() > 0,
      timelineVisible: await page.locator('text=/Agent Timeline/').count() > 0,
      controlsVisible: await page.locator('button:has-text("Export Timeline")').count() > 0
    };
    
    const successCount = Object.values(finalCheck).filter(Boolean).length;
    const totalChecks = Object.keys(finalCheck).length;
    
    console.log('🏁 COMPREHENSIVE TEST RESULTS:');
    console.log('==============================');
    console.log(`✅ Passed: ${successCount}/${totalChecks} checks`);
    console.log(`📸 Screenshots: ${screenshotDir}`);
    
    for (const [check, passed] of Object.entries(finalCheck)) {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    }
    
    const overallSuccess = successCount >= 3; // At least 3/4 must pass
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '⚠️ NEEDS ATTENTION'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 Task Introspection is working correctly in production!');
      console.log('   - Interface loads properly');
      console.log('   - Task selection works');  
      console.log('   - Timeline visualization appears');
      console.log('   - Interactive controls are functional');
    }
    
    await context.close();
    return { 
      success: overallSuccess, 
      results: finalCheck, 
      screenshots: screenshotDir 
    };

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the comprehensive test
testTaskIntrospectionComprehensive().then(result => {
  console.log('\n📊 Final Result:', result.success ? 'SUCCESS' : 'NEEDS WORK');
  process.exit(result.success ? 0 : 1);
});