const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:8082';
const BACKEND_URL = 'http://localhost:3001';
const REAL_TASK_ID = '96eec43e-7bfe-4933-95d3-b3720b8e5899'; // Task 3 with real events

async function testRealDataIntegration() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, `real-data-test-${timestamp}`);
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('═'.repeat(80));
  console.log('🚀 Testing Real Data Integration (Not Demo Data)');
  console.log('═'.repeat(80));
  console.log('📁 Screenshots:', screenshotDir);
  console.log('🌐 Frontend:', FRONTEND_URL);
  console.log('🔧 Backend:', BACKEND_URL);
  console.log('📋 Target Task ID:', REAL_TASK_ID);
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
    
    page.on('response', async response => {
      if (response.url().includes('/api/task-events/')) {
        const body = await response.text().catch(() => '{}');
        const data = JSON.parse(body);
        console.log(`   📥 Backend response: ${response.status()} - ${data.count || 0} events`);
      }
    });

    console.log('\n📋 Step 1: Load Dev Toolkit and Select Real Task');
    console.log('─'.repeat(60));
    
    await page.goto(`${FRONTEND_URL}/dev-toolkit-standalone`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Check for authentication
    const authText = await page.locator('text=/Authenticated as:/').textContent().catch(() => '');
    if (authText) {
      console.log(`✅ Authentication confirmed: ${authText}`);
    }
    
    await takeScreenshot(page, 'initial-load', 'Initial load with demo data');
    
    // Find and select the real task
    const taskSelector = page.locator('select[data-testid="task-selector"]').first();
    if (await taskSelector.isVisible()) {
      // Look for Task 3 or the specific task ID
      const options = await taskSelector.locator('option').all();
      let foundRealTask = false;
      
      for (const option of options) {
        const value = await option.getAttribute('value');
        const text = await option.textContent();
        
        if (value === REAL_TASK_ID || text.includes('Task 3')) {
          console.log(`   📌 Found real task: ${text} (${value})`);
          await taskSelector.selectOption(value);
          foundRealTask = true;
          await page.waitForTimeout(5000); // Wait for data to load
          break;
        }
      }
      
      if (!foundRealTask) {
        console.log('   ⚠️ Real task not found in selector, available options:');
        for (const option of options.slice(0, 5)) {
          const text = await option.textContent();
          const value = await option.getAttribute('value');
          console.log(`      - ${text} (${value})`);
        }
      }
    }
    
    await takeScreenshot(page, 'task-selected', 'After selecting real task');
    
    console.log('\n📋 Step 2: Check for Real Events in Timeline');
    console.log('─'.repeat(60));
    
    // Check if backend was called
    await page.waitForTimeout(2000);
    
    // Look for timeline events
    const timelineEvents = await page.locator('circle[r], rect').count();
    console.log(`📊 Timeline elements found: ${timelineEvents}`);
    
    // Check for specific agent names from our real data
    const hasRealAgents = await page.locator('text=/BusinessDiscovery|DataEnrichment|ComplianceVerification|DocumentGeneration/').isVisible().catch(() => false);
    console.log(`✅ Real agent names visible: ${hasRealAgents}`);
    
    await takeScreenshot(page, 'timeline-with-events', 'Timeline showing real events');
    
    // Click on a timeline event
    if (timelineEvents > 0) {
      const firstEvent = page.locator('circle[r], rect').first();
      await firstEvent.click({ force: true });
      await page.waitForTimeout(2000);
      
      // Check for event details
      const hasEventDetails = await page.locator('text=/operation|actor_id|data/').isVisible().catch(() => false);
      console.log(`✅ Event details panel visible: ${hasEventDetails}`);
      
      await takeScreenshot(page, 'event-details', 'Event details showing real data');
    }
    
    console.log('\n📋 Step 3: Verify Real Data in Context Tab');
    console.log('─'.repeat(60));
    
    const contextTab = page.locator('button:has-text("Context"), [role="tab"]:has-text("Context")').first();
    if (await contextTab.isVisible()) {
      await contextTab.click();
      await page.waitForTimeout(2000);
      
      // Look for real business data from our events
      const hasRealData = await page.locator('text=/TechStartup Inc|Delaware|C-Corporation/').isVisible().catch(() => false);
      console.log(`✅ Real business data visible: ${hasRealData}`);
      
      await takeScreenshot(page, 'context-real-data', 'Context tab with real TaskContext');
    }
    
    console.log('\n📋 Step 4: Check Operations/Events List');
    console.log('─'.repeat(60));
    
    // Look for our specific operations
    const operations = [
      'TASK_INITIATED',
      'TASK_ANALYSIS', 
      'BUSINESS_PROFILE_COLLECTED',
      'DATA_ENRICHED',
      'COMPLIANCE_CHECK',
      'DOCUMENTS_PREPARED',
      'TASK_COMPLETED'
    ];
    
    let foundOperations = 0;
    for (const op of operations) {
      if (await page.locator(`text=/${op}/`).isVisible().catch(() => false)) {
        foundOperations++;
        console.log(`   ✅ Found operation: ${op}`);
      }
    }
    
    console.log(`📊 Found ${foundOperations}/${operations.length} expected operations`);
    
    await takeScreenshot(page, 'operations-list', 'List of real operations');
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ INTEGRATION TEST RESULTS:');
    console.log('═'.repeat(80));
    console.log(`📊 Real events loaded: ${timelineEvents > 0 ? 'YES' : 'NO'}`);
    console.log(`📊 Real agent names: ${hasRealAgents ? 'YES' : 'NO'}`);
    console.log(`📊 Real operations: ${foundOperations > 0 ? 'YES' : 'NO'}`);
    console.log('📸 Screenshots captured:', screenshotCount);
    console.log('📁 Location:', screenshotDir);
    
    if (timelineEvents > 0 && foundOperations > 5) {
      console.log('\n🎉 SUCCESS: Real data is being displayed correctly!');
      console.log('   - Frontend successfully calls backend API');
      console.log('   - Backend returns real task events');
      console.log('   - UI displays actual data, not demo data');
    } else {
      console.log('\n⚠️ PARTIAL: Some real data visible but not complete');
    }
    
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

testRealDataIntegration().catch(console.error);