const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testTaskCreationAndViewing() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, `test-task-workflow-${timestamp}`);
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Testing Task Creation and Viewing Workflow');
  console.log('📁 Screenshots:', screenshotDir);
  console.log('🌐 App URL:', BASE_URL);
  console.log('🔧 Backend URL:', BACKEND_URL);

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

    // Enable console logging for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Task') || text.includes('task') || text.includes('error')) {
        console.log('📝 Console:', text);
      }
    });

    // Step 1: Go to main dashboard
    console.log('\n📍 Step 1: Navigating to main dashboard...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-main-dashboard.png'),
      fullPage: true 
    });

    // Check if there are any tasks visible
    const taskCards = await page.locator('[data-testid="task-card"], .task-card, [class*="task"]').all();
    console.log(`📊 Found ${taskCards.length} task cards on dashboard`);

    // Step 2: Navigate to Dev Toolkit
    console.log('\n📍 Step 2: Opening Dev Toolkit...');
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-dev-toolkit-initial.png'),
      fullPage: true 
    });

    // Check what's in the task dropdown
    const taskDropdown = page.locator('select, [role="combobox"]').first();
    if (await taskDropdown.isVisible()) {
      console.log('📋 Found task selector dropdown');
      
      // Get all options
      const options = await taskDropdown.locator('option').allTextContents();
      console.log('Available tasks:', options);
      
      // Try to select a completed task
      const completedOption = await taskDropdown.locator('option:has-text("Complete"), option:has-text("completed")').first();
      if (await completedOption.count() > 0) {
        await taskDropdown.selectOption({ index: 1 }); // Select first non-default option
        await page.waitForTimeout(2000);
        console.log('✅ Selected a task from dropdown');
      }
    }

    // Step 3: Try Create Test Task button
    console.log('\n📍 Step 3: Looking for Create Task button...');
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Task")').first();
    if (await createButton.isVisible()) {
      console.log('✅ Found Create Task button, clicking...');
      await createButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '03-after-create-task.png'),
        fullPage: true 
      });
      
      // Check if task was created
      const successMessage = await page.locator('text=/created|success/i').isVisible();
      if (successMessage) {
        console.log('✅ Task created successfully');
      }
    } else {
      console.log('⚠️ No Create Task button visible');
    }

    // Step 4: Check timeline for events
    console.log('\n📍 Step 4: Checking timeline for events...');
    const timelineEvents = await page.locator('.timeline-event, circle[class*="event"], rect[class*="event"]').all();
    console.log(`📊 Found ${timelineEvents.length} timeline events`);
    
    if (timelineEvents.length > 0) {
      // Click on first event
      console.log('Clicking on first timeline event...');
      await timelineEvents[0].click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '04-timeline-event-clicked.png'),
        fullPage: true 
      });
      
      // Check if payload is visible
      const payloadVisible = await page.locator('text=/context|payload|data/i').isVisible();
      console.log(`Payload visible: ${payloadVisible}`);
    }

    // Step 5: Navigate through tabs
    console.log('\n📍 Step 5: Testing all tabs...');
    
    const tabs = ['Timeline', 'Context', 'Reasoning', 'Orchestration'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
      if (await tab.isVisible()) {
        console.log(`📑 Clicking ${tabName} tab...`);
        await tab.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: path.join(screenshotDir, `05-${tabName.toLowerCase()}-tab.png`),
          fullPage: true 
        });
        
        // Check for content in each tab
        const hasContent = await page.locator('.tab-content, [role="tabpanel"]').locator('text=/[a-zA-Z]+/').count() > 0;
        console.log(`${tabName} tab has content: ${hasContent}`);
      }
    }

    // Step 6: Try API to get tasks directly
    console.log('\n📍 Step 6: Fetching tasks from API...');
    const apiResponse = await page.evaluate(async (backendUrl) => {
      try {
        const token = JSON.parse(localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token') || '{}');
        const response = await fetch(`${backendUrl}/api/tasks`, {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          return await response.json();
        }
        return { error: response.statusText };
      } catch (error) {
        return { error: error.message };
      }
    }, BACKEND_URL);
    
    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    console.log('\n✅ Test workflow completed!');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('🚪 Browser closed');
  }
}

// Run the test
testTaskCreationAndViewing().catch(console.error);