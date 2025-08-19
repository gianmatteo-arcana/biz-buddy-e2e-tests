const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testTaskIntrospection() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('🚀 Starting Task Introspection E2E Test');
  console.log('=' .repeat(60));
  
  try {
    // Load saved auth state
    const authPath = path.join(__dirname, '.auth/user-state.json');
    const authState = JSON.parse(await fs.readFile(authPath, 'utf8'));
    
    // Restore cookies
    if (authState.cookies) {
      await page.setCookie(...authState.cookies);
    }
    
    // Navigate to app
    console.log('\n1️⃣ Navigating to app...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
    
    // Wait for auth to be recognized
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      const token = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      return !!token;
    });
    
    if (!isAuthenticated && authState.origins) {
      console.log('Restoring localStorage...');
      for (const origin of authState.origins) {
        if (origin.localStorage) {
          for (const item of origin.localStorage) {
            await page.evaluate((name, value) => {
              localStorage.setItem(name, value);
            }, item.name, item.value);
          }
        }
      }
      await page.reload({ waitUntil: 'networkidle0' });
    }
    
    console.log('✅ Authentication restored');
    
    // Navigate to DevToolkit
    console.log('\n2️⃣ Opening DevToolkit...');
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.down('Meta');
    await page.keyboard.press('Shift');
    await page.keyboard.press('D');
    await page.keyboard.up('Meta');
    
    // Wait for DevToolkit to open
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot of DevToolkit with tasks list
    console.log('\n3️⃣ Capturing DevToolkit overview...');
    const screenshotDir = path.join(__dirname, 'screenshots', 'task-introspection');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    await page.screenshot({
      path: path.join(screenshotDir, '01-devtoolkit-overview.png'),
      fullPage: false
    });
    console.log('✅ Captured DevToolkit overview');
    
    // Click on the first task to see introspection
    console.log('\n4️⃣ Clicking on task to view introspection...');
    const taskClicked = await page.evaluate(() => {
      const taskElements = document.querySelectorAll('[data-task-id], .task-item, .cursor-pointer');
      if (taskElements.length > 0) {
        const firstTask = taskElements[0];
        firstTask.click();
        return true;
      }
      
      // Try finding by text content
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        if (el.textContent && el.textContent.includes('TechVenture Solutions')) {
          el.click();
          return true;
        }
      }
      return false;
    });
    
    if (!taskClicked) {
      console.log('⚠️ Could not find task to click, looking for alternative selectors...');
      
      // Try Tab navigation to select a task
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
    }
    
    // Wait for timeline to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of task timeline
    console.log('\n5️⃣ Capturing Task Timeline...');
    await page.screenshot({
      path: path.join(screenshotDir, '02-task-timeline.png'),
      fullPage: false
    });
    console.log('✅ Captured task timeline');
    
    // Scroll to see more events if available
    await page.evaluate(() => {
      const timelineContainer = document.querySelector('.overflow-y-auto, .timeline-container, [class*="timeline"]');
      if (timelineContainer) {
        timelineContainer.scrollTop = timelineContainer.scrollHeight / 2;
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot of scrolled timeline
    console.log('\n6️⃣ Capturing scrolled timeline...');
    await page.screenshot({
      path: path.join(screenshotDir, '03-timeline-scrolled.png'),
      fullPage: false
    });
    console.log('✅ Captured scrolled timeline');
    
    // Look for specific agent events
    const eventsFound = await page.evaluate(() => {
      const events = [];
      const eventElements = document.querySelectorAll('[class*="event"], [class*="timeline-item"], .text-xs');
      
      eventElements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('Agent') || text.includes('INITIATED') || text.includes('COMPLETE')) {
          events.push(text.trim());
        }
      });
      
      return events;
    });
    
    console.log('\n📊 Events found in timeline:');
    eventsFound.slice(0, 10).forEach(event => {
      console.log('   •', event.substring(0, 80));
    });
    
    // Check if real data is being displayed
    const hasRealData = await page.evaluate(() => {
      const pageText = document.body.innerText;
      return {
        hasAgents: pageText.includes('Agent'),
        hasEvents: pageText.includes('EVENT') || pageText.includes('INITIATED'),
        hasTechVenture: pageText.includes('TechVenture'),
        hasTimeline: pageText.includes('Timeline') || pageText.includes('timeline'),
        hasTaskId: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(pageText)
      };
    });
    
    console.log('\n✅ Data Validation:');
    console.log('   • Has Agent mentions:', hasRealData.hasAgents);
    console.log('   • Has Events:', hasRealData.hasEvents);
    console.log('   • Has TechVenture task:', hasRealData.hasTechVenture);
    console.log('   • Has Timeline:', hasRealData.hasTimeline);
    console.log('   • Has Task UUID:', hasRealData.hasTaskId);
    
    // Take final full-page screenshot
    console.log('\n7️⃣ Capturing full DevToolkit view...');
    await page.screenshot({
      path: path.join(screenshotDir, '04-devtoolkit-full.png'),
      fullPage: true
    });
    console.log('✅ Captured full view');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TASK INTROSPECTION TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📸 Screenshots saved to:', screenshotDir);
    console.log('\nScreenshots captured:');
    console.log('  1. DevToolkit Overview');
    console.log('  2. Task Timeline View');
    console.log('  3. Timeline Scrolled');
    console.log('  4. Full DevToolkit View');
    
    if (hasRealData.hasAgents && hasRealData.hasEvents) {
      console.log('\n✅ SUCCESS: Real task event data is being displayed!');
    } else {
      console.log('\n⚠️ WARNING: May be showing mock data. Check screenshots.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take error screenshot
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'task-introspection', 'error.png')
    });
  } finally {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Keep browser open to see results
    await browser.close();
  }
}

testTaskIntrospection().catch(console.error);