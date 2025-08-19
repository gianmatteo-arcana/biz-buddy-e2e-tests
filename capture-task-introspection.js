const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function captureTaskIntrospection() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('🚀 Capturing Task Introspection Screenshots');
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
    await page.goto('http://localhost:8081');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Restore localStorage if needed
    if (authState.origins) {
      for (const origin of authState.origins) {
        if (origin.localStorage) {
          for (const item of origin.localStorage) {
            await page.evaluate((name, value) => {
              localStorage.setItem(name, value);
            }, item.name, item.value);
          }
        }
      }
    }
    
    // Create screenshot directory
    const screenshotDir = path.join(__dirname, 'screenshots', 'task-introspection');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    // Take initial screenshot
    console.log('\n2️⃣ Capturing main dashboard...');
    await page.screenshot({
      path: path.join(screenshotDir, '01-main-dashboard.png'),
      fullPage: false
    });
    
    // Open DevToolkit with keyboard shortcut
    console.log('\n3️⃣ Opening DevToolkit...');
    await page.keyboard.down('Meta');
    await page.keyboard.down('Shift');
    await page.keyboard.press('D');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Meta');
    
    // Wait for DevToolkit to open
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take DevToolkit screenshot
    console.log('\n4️⃣ Capturing DevToolkit overview...');
    await page.screenshot({
      path: path.join(screenshotDir, '02-devtoolkit-overview.png'),
      fullPage: false
    });
    
    // Try to interact with the DevToolkit
    console.log('\n5️⃣ Looking for task to click...');
    
    // Click on first task if available
    const clicked = await page.evaluate(() => {
      // Look for task rows
      const taskRows = document.querySelectorAll('tr[class*="hover"]');
      if (taskRows.length > 1) { // Skip header row
        taskRows[1].click();
        return true;
      }
      
      // Look for any clickable task element
      const taskElements = Array.from(document.querySelectorAll('*'));
      for (const el of taskElements) {
        if (el.textContent && el.textContent.includes('Complete Business Onboarding')) {
          el.click();
          return true;
        }
      }
      
      return false;
    });
    
    if (clicked) {
      console.log('✅ Clicked on task');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take timeline screenshot
      console.log('\n6️⃣ Capturing task timeline...');
      await page.screenshot({
        path: path.join(screenshotDir, '03-task-timeline.png'),
        fullPage: false
      });
    } else {
      console.log('⚠️ No task found to click');
    }
    
    // Take full page screenshot
    console.log('\n7️⃣ Capturing full page...');
    await page.screenshot({
      path: path.join(screenshotDir, '04-full-page.png'),
      fullPage: true
    });
    
    // Check what's visible
    const pageContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasDevToolkit: text.includes('DevToolkit') || text.includes('Dev Toolkit'),
        hasAuthenticated: text.includes('Authenticated'),
        hasTasks: text.includes('Tasks') || text.includes('Complete Business'),
        hasTimeline: text.includes('Timeline') || text.includes('Event'),
        hasAgents: text.includes('Agent'),
        text: text.substring(0, 500)
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('   • DevToolkit visible:', pageContent.hasDevToolkit);
    console.log('   • Shows authenticated:', pageContent.hasAuthenticated);
    console.log('   • Has tasks:', pageContent.hasTasks);
    console.log('   • Has timeline:', pageContent.hasTimeline);
    console.log('   • Has agent mentions:', pageContent.hasAgents);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SCREENSHOTS CAPTURED!');
    console.log('='.repeat(60));
    console.log('\n📸 Screenshots saved to:', screenshotDir);
    console.log('\nFiles created:');
    const files = await fs.readdir(screenshotDir);
    files.forEach(file => console.log('  •', file));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Take error screenshot
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'task-introspection', 'error.png')
    });
  } finally {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Keep open to view
    await browser.close();
  }
}

captureTaskIntrospection().catch(console.error);