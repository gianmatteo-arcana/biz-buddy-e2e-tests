const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Test if onboarding triggers for a new user
 */
async function testOnboardingTrigger() {
  console.log('🧪 Testing Onboarding Trigger\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error(`[Page Error] ${error.message}`);
  });
  
  try {
    console.log('📍 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for app to load
    await page.waitForTimeout(5000);
    
    // Check current state
    const state = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasAuth: !!localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token'),
        visibleElements: {
          dashboard: document.body.textContent?.includes('Dashboard'),
          onboardingCard: !!document.querySelector('[data-testid="onboarding-card"]'),
          welcome: document.body.textContent?.includes('Welcome'),
          settingUp: document.body.textContent?.includes('Setting up your experience'),
          errorToast: !!document.querySelector('[data-testid="toast"]')
        }
      };
    });
    
    console.log('\n📊 Current State:');
    console.log(JSON.stringify(state, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'onboarding-trigger-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: onboarding-trigger-test.png');
    
    // Check for errors in console
    const errors = await page.evaluate(() => {
      return window.__errors || [];
    });
    
    if (errors.length > 0) {
      console.log('\n❌ Errors detected:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    // Check network for failed requests
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    await page.waitForTimeout(2000);
    
    if (failedRequests.length > 0) {
      console.log('\n❌ Failed network requests:');
      failedRequests.forEach(req => console.log(`  - ${req.url}: ${req.failure}`));
    }
    
    // Check if OnboardingCard is rendered
    const hasOnboardingCard = await page.evaluate(() => {
      const card = document.querySelector('.fixed.inset-0.z-50');
      return !!card && card.textContent?.includes('Setting up');
    });
    
    console.log(`\n🎯 OnboardingCard visible: ${hasOnboardingCard ? '✅' : '❌'}`);
    
    // Check localStorage for any error data
    const errorData = await page.evaluate(() => {
      const errors = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('error')) {
          errors.push({ key, value: localStorage.getItem(key) });
        }
      }
      return errors;
    });
    
    if (errorData.length > 0) {
      console.log('\n⚠️  Error data in localStorage:');
      errorData.forEach(err => console.log(`  - ${err.key}: ${err.value}`));
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await page.screenshot({ path: 'onboarding-error.png' });
  } finally {
    await browser.close();
  }
}

// Add error tracking to window
const setupErrorTracking = `
  window.__errors = [];
  window.addEventListener('error', (e) => {
    window.__errors.push(e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    window.__errors.push(e.reason?.message || e.reason);
  });
`;

testOnboardingTrigger().catch(console.error);