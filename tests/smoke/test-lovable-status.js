const { chromium } = require('playwright');

async function testLovableStatus() {
  console.log('🔍 Testing Lovable Deployment Status\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Log console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Log network failures
    page.on('requestfailed', request => {
      console.log('❌ Request Failed:', request.url(), request.failure().errorText);
    });
    
    console.log('1. Navigating to Lovable deployment...');
    const startTime = Date.now();
    
    try {
      await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`   ✅ Page loaded in ${loadTime}ms`);
      
      // Check if app is actually rendered
      await page.waitForTimeout(2000); // Give React time to render
      
      // Check for common error indicators
      const bodyText = await page.textContent('body');
      
      if (bodyText.includes('SmallBizAlly') || bodyText.includes('Welcome')) {
        console.log('   ✅ App appears to be loading correctly');
      } else if (bodyText.trim() === '') {
        console.log('   ❌ Page is blank - app not rendering');
      } else {
        console.log('   ⚠️  Unexpected content:', bodyText.substring(0, 100));
      }
      
      // Check for TypeScript/build errors in console
      const errors = await page.evaluate(() => {
        return window.__BUILD_ERRORS__ || null;
      });
      
      if (errors) {
        console.log('   ❌ Build errors detected:', errors);
      }
      
      // Take screenshot
      await page.screenshot({ path: 'lovable-status.png' });
      console.log('   📸 Screenshot saved: lovable-status.png');
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.log(`   ❌ Failed to load after ${loadTime}ms`);
      console.log('   Error:', error.message);
      
      // Take error screenshot
      await page.screenshot({ path: 'lovable-error.png' });
    }
    
    // Check JavaScript execution
    console.log('\n2. Checking JavaScript execution...');
    try {
      const jsWorks = await page.evaluate(() => {
        return typeof React !== 'undefined';
      });
      
      if (jsWorks) {
        console.log('   ✅ React is loaded');
      } else {
        console.log('   ❌ React not found - bundle may have failed');
      }
    } catch (error) {
      console.log('   ❌ JavaScript execution failed:', error.message);
    }
    
    // Check for common build issues
    console.log('\n3. Checking for common issues...');
    
    const html = await page.content();
    if (html.includes('TypeError') || html.includes('SyntaxError')) {
      console.log('   ❌ JavaScript errors in page');
    }
    
    if (html.includes('Loading...') && !html.includes('SmallBizAlly')) {
      console.log('   ⚠️  Stuck on loading screen');
    }
    
    // Performance metrics
    console.log('\n4. Performance Metrics:');
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        domInteractive: perf.domInteractive - perf.fetchStart
      };
    });
    
    console.log('   DOM Content Loaded:', metrics.domContentLoaded + 'ms');
    console.log('   Load Complete:', metrics.loadComplete + 'ms');
    console.log('   DOM Interactive:', metrics.domInteractive + 'ms');
    
    if (metrics.domInteractive > 5000) {
      console.log('   ⚠️  Very slow initial load - build may be too large');
    }
    
  } finally {
    await browser.close();
    
    console.log('\n📊 Summary:');
    console.log('Check the screenshots to see what users are experiencing.');
    console.log('If the page is blank or stuck on loading, there may be:');
    console.log('- TypeScript compilation errors not caught locally');
    console.log('- Module resolution issues in production');
    console.log('- Bundle size too large causing timeouts');
  }
}

testLovableStatus().catch(console.error);