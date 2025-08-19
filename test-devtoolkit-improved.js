const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testDevToolkitImproved() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, `devtoolkit-demo-${timestamp}`);
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Dev Toolkit Task Introspection Demo');
  console.log('📁 Screenshots:', screenshotDir);

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    // Go directly to Dev Toolkit
    console.log('\n📍 Loading Dev Toolkit with authenticated session...');
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Give it time to load tasks
    
    // Screenshot 1: Initial view showing task list
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-devtoolkit-authenticated.png'),
      fullPage: true 
    });
    console.log('✅ Captured authenticated Dev Toolkit view');

    // Check for the task dropdown/selector
    const taskSelector = page.locator('select').first();
    if (await taskSelector.isVisible()) {
      // Get available tasks
      const options = await taskSelector.locator('option').allTextContents();
      console.log(`📋 Available tasks: ${options.length} options`);
      options.forEach((opt, idx) => console.log(`  ${idx}: ${opt}`));
      
      // Select a completed task if available
      if (options.length > 1) {
        // Try to find a completed task
        for (let i = 1; i < options.length; i++) {
          if (options[i].includes('Complete') || options[i].includes('completed')) {
            await taskSelector.selectOption({ index: i });
            console.log(`✅ Selected task: ${options[i]}`);
            await page.waitForTimeout(3000);
            break;
          }
        }
      }
    }

    // Screenshot 2: Task selected with timeline
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-task-timeline-view.png'),
      fullPage: true 
    });

    // Click on a timeline event if visible
    console.log('\n📍 Clicking timeline events to show payloads...');
    const timelineEvents = await page.locator('circle[r], rect[width]').filter({ 
      has: page.locator('..').filter({ hasText: /User|Orchestrator|Data|Compliance|System/ })
    }).all();
    
    if (timelineEvents.length > 0) {
      console.log(`Found ${timelineEvents.length} timeline events`);
      
      // Click first event
      await timelineEvents[0].click({ force: true });
      await page.waitForTimeout(2000);
      
      // Screenshot 3: Event clicked with payload
      await page.screenshot({ 
        path: path.join(screenshotDir, '03-event-payload-shown.png'),
        fullPage: true 
      });
      console.log('✅ Captured event payload view');
      
      // Try clicking another event
      if (timelineEvents.length > 1) {
        await timelineEvents[Math.min(2, timelineEvents.length - 1)].click({ force: true });
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: path.join(screenshotDir, '04-different-event-payload.png'),
          fullPage: true 
        });
      }
    }

    // Navigate through tabs
    console.log('\n📍 Testing all introspection tabs...');
    
    // Context Tab
    const contextTab = page.locator('[role="tab"]:has-text("Context"), button:has-text("Context")').first();
    if (await contextTab.isVisible()) {
      await contextTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: path.join(screenshotDir, '05-context-tab.png'),
        fullPage: true 
      });
      console.log('✅ Captured Context tab');
    }

    // Reasoning Tab
    const reasoningTab = page.locator('[role="tab"]:has-text("Reasoning"), button:has-text("Reasoning")').first();
    if (await reasoningTab.isVisible()) {
      await reasoningTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: path.join(screenshotDir, '06-reasoning-tab.png'),
        fullPage: true 
      });
      console.log('✅ Captured Reasoning tab');
    }

    // Orchestration Tab
    const orchestrationTab = page.locator('[role="tab"]:has-text("Orchestration"), button:has-text("Orchestration")').first();
    if (await orchestrationTab.isVisible()) {
      await orchestrationTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: path.join(screenshotDir, '07-orchestration-tab.png'),
        fullPage: true 
      });
      console.log('✅ Captured Orchestration tab');
    }

    // Go back to Timeline tab and try to scroll to see execution flow
    const timelineTab = page.locator('[role="tab"]:has-text("Timeline"), button:has-text("Timeline")').first();
    if (await timelineTab.isVisible()) {
      await timelineTab.click();
      await page.waitForTimeout(2000);
      
      // Scroll to bottom to show execution flow diagram
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '08-execution-flow.png'),
        fullPage: false 
      });
      console.log('✅ Captured execution flow diagram');
    }

    // Try Create Test Task button if visible
    const createButton = page.locator('button:has-text("Create Test Task")').first();
    if (await createButton.isVisible()) {
      console.log('\n📍 Creating a new test task...');
      await createButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '09-new-task-created.png'),
        fullPage: true 
      });
      console.log('✅ Created new task');
    }

    console.log('\n🎉 Demo complete! Check screenshots in:', screenshotDir);
    
    // Keep browser open for inspection
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testDevToolkitImproved().catch(console.error);