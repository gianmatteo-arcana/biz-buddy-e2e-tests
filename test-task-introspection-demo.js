#!/usr/bin/env node

/**
 * Test Task Introspection Demo
 * Captures the DevToolkit showing rich task timeline with agent events
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Screenshot configuration
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const testDir = `test-introspection-demo-${timestamp}`;

// Create test directory
fs.mkdirSync(testDir, { recursive: true });

const APP_URL = process.env.APP_URL || 'http://localhost:8081';

async function captureTaskIntrospection() {
  console.log('🚀 Testing Task Introspection Demo');
  console.log('═'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to DevToolkit
    console.log('📱 Opening DevToolkit...');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for authentication
    await page.waitForTimeout(2000);
    
    // Capture initial DevToolkit state
    await page.screenshot({ 
      path: path.join(testDir, '01-devtoolkit-loaded.png'),
      fullPage: true
    });
    console.log('📸 Captured: DevToolkit loaded');
    
    // Look for the Tech Innovations task
    console.log('🔍 Looking for Tech Innovations LLC task...');
    
    // Wait for tasks to load
    await page.waitForTimeout(3000);
    
    // Look for the task we just created
    const taskSelector = 'text=/Tech Innovations LLC/i';
    const taskFound = await page.locator(taskSelector).count() > 0;
    
    if (taskFound) {
      console.log('✅ Found Tech Innovations LLC task!');
      
      // Capture task in list
      await page.screenshot({ 
        path: path.join(testDir, '02-task-in-list.png'),
        fullPage: true
      });
      console.log('📸 Captured: Task visible in list');
      
      // Click on the task to view details
      await page.locator(taskSelector).first().click();
      console.log('👆 Clicked on task to view details');
      
      // Wait for timeline to load
      await page.waitForTimeout(2000);
      
      // Capture task timeline
      await page.screenshot({ 
        path: path.join(testDir, '03-task-timeline-visible.png'),
        fullPage: true
      });
      console.log('📸 Captured: Task timeline with events');
      
      // Check if timeline events are visible
      const eventsVisible = await page.locator('text=/ONBOARDING_INITIATED/i').count() > 0;
      
      if (eventsVisible) {
        console.log('✅ Timeline events are visible!');
        
        // Scroll to see more events if needed
        await page.evaluate(() => {
          const timeline = document.querySelector('[data-testid="task-timeline"]');
          if (timeline) {
            timeline.scrollTop = timeline.scrollHeight / 2;
          }
        });
        
        await page.waitForTimeout(1000);
        
        // Capture middle of timeline
        await page.screenshot({ 
          path: path.join(testDir, '04-timeline-middle-events.png'),
          fullPage: true
        });
        console.log('📸 Captured: Middle timeline events');
        
        // Scroll to bottom
        await page.evaluate(() => {
          const timeline = document.querySelector('[data-testid="task-timeline"]');
          if (timeline) {
            timeline.scrollTop = timeline.scrollHeight;
          }
        });
        
        await page.waitForTimeout(1000);
        
        // Capture end of timeline
        await page.screenshot({ 
          path: path.join(testDir, '05-timeline-end-events.png'),
          fullPage: true
        });
        console.log('📸 Captured: End timeline events');
        
      } else {
        console.log('⚠️ Timeline events not visible yet');
        
        // Try to refresh the view
        await page.reload();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: path.join(testDir, '06-after-refresh.png'),
          fullPage: true
        });
        console.log('📸 Captured: After refresh');
      }
      
    } else {
      console.log('⚠️ Tech Innovations LLC task not found');
      
      // Capture what's visible
      await page.screenshot({ 
        path: path.join(testDir, '07-no-task-found.png'),
        fullPage: true
      });
      
      // Try to check if there are any tasks at all
      const anyTasks = await page.locator('[data-testid="task-item"]').count();
      console.log(`📊 Found ${anyTasks} tasks in total`);
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TASK INTROSPECTION TEST RESULTS');
    console.log('═'.repeat(60));
    
    if (taskFound && eventsVisible) {
      console.log('✅ SUCCESS: Task Introspection fully working!');
      console.log('   • Task created and visible in DevToolkit');
      console.log('   • Timeline shows agent events');
      console.log('   • Rich data and reasoning displayed');
    } else if (taskFound) {
      console.log('⚠️ PARTIAL: Task visible but timeline not showing');
      console.log('   • Task appears in DevToolkit');
      console.log('   • Timeline may need refresh or data sync');
    } else {
      console.log('❌ ISSUE: Task not appearing in DevToolkit');
      console.log('   • May need to refresh or check filters');
      console.log('   • Backend connection should be verified');
    }
    
    console.log('\n📸 Screenshots saved to:', testDir);
    console.log('🔍 Review screenshots to see the visual state');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    
    // Capture error state
    await page.screenshot({ 
      path: path.join(testDir, 'error-state.png'),
      fullPage: true
    });
    
  } finally {
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will remain open for 10 seconds...');
    await page.waitForTimeout(10000);
    
    await browser.close();
    console.log('✅ Test complete');
  }
}

// Run the test
captureTaskIntrospection().catch(console.error);