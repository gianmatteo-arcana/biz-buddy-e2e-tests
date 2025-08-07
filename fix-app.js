const { chromium } = require('playwright');
const fs = require('fs');

async function fixApp() {
  console.log('🔧 Starting app repair process...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const page = await browser.newPage();
  
  // Track all errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const error = msg.text();
      console.log(`❌ Console Error: ${error}`);
      errors.push(error);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`💥 Page Error: ${error.message}`);
    errors.push(error.message);
  });
  
  console.log('📍 Step 1: Testing local dev server...');
  try {
    await page.goto('http://localhost:8080', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    
    await page.waitForTimeout(3000);
    
    // Check if app loaded
    const appState = await page.evaluate(() => {
      return {
        hasOnboarding: !!document.querySelector('[data-testid="onboarding-flow"]'),
        hasGoogleButton: !!document.querySelector('button:has-text("Sign in with Google")'),
        hasDemoButton: !!document.querySelector('button:has-text("Try Demo")'),
        hasDashboard: !!document.querySelector('[data-testid="dashboard"]'),
        hasLoadingSpinner: !!document.querySelector('.animate-spin'),
        bodyText: document.body.innerText.substring(0, 300)
      };
    });
    
    console.log('📊 App State:', JSON.stringify(appState, null, 2));
    
    // If we see onboarding, try demo mode
    if (appState.hasDemoButton) {
      console.log('🎭 Clicking Demo Mode...');
      await page.click('button:has-text("Try Demo")');
      await page.waitForTimeout(3000);
      
      const dashboardState = await page.evaluate(() => {
        return {
          hasDashboard: !!document.querySelector('[data-testid="dashboard"]'),
          hasWelcomeCard: document.body.textContent.includes('Welcome'),
          hasTaskCards: document.querySelectorAll('[data-testid="task-card"]').length,
          hasChatButton: !!document.querySelector('button:has-text("Chat with Ally")')
        };
      });
      
      console.log('📊 Dashboard State:', dashboardState);
      
      if (dashboardState.hasChatButton) {
        console.log('✅ App is working in demo mode!');
      }
    }
    
    // If stuck on loading, diagnose
    if (appState.hasLoadingSpinner && !appState.hasOnboarding) {
      console.log('⏳ App stuck on loading spinner...');
      
      // Check network requests
      const pendingRequests = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(r => r.responseEnd === 0)
          .map(r => r.name);
      });
      
      if (pendingRequests.length > 0) {
        console.log('🔴 Pending requests:', pendingRequests);
      }
    }
    
    await page.screenshot({ path: 'app-state.png', fullPage: true });
    console.log('📸 Screenshot saved as app-state.png');
    
  } catch (_error) {
    console.error('💥 Test failed:', error.message);
  }
  
  // Analyze errors and suggest fixes
  console.log('\n📋 Analysis:');
  if (errors.length > 0) {
    console.log(`Found ${errors.length} errors:`);
    
    // Check for common issues
    if (errors.some(e => e.includes('WebSocket'))) {
      console.log('  ⚠️  WebSocket connection issues - orchestration server not running');
    }
    if (errors.some(e => e.includes('supabase'))) {
      console.log('  ⚠️  Supabase connection issues - check environment variables');
    }
    if (errors.some(e => e.includes('TypeError'))) {
      console.log('  ⚠️  JavaScript errors - component issues');
    }
  } else {
    console.log('✅ No console errors detected');
  }
  
  await browser.close();
  console.log('\n✨ Repair check complete!');
}

fixApp().catch(console.error);