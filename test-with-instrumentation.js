const { chromium } = require('playwright');
const { waitForAppReady } = require('./helpers/waitForApp');

async function testWithInstrumentation() {
  console.log('🔍 Testing BizBuddy with Instrumentation\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Navigate to the app
  const url = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
  console.log(`Loading ${url}...`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for app to be ready using instrumentation
  const startTime = Date.now();
  const appState = await waitForAppReady(page);
  const loadTime = Date.now() - startTime;
  
  console.log(`\n⚡ App loaded in ${loadTime}ms!`);
  
  // Now check what's visible
  console.log('\n📋 Checking UI Elements:');
  const elements = {
    'Dashboard': await page.locator('text=Dashboard').isVisible().catch(() => false),
    'User email': await page.locator('text=gianmatteo.allyn.test@gmail.com').isVisible().catch(() => false),
    'Chat with Ally': await page.locator('text=Chat with Ally').isVisible().catch(() => false),
    'Onboarding card': await page.locator('[data-testid="onboarding-card"]').isVisible().catch(() => false),
    'Setting up experience': await page.locator('text=Setting up your experience').isVisible().catch(() => false)
  };
  
  for (const [element, visible] of Object.entries(elements)) {
    console.log(`  ${visible ? '✅' : '❌'} ${element}`);
  }
  
  // Check if onboarding is showing
  if (elements['Dashboard'] && !elements['Onboarding card']) {
    console.log('\n❌ Dashboard loaded but NO onboarding detected');
    console.log('💡 Possible reasons:');
    console.log('  - User has already completed onboarding');
    console.log('  - Onboarding check failed');
    console.log('  - Backend connection issue');
    
    // Check network for onboarding calls
    const onboardingRequests = [];
    page.on('request', request => {
      if (request.url().includes('onboarding')) {
        onboardingRequests.push({
          method: request.method(),
          url: request.url()
        });
      }
    });
    
    // Force a page reload to see if onboarding triggers
    console.log('\n🔄 Reloading page to check for onboarding...');
    await page.reload();
    await waitForAppReady(page);
    
    await page.waitForTimeout(3000);
    
    if (onboardingRequests.length > 0) {
      console.log('\n📡 Onboarding API calls detected:');
      onboardingRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
      });
    } else {
      console.log('\n⚠️  No onboarding API calls detected');
    }
  }
  
  // Take final screenshot
  await page.screenshot({ 
    path: 'instrumented-test.png',
    fullPage: true 
  });
  console.log('\n📸 Screenshot saved: instrumented-test.png');
  
  // Keep browser open for 10s to observe
  console.log('\n👀 Keeping browser open for observation...');
  await page.waitForTimeout(10000);
  
  await browser.close();
}

testWithInstrumentation().catch(console.error);