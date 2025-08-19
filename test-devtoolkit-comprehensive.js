const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function comprehensiveDevToolkitDemo() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, `devtoolkit-comprehensive-${timestamp}`);
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Comprehensive Dev Toolkit Task Introspection Demo');
  console.log('📁 Screenshots:', screenshotDir);
  console.log('🌐 App URL:', BASE_URL);
  console.log('🔧 Backend URL:', BACKEND_URL);
  console.log('=' . repeat(60));

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });

  let screenshotCount = 0;
  const takeScreenshot = async (page, name, description) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ 
      path: path.join(screenshotDir, filename),
      fullPage: true 
    });
    console.log(`📸 [${screenshotCount}] ${description}`);
    return filename;
  };

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    // Monitor console for insights
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error')) {
        console.log('❌ Console Error:', text);
      } else if (text.includes('Task') || text.includes('Agent') || text.includes('Event')) {
        console.log('📝 Console:', text.substring(0, 100));
      }
    });

    // PHASE 1: Initial Load and Authentication Check
    console.log('\n🔹 PHASE 1: Initial Load and Authentication');
    console.log('-'.repeat(40));
    
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    await takeScreenshot(page, 'initial-load', 'Dev Toolkit initial load with authentication');
    
    // Check authentication status
    const authBadge = await page.locator('[data-testid="auth-status-badge"], text=/Authenticated/').isVisible();
    console.log(`✅ Authentication status: ${authBadge ? 'Authenticated' : 'Not authenticated'}`);
    
    // Check for migration indicator
    const migrationBadge = await page.locator('[class*="migration"], text=/migration/i').isVisible();
    if (migrationBadge) {
      console.log('⚠️ Pending migrations detected');
    }

    // PHASE 2: Task Selection and Loading
    console.log('\n🔹 PHASE 2: Task Selection and Loading');
    console.log('-'.repeat(40));
    
    const taskSelector = page.locator('select').first();
    if (await taskSelector.isVisible()) {
      const options = await taskSelector.locator('option').allTextContents();
      console.log(`📋 Found ${options.length} tasks available:`);
      options.forEach((opt, idx) => {
        if (opt && opt.trim()) {
          console.log(`   [${idx}] ${opt}`);
        }
      });
      
      // Try to select each task that has data
      for (let i = 1; i < Math.min(options.length, 4); i++) {
        if (options[i] && !options[i].includes('Select')) {
          console.log(`\n🔸 Selecting task: ${options[i]}`);
          await taskSelector.selectOption({ index: i });
          await page.waitForTimeout(3000);
          
          // Check if timeline has events
          const eventCount = await page.locator('text=/events/i').first().textContent();
          console.log(`   Timeline shows: ${eventCount}`);
          
          if (eventCount && !eventCount.includes('0')) {
            await takeScreenshot(page, `task-${i}-loaded`, `Task "${options[i]}" with timeline`);
            
            // This task has events, let's explore it
            console.log(`   ✅ Task has events, exploring further...`);
            break;
          }
        }
      }
    }

    // PHASE 3: Timeline Interaction
    console.log('\n🔹 PHASE 3: Timeline Event Interaction');
    console.log('-'.repeat(40));
    
    // Find all timeline events
    const timelineLanes = await page.locator('.timeline-lane').all();
    console.log(`📊 Found ${timelineLanes.length} timeline lanes`);
    
    for (let lane of timelineLanes) {
      const laneText = await lane.textContent();
      console.log(`   Lane: ${laneText.substring(0, 50)}`);
    }
    
    // Click on timeline events
    const eventElements = await page.locator('circle[r], rect[width]').all();
    console.log(`🎯 Found ${eventElements.length} potential timeline events`);
    
    let clickedEvents = 0;
    for (let i = 0; i < Math.min(eventElements.length, 5); i++) {
      try {
        const isVisible = await eventElements[i].isVisible();
        if (isVisible) {
          await eventElements[i].click({ force: true });
          await page.waitForTimeout(2000);
          
          // Check if event details appeared
          const hasDetails = await page.locator('text=/Agent:|Time:|Action:|Confidence:/').isVisible();
          if (hasDetails) {
            clickedEvents++;
            await takeScreenshot(page, `event-${clickedEvents}-details`, `Timeline event #${clickedEvents} with payload`);
            
            // Look for JSON payload
            const jsonContent = await page.locator('pre, code, [class*="json"]').first().textContent().catch(() => '');
            if (jsonContent) {
              console.log(`   ✅ Event ${clickedEvents} shows JSON payload (${jsonContent.length} chars)`);
            }
          }
        }
      } catch (e) {
        // Event might not be clickable
      }
    }
    console.log(`✅ Successfully clicked ${clickedEvents} events with details`);

    // PHASE 4: Tab Navigation and Content
    console.log('\n🔹 PHASE 4: Tab Navigation and Content Inspection');
    console.log('-'.repeat(40));
    
    const tabs = [
      { name: 'Introspection', expectedContent: 'timeline|events|agents' },
      { name: 'Timeline', expectedContent: 'duration|events' },
      { name: 'Context', expectedContent: 'context|state|data' },
      { name: 'Reasoning', expectedContent: 'reasoning|decision|confidence' },
      { name: 'Orchestration', expectedContent: 'orchestration|plan|agents' }
    ];
    
    for (const tab of tabs) {
      const tabElement = page.locator(`[role="tab"]:has-text("${tab.name}"), button:has-text("${tab.name}")`).first();
      if (await tabElement.isVisible()) {
        console.log(`\n📑 Navigating to ${tab.name} tab...`);
        await tabElement.click();
        await page.waitForTimeout(2000);
        
        // Check for expected content
        const tabPanel = page.locator('[role="tabpanel"], .tab-content').first();
        const panelText = await tabPanel.textContent().catch(() => '');
        
        const hasExpectedContent = new RegExp(tab.expectedContent, 'i').test(panelText);
        console.log(`   Content check: ${hasExpectedContent ? '✅' : '❌'} (looking for ${tab.expectedContent})`);
        
        if (panelText.length > 0) {
          console.log(`   Content preview: "${panelText.substring(0, 100)}..."`);
        }
        
        await takeScreenshot(page, `tab-${tab.name.toLowerCase()}`, `${tab.name} tab content`);
        
        // Special handling for Context tab - look for JSON viewer
        if (tab.name === 'Context') {
          const jsonElements = await page.locator('pre, code, [class*="json"], [class*="code"]').all();
          console.log(`   Found ${jsonElements.length} JSON/code blocks`);
          if (jsonElements.length > 0) {
            const jsonText = await jsonElements[0].textContent();
            console.log(`   JSON preview: ${jsonText.substring(0, 200)}...`);
          }
        }
        
        // Special handling for Reasoning tab
        if (tab.name === 'Reasoning') {
          const reasoningItems = await page.locator('[class*="reasoning"], [class*="decision"]').all();
          console.log(`   Found ${reasoningItems.length} reasoning elements`);
        }
      } else {
        console.log(`   ⚠️ ${tab.name} tab not visible`);
      }
    }

    // PHASE 5: Task Creation
    console.log('\n🔹 PHASE 5: Task Creation Feature');
    console.log('-'.repeat(40));
    
    const createButton = page.locator('button:has-text("Create Test Task"), button:has-text("Create Task")').first();
    if (await createButton.isVisible()) {
      console.log('🆕 Found Create Task button, clicking...');
      await createButton.click();
      await page.waitForTimeout(3000);
      
      // Check for success message or new task
      const successIndicator = await page.locator('text=/created|success|new task/i').isVisible();
      if (successIndicator) {
        console.log('   ✅ Task created successfully');
        await takeScreenshot(page, 'new-task-created', 'New task creation result');
        
        // Check if task selector updated
        const newOptions = await taskSelector.locator('option').allTextContents();
        if (newOptions.length > options.length) {
          console.log(`   📈 Task list grew from ${options.length} to ${newOptions.length} tasks`);
        }
      }
    } else {
      console.log('   ℹ️ Create Task button not available');
    }

    // PHASE 6: Agent Visualizer Check
    console.log('\n🔹 PHASE 6: Agent Visualizer and Flow Diagram');
    console.log('-'.repeat(40));
    
    // Go back to main tab
    const mainTab = page.locator('[role="tab"]:has-text("Agent Visualizer"), button:has-text("Agent Visualizer")').first();
    if (await mainTab.isVisible()) {
      await mainTab.click();
      await page.waitForTimeout(2000);
    }
    
    // Check for agent nodes
    const agentNodes = await page.locator('[class*="agent"], [class*="node"]').all();
    console.log(`🤖 Found ${agentNodes.length} agent nodes`);
    
    // Scroll to see execution flow
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const flowDiagram = await page.locator('[class*="flow"], [class*="execution"], svg').isVisible();
    if (flowDiagram) {
      console.log('   ✅ Execution flow diagram visible');
      await takeScreenshot(page, 'execution-flow-diagram', 'Task execution flow visualization');
    }

    // PHASE 7: Real-time Features
    console.log('\n🔹 PHASE 7: Real-time Features Check');
    console.log('-'.repeat(40));
    
    // Check for SSE indicator
    const sseIndicator = await page.locator('text=/live|real-time|connected/i').isVisible();
    console.log(`🔴 Real-time status: ${sseIndicator ? 'Connected' : 'Not visible'}`);
    
    // Check for live stream tab
    const liveStreamTab = page.locator('[role="tab"]:has-text("Live Stream"), button:has-text("Live Stream")').first();
    if (await liveStreamTab.isVisible()) {
      await liveStreamTab.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Live Stream tab available');
      await takeScreenshot(page, 'live-stream', 'Live stream functionality');
    }

    // PHASE 8: Performance Metrics
    console.log('\n🔹 PHASE 8: Performance Metrics');
    console.log('-'.repeat(40));
    
    const metrics = await page.locator('text=/duration|confidence|success rate/i').all();
    console.log(`📊 Found ${metrics.length} metric indicators`);
    
    for (let metric of metrics.slice(0, 5)) {
      const text = await metric.textContent();
      console.log(`   Metric: ${text}`);
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DEMO COMPLETE - Summary:');
    console.log(`   📸 Screenshots captured: ${screenshotCount}`);
    console.log(`   📁 Location: ${screenshotDir}`);
    console.log('='.repeat(60));
    
    // Keep browser open for manual inspection
    console.log('\n⏰ Browser will remain open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Error during demo:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('🚪 Browser closed');
  }
}

// Run the comprehensive demo
comprehensiveDevToolkitDemo().catch(console.error);