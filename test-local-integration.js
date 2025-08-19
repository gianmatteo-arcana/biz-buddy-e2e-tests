const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:8082';
const BACKEND_URL = 'http://localhost:3001';

async function testLocalIntegration() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, `local-test-${timestamp}`);
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('═'.repeat(80));
  console.log('🚀 Testing Local Frontend + Backend Integration');
  console.log('═'.repeat(80));
  console.log('📁 Screenshots:', screenshotDir);
  console.log('🌐 Frontend:', FRONTEND_URL);
  console.log('🔧 Backend:', BACKEND_URL);
  console.log('');

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
    // Use authenticated session
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    // Monitor console for important messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Backend API') || text.includes('task_context_events') || text.includes('Found') || text.includes('events')) {
        console.log('   🔍', text.substring(0, 200));
      }
      if (text.includes('error') || text.includes('Error')) {
        console.log('   ❌', text.substring(0, 200));
      }
    });
    
    // Monitor network for backend calls
    page.on('request', request => {
      if (request.url().includes('/api/task-events/')) {
        console.log('   🌐 Backend API call:', request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/task-events/')) {
        console.log('   📥 Backend response:', response.status());
      }
    });

    console.log('\n📋 Step 1: Load Dev Toolkit');
    console.log('─'.repeat(60));
    
    await page.goto(`${FRONTEND_URL}/dev-toolkit-standalone`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Allow time for data to load
    
    await takeScreenshot(page, 'dev-toolkit-loaded', 'Dev Toolkit with authenticated session');
    
    // Check for authentication
    const authText = await page.locator('text=/Authenticated as:/').textContent().catch(() => '');
    if (authText) {
      console.log(`✅ Authentication confirmed: ${authText}`);
    }
    
    // Check task selector
    const taskSelector = page.locator('select[data-testid="task-selector"]').first();
    if (await taskSelector.isVisible()) {
      const selectedTask = await taskSelector.locator('option:checked').textContent();
      console.log(`✅ Selected task: ${selectedTask}`);
    }
    
    console.log('\n📋 Step 2: Check Timeline Events');
    console.log('─'.repeat(60));
    
    // Look for timeline events
    const timelineSection = page.locator('text=/Timeline/').first();
    if (await timelineSection.isVisible()) {
      await timelineSection.click();
      await page.waitForTimeout(2000);
    }
    
    // Check for events in the timeline
    const hasEvents = await page.locator('circle, rect').filter({ 
      hasNot: page.locator('text=/Demo Mode/') 
    }).count() > 0;
    
    console.log(`📊 Timeline has events: ${hasEvents}`);
    
    await takeScreenshot(page, 'timeline-view', 'Timeline showing events');
    
    // Try clicking on an event
    const eventElements = await page.locator('circle[r], rect').all();
    if (eventElements.length > 0) {
      console.log(`   Found ${eventElements.length} timeline elements`);
      await eventElements[0].click({ force: true });
      await page.waitForTimeout(2000);
      
      await takeScreenshot(page, 'event-clicked', 'Event details after click');
    }
    
    console.log('\n📋 Step 3: Check Context Tab');
    console.log('─'.repeat(60));
    
    const contextTab = page.locator('button:has-text("Context"), [role="tab"]:has-text("Context")').first();
    if (await contextTab.isVisible()) {
      await contextTab.click();
      await page.waitForTimeout(2000);
      
      const hasJsonContent = await page.locator('pre, code').count() > 0;
      console.log(`✅ Context tab has JSON content: ${hasJsonContent}`);
      
      await takeScreenshot(page, 'context-tab', 'Context tab showing TaskContext');
    }
    
    console.log('\n📋 Step 4: Check Reasoning Tab');
    console.log('─'.repeat(60));
    
    const reasoningTab = page.locator('button:has-text("Reasoning"), [role="tab"]:has-text("Reasoning")').first();
    if (await reasoningTab.isVisible()) {
      await reasoningTab.click();
      await page.waitForTimeout(2000);
      
      await takeScreenshot(page, 'reasoning-tab', 'Reasoning tab content');
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ TEST RESULTS:');
    console.log('═'.repeat(80));
    console.log('📸 Screenshots captured:', screenshotCount);
    console.log('📁 Location:', screenshotDir);
    
    // Keep browser open for manual inspection
    console.log('\n⏰ Browser will remain open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('🚪 Browser closed');
  }
}

testLocalIntegration().catch(console.error);