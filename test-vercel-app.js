const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Test the actual Vercel deployment
 */
async function testVercelApp() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = `vercel-test-${timestamp}`;
  
  fs.mkdirSync(testDir, { recursive: true });
  
  console.log(`🚀 Testing Vercel Deployment: ${timestamp}`);
  console.log(`📁 Results will be saved to: ${testDir}/\n`);
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    // Start fresh, no saved auth
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const error = msg.text();
      console.log(`❌ Console Error: ${error}`);
      errors.push(error);
      fs.appendFileSync(path.join(testDir, 'errors.log'), error + '\n');
    }
  });
  
  // Capture network failures
  page.on('requestfailed', request => {
    const failure = `Failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
    console.log(`🔴 ${failure}`);
    fs.appendFileSync(path.join(testDir, 'network-failures.log'), failure + '\n');
  });
  
  try {
    // Go to Vercel deployment
    console.log('📍 Navigating to Vercel app...');
    await page.goto('https://bizbuddy-ally-eight.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(testDir, '01-initial-load.png'),
      fullPage: true 
    });
    
    // Check what's visible
    console.log('🔍 Analyzing page state...');
    
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasGoogleButton: !!document.querySelector('button:has-text("Sign in with Google")'),
        hasOnboarding: !!document.querySelector('[data-testid="onboarding"]'),
        hasDashboard: !!document.querySelector('[data-testid="dashboard"]'),
        hasError: !!document.querySelector('.error-message, [data-error]'),
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('📊 Page State:', JSON.stringify(pageState, null, 2));
    fs.writeFileSync(path.join(testDir, 'page-state.json'), JSON.stringify(pageState, null, 2));
    
    // Try to interact with auth
    if (pageState.hasGoogleButton) {
      console.log('🔐 Found Google Sign In button');
      
      // Try demo mode
      const demoButton = await page.locator('button:has-text("Try Demo")').first();
      if (await demoButton.isVisible()) {
        console.log('🎭 Clicking Demo Mode...');
        await demoButton.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: path.join(testDir, '02-demo-mode.png'),
          fullPage: true 
        });
        
        // Check dashboard
        const dashboardVisible = await page.locator('[data-testid="dashboard"]').isVisible();
        console.log(`📊 Dashboard visible: ${dashboardVisible ? '✅' : '❌'}`);
      }
    }
    
    // Check for specific UI elements
    const elements = {
      welcomeCard: await page.locator('text=/Welcome/i').count(),
      taskCards: await page.locator('[data-testid="task-card"]').count(),
      chatButton: await page.locator('button:has-text("Chat with Ally")').count(),
      devPanel: await page.locator('button:has-text("Dev Panel")').count()
    };
    
    console.log('🎯 UI Elements Found:', elements);
    fs.writeFileSync(path.join(testDir, 'ui-elements.json'), JSON.stringify(elements, null, 2));
    
    // Take final screenshot
    await page.screenshot({ 
      path: path.join(testDir, '03-final-state.png'),
      fullPage: true 
    });
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log(`  🌐 URL reached: ${pageState.url}`);
    console.log(`  📝 Title: ${pageState.title}`);
    console.log(`  ❌ Errors: ${errors.length}`);
    console.log(`  🎯 UI Elements: ${Object.values(elements).reduce((a, b) => a + b, 0)} found`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Console Errors Detected:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
    
  } catch (error) {
    console.error('💥 Test Failed:', error.message);
    await page.screenshot({ 
      path: path.join(testDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
    console.log(`\n✅ Test complete! Check ${testDir}/ for details`);
  }
}

// Run the test
testVercelApp().catch(console.error);