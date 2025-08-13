const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Autonomous test runner that captures detailed diagnostics
 * Now includes build verification before running tests!
 */
async function runAutonomousTest() {
  // CRITICAL: Verify builds before testing
  console.log('🔍 Pre-flight Build Verification\n');
  try {
    const { verifyBuilds } = require('./verify-build-before-test');
    await verifyBuilds();
    console.log('Build verification passed, proceeding with E2E tests...\n');
  } catch (error) {
    console.error('❌ Build verification failed!');
    console.error('E2E tests cannot run with build errors.');
    console.error('Fix the issues above and try again.\n');
    process.exit(1);
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = `test-run-${timestamp}`;
  
  // Create test directory for this run
  fs.mkdirSync(testDir, { recursive: true });
  
  console.log(`🤖 Autonomous Test Run: ${timestamp}`);
  console.log(`📁 Results will be saved to: ${testDir}/\n`);
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    // Capture console logs
    logger: {
      isEnabled: () => true,
      log: (name, severity, message, args) => {
        const log = `[${severity}] ${message}`;
        fs.appendFileSync(path.join(testDir, 'console.log'), log + '\n');
      }
    }
  });
  
  const page = await context.newPage();
  
  // Capture network requests
  const networkLog = [];
  page.on('request', request => {
    networkLog.push({
      time: new Date().toISOString(),
      method: request.method(),
      url: request.url(),
      type: request.resourceType()
    });
  });
  
  page.on('response', response => {
    const req = networkLog.find(r => r.url === response.url());
    if (req) {
      req.status = response.status();
      req.statusText = response.statusText();
    }
  });
  
  // Capture console messages
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}\n`;
    fs.appendFileSync(path.join(testDir, 'browser-console.log'), logEntry);
  });
  
  try {
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.screenshot({ path: path.join(testDir, '01-initial-load.png'), fullPage: true });
    
    // Wait for app to stabilize
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(testDir, '02-after-5s.png'), fullPage: true });
    
    // Check current state
    console.log('\n🔍 Analyzing current state...');
    
    const state = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        // Check for auth - using the correct Supabase instance key
        hasAuth: !!localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token'),
        // Check for various UI elements
        elements: {
          dashboard: document.body.textContent?.includes('Dashboard'),
          welcome: document.body.textContent?.includes('Welcome'),
          onboardingCard: !!document.querySelector('[data-testid="onboarding-card"]'),
          loadingSpinner: !!document.querySelector('.animate-spin'),
          chatButton: document.body.textContent?.includes('Chat with Ally')
        },
        // Get any visible text
        visibleText: Array.from(document.querySelectorAll('h1, h2, h3, p'))
          .slice(0, 10)
          .map(el => el.textContent?.trim())
          .filter(Boolean)
      };
    });
    
    console.log('State:', JSON.stringify(state, null, 2));
    fs.writeFileSync(path.join(testDir, 'state.json'), JSON.stringify(state, null, 2));
    
    // Check for onboarding
    console.log('\n🎯 Checking for onboarding...');
    
    const hasOnboarding = await page.evaluate(() => {
      // Look for any onboarding indicators
      // Check for onboarding card
      if (document.querySelector('[data-testid="onboarding-card"]')) return true;
      
      // Check for onboarding classes
      if (document.querySelector('[class*="onboarding"]')) return true;
      
      // Check for onboarding text
      const texts = [
        'Welcome to SmallBizAlly',
        'Let\'s get started',
        'Tell us about your business',
        'Setting up your experience'
      ];
      
      return texts.some(text => document.body.textContent?.includes(text));
    });
    
    console.log(`Onboarding visible: ${hasOnboarding ? '✅' : '❌'}`);
    
    if (!hasOnboarding) {
      console.log('\n🔄 Attempting to trigger onboarding...');
      
      // Try refreshing the page
      await page.reload();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(testDir, '03-after-reload.png'), fullPage: true });
      
      // Check backend calls
      const onboardingCalls = networkLog.filter(req => 
        req.url.includes('onboarding') || 
        req.url.includes('task') ||
        req.url.includes('edge-function')
      );
      
      console.log(`\n📡 Backend calls related to onboarding: ${onboardingCalls.length}`);
      if (onboardingCalls.length > 0) {
        onboardingCalls.forEach(call => {
          console.log(`  ${call.method} ${call.url} - ${call.status || 'pending'}`);
        });
      }
    }
    
    // Check for errors
    console.log('\n❗ Checking for errors...');
    
    const errors = await page.evaluate(() => {
      // Check for error messages in UI
      const errorSelectors = [
        '*[class*="error"]',
        '*[class*="Error"]',
        'text=failed',
        'text=error'
      ];
      
      const errors = [];
      errorSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.textContent) {
              errors.push(el.textContent.trim());
            }
          });
        } catch {}
      });
      
      return errors;
    });
    
    if (errors.length > 0) {
      console.log('Errors found:', errors);
      fs.writeFileSync(path.join(testDir, 'errors.json'), JSON.stringify(errors, null, 2));
    } else {
      console.log('No visible errors ✅');
    }
    
    // Save network log
    fs.writeFileSync(
      path.join(testDir, 'network.log'), 
      JSON.stringify(networkLog, null, 2)
    );
    
    // Final screenshot
    await page.screenshot({ path: path.join(testDir, '04-final-state.png'), fullPage: true });
    
    // Generate summary
    const summary = {
      timestamp,
      url: page.url(),
      authenticated: state.hasAuth,
      onboardingVisible: hasOnboarding,
      errors: errors.length,
      networkRequests: networkLog.length,
      screenshots: [
        '01-initial-load.png',
        '02-after-5s.png', 
        '03-after-reload.png',
        '04-final-state.png'
      ],
      logs: [
        'console.log',
        'browser-console.log',
        'network.log',
        'state.json'
      ]
    };
    
    fs.writeFileSync(
      path.join(testDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n📊 Test Summary:');
    console.log(`  ✅ Authenticated: ${summary.authenticated}`);
    console.log(`  ${hasOnboarding ? '✅' : '❌'} Onboarding: ${summary.onboardingVisible}`);
    console.log(`  📸 Screenshots: ${summary.screenshots.length}`);
    console.log(`  📝 Logs captured: ${summary.logs.length}`);
    console.log(`  🌐 Network requests: ${summary.networkRequests}`);
    console.log(`  ❗ Errors: ${summary.errors}`);
    
    console.log(`\n✨ Test complete! Results in: ${testDir}/`);
    
  } catch (_error) {
    console.error('❌ Test failed:', _error);
    await page.screenshot({ path: path.join(testDir, 'error-screenshot.png') });
  } finally {
    await browser.close();
  }
}

// Run the test
runAutonomousTest().catch(console.error);