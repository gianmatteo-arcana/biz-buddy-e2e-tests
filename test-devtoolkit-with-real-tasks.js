const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:8085';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testDevToolkitWithRealTasks() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, `test-devtoolkit-real-${timestamp}`);
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Testing Dev Toolkit with Real Tasks');
  console.log('📁 Screenshots:', screenshotDir);
  console.log('🌐 App URL:', BASE_URL);
  console.log('🔧 Backend URL:', BACKEND_URL);

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });

  try {
    // Load existing authentication
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Dev Toolkit') || text.includes('Task') || text.includes('authenticated')) {
        console.log('📝 Browser log:', text);
      }
    });

    // Navigate to Dev Toolkit
    console.log('\n📍 Step 1: Navigating to Dev Toolkit...');
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check authentication status
    const isAuthenticated = await page.locator('[data-testid="auth-status-badge"]').isVisible().catch(() => false);
    console.log(`🔐 Authentication: ${isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);

    await page.screenshot({ 
      path: path.join(screenshotDir, '01-dev-toolkit-initial.png'),
      fullPage: true 
    });

    // Create a new task
    console.log('\n📍 Step 2: Creating a new task...');
    const createButton = page.locator('button:has-text("Create Test Task")');
    if (await createButton.isVisible()) {
      await createButton.click();
      console.log('✅ Clicked Create Test Task button');
      
      // Wait for task creation
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '02-after-task-creation.png'),
        fullPage: true 
      });

      // Check if task was created
      const taskCards = await page.locator('[data-testid="task-card"]').count();
      console.log(`📊 Tasks found: ${taskCards}`);
    } else {
      console.log('⚠️ Create Test Task button not found');
    }

    // Navigate to main dashboard
    console.log('\n📍 Step 3: Checking main dashboard...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: path.join(screenshotDir, '03-main-dashboard.png'),
      fullPage: true 
    });

    // Check for tasks in dashboard
    const dashboardTasks = await page.locator('[data-testid="task-card"], .task-card, [class*="task"]').count();
    console.log(`📊 Dashboard tasks: ${dashboardTasks}`);

    // Go back to Dev Toolkit with a specific task if available
    console.log('\n📍 Step 4: Viewing tasks in Dev Toolkit...');
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for task timeline or agent visualizer
    const hasTimeline = await page.locator('[data-testid="task-timeline"], .timeline-container').isVisible().catch(() => false);
    const hasAgentViz = await page.locator('[data-testid="agent-visualizer"], .agent-visualizer').isVisible().catch(() => false);
    
    console.log(`📈 Timeline visible: ${hasTimeline ? '✅' : '❌'}`);
    console.log(`🤖 Agent Visualizer visible: ${hasAgentViz ? '✅' : '❌'}`);

    await page.screenshot({ 
      path: path.join(screenshotDir, '04-dev-toolkit-final.png'),
      fullPage: true 
    });

    // Try to load a specific task if we have one
    const taskLinks = await page.locator('a[href*="/dev-toolkit"], button:has-text("View Task")').all();
    if (taskLinks.length > 0) {
      console.log(`\n📍 Step 5: Opening specific task (${taskLinks.length} available)...`);
      await taskLinks[0].click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '05-specific-task-view.png'),
        fullPage: true 
      });
    }

    console.log('\n✅ Test completed successfully!');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    
    // Keep browser open for manual inspection
    console.log('\n⏰ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('🚪 Browser closed');
  }
}

// Run the test
testDevToolkitWithRealTasks().catch(console.error);