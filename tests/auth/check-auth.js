const { chromium } = require('playwright');

async function checkAuth() {
  console.log('🔍 Checking auth state...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('AUTH') || text.includes('Session') || text.includes('Setting loading')) {
      console.log(`📝 ${text}`);
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
    
    // Wait and check what happens
    await page.waitForTimeout(6000); // Wait past the 5s failsafe
    
    // Check instrumentation values
    const state = await page.evaluate(() => {
      return {
        loading: document.querySelector('.animate-spin') !== null,
        hasOnboarding: document.body.textContent.includes('Sign in'),
        hasDashboard: document.body.textContent.includes('Dashboard'),
        hasWelcome: document.body.textContent.includes('Welcome'),
        testInstrumentation: window.testInstrumentation || {},
        bodyText: document.body.innerText.substring(0, 200)
      };
    });
    
    console.log('\n📊 Final State:', JSON.stringify(state, null, 2));
    
    // Check if we hit failsafe
    const failsafeLogs = logs.filter(l => l.includes('Failsafe'));
    if (failsafeLogs.length > 0) {
      console.log('\n⚠️  Hit failsafe timeout:', failsafeLogs);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'auth-check.png', fullPage: true });
    console.log('📸 Screenshot saved as auth-check.png');
    
  } catch (_error) {
    console.error('💥 Failed:', error.message);
  } finally {
    await browser.close();
  }
}

checkAuth().catch(console.error);