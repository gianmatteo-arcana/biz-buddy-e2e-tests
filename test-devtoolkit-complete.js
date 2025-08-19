const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testDevToolkitComplete() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, `test-devtoolkit-complete-${timestamp}`);
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Testing Dev Toolkit Complete Flow');
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

    // Navigate to Dev Toolkit
    console.log('\n📍 Step 1: Dev Toolkit Initial View...');
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-dev-toolkit-authenticated.png'),
      fullPage: true 
    });

    // Click on the task to view details
    console.log('\n📍 Step 2: Task Details View...');
    const taskCard = page.locator('.cursor-pointer').first();
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-task-details-view.png'),
      fullPage: true 
    });

    // Navigate to main dashboard
    console.log('\n📍 Step 3: Main Dashboard...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-main-dashboard.png'),
      fullPage: true 
    });

    // Go back to Dev Toolkit and try different tabs
    console.log('\n📍 Step 4: Dev Toolkit Timeline Tab...');
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Click Timeline tab if available
    const timelineTab = page.locator('[role="tab"]:has-text("Timeline")');
    if (await timelineTab.isVisible()) {
      await timelineTab.click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '04-timeline-tab.png'),
      fullPage: true 
    });

    // Try Context tab
    console.log('\n📍 Step 5: Dev Toolkit Context Tab...');
    const contextTab = page.locator('[role="tab"]:has-text("Context")');
    if (await contextTab.isVisible()) {
      await contextTab.click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-context-tab.png'),
      fullPage: true 
    });

    console.log('\n✅ Test completed successfully!');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    
    // Keep browser open briefly
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
testDevToolkitComplete().catch(console.error);