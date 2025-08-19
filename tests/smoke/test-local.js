const { chromium } = require('playwright');

async function testLocal() {
  console.log('🔍 Testing local dev server...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const page = await browser.newPage();
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`💥 Page Error: ${error.message}`);
  });
  
  try {
    console.log('📍 Navigating to localhost:8080...');
    await page.goto('http://localhost:8080', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    await page.waitForTimeout(2000);
    
    // Check what loaded
    const state = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasReactRoot: !!document.getElementById('root'),
        rootContent: document.getElementById('root')?.innerHTML?.substring(0, 200),
        bodyClasses: document.body.className,
        errors: Array.from(document.querySelectorAll('.error')).map(e => e.textContent)
      };
    });
    
    console.log('📊 Page State:', JSON.stringify(state, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'local-test.png', fullPage: true });
    console.log('📸 Screenshot saved as local-test.png');
    
    // Check for app components
    const hasApp = await page.evaluate(() => {
      return {
        hasOnboarding: document.body.textContent.includes('Sign in'),
        hasDashboard: document.body.textContent.includes('Dashboard'),
        hasWelcome: document.body.textContent.includes('Welcome')
      };
    });
    
    console.log('🎯 App Components:', hasApp);
    
  } catch (_error) {
    console.error('💥 Failed:', error.message);
    await page.screenshot({ path: 'error-state.png' });
  } finally {
    await browser.close();
  }
}

testLocal().catch(console.error);