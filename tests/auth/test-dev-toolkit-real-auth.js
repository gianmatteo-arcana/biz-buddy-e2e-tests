const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Dev Toolkit Test with REAL Authentication
 * Uses Playwright's stored authentication state like the working autonomous-test.js
 */
async function testDevToolkitRealAuth() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/dev-toolkit-real-auth-${timestamp}`;
  
  // Create test directory for this run
  fs.mkdirSync(testDir, { recursive: true });
  
  console.log(`🔥 Dev Toolkit Test with REAL Authentication`);
  console.log(`📁 Results will be saved to: ${testDir}/\n`);
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  // Use the same authentication approach as the working autonomous-test.js
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
  
  // Track console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      time: new Date().toISOString(),
      type: msg.type(),
      text: text
    });
    
    // Log important messages
    if (text.includes('RealTimeVisualizer') || text.includes('Authenticated') || text.includes('auth')) {
      console.log(`   🔍 ${text.substring(0, 120)}`);
    }
  });
  
  try {
    // PHASE 1: Load main dashboard and verify authentication
    console.log('📍 Phase 1: Loading main dashboard to verify authentication...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: path.join(testDir, '01-dashboard-authenticated.png'), fullPage: true });
    
    // Check authentication status on main dashboard
    const mainAuth = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      return {
        hasWelcomeBack: bodyText.includes('Welcome back') || bodyText.includes('Welcome, '),
        hasUserName: bodyText.includes('Gianmatteo') || bodyText.includes('gianmatteo'),
        hasSignOut: bodyText.includes('Sign out') || bodyText.includes('Logout'),
        hasSignIn: bodyText.includes('Sign in') || bodyText.includes('Login'),
        title: document.title,
        url: window.location.href
      };
    });
    
    console.log(`   • Welcome message: ${mainAuth.hasWelcomeBack ? '✅' : '❌'}`);
    console.log(`   • User name shown: ${mainAuth.hasUserName ? '✅' : '❌'}`);
    console.log(`   • Has sign out: ${mainAuth.hasSignOut ? '✅' : '❌'}`);
    console.log(`   • Has sign in: ${mainAuth.hasSignIn ? '❌' : '✅'}`);
    
    if (mainAuth.hasSignIn || (!mainAuth.hasWelcomeBack && !mainAuth.hasUserName)) {
      console.log('❌ Not authenticated on main dashboard!');
      console.log('   The stored authentication state may be expired or missing.');
      console.log('   Try running the auth setup first.');
      await browser.close();
      return;
    }
    
    console.log('✅ Authenticated on main dashboard!');
    
    // PHASE 2: Navigate to Dev Toolkit
    console.log('\\n📍 Phase 2: Loading Dev Toolkit with real authentication...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: path.join(testDir, '02-dev-toolkit-initial.png'), fullPage: true });
    
    // Check Dev Toolkit authentication state
    const devAuth = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const badges = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && 
        (el.textContent.includes('Authenticated') || el.textContent.includes('Demo Mode'))
      );
      
      return {
        showsAuthenticated: bodyText.includes('Authenticated'),
        showsDemo: bodyText.includes('Demo mode') || bodyText.includes('Demo Mode'),
        showsRealBackend: bodyText.includes('Connected to real backend'),
        hasTaskSelector: !!document.querySelector('select'),
        hasStartButton: Array.from(document.querySelectorAll('button')).some(b => 
          b.textContent.includes('Start New Onboarding')
        ),
        authBadges: badges.map(b => b.textContent.trim()).filter(t => t),
        title: document.title,
        hasRealTimeVisualizer: bodyText.includes('Real-Time Agent Visualizer'),
        hasTimelineTabs: bodyText.includes('Timeline') && bodyText.includes('Context')
      };
    });
    
    console.log(`   • Shows "Authenticated": ${devAuth.showsAuthenticated ? '✅' : '❌'}`);
    console.log(`   • Shows "Real Backend": ${devAuth.showsRealBackend ? '✅' : '❌'}`);
    console.log(`   • Shows "Demo mode": ${devAuth.showsDemo ? '❌' : '✅'}`);
    console.log(`   • Has task selector: ${devAuth.hasTaskSelector ? '✅' : '❌'}`);
    console.log(`   • Has start button: ${devAuth.hasStartButton ? '✅' : '❌'}`);
    console.log(`   • Auth badges: ${devAuth.authBadges.join(', ')}`);
    
    // PHASE 3: Create a real task with authentication
    if (devAuth.hasStartButton) {
      console.log('\\n📍 Phase 3: Creating task with real authentication...');
      
      await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.includes('Start New Onboarding'));
        if (button) {
          console.log('Clicking Start New Onboarding button...');
          button.click();
        }
      });
      
      await page.waitForTimeout(7000); // Wait for task creation and loading
      
      await page.screenshot({ path: path.join(testDir, '03-task-created.png'), fullPage: true });
      
      // Check if task was created successfully
      const taskState = await page.evaluate(() => {
        const bodyText = document.body.textContent;
        return {
          hasCurrentTask: bodyText.includes('Current Task:'),
          hasTaskId: bodyText.includes('Complete Business Onboarding'),
          hasActiveStatus: bodyText.includes('active') || bodyText.includes('Active'),
          hasTimelineView: bodyText.includes('Timeline'),
          hasAgentLanes: bodyText.includes('User') && bodyText.includes('Orchestrator'),
          errorMessage: document.querySelector('[class*="error"]')?.textContent || null
        };
      });
      
      console.log(`   • Has current task: ${taskState.hasCurrentTask ? '✅' : '❌'}`);
      console.log(`   • Task created: ${taskState.hasTaskId ? '✅' : '❌'}`);
      console.log(`   • Active status: ${taskState.hasActiveStatus ? '✅' : '❌'}`);
      console.log(`   • Timeline view: ${taskState.hasTimelineView ? '✅' : '❌'}`);
      console.log(`   • Agent lanes: ${taskState.hasAgentLanes ? '✅' : '❌'}`);
      if (taskState.errorMessage) {
        console.log(`   • Error: ${taskState.errorMessage}`);
      }
    }
    
    // PHASE 4: Test all Dev Toolkit tabs
    console.log('\\n📍 Phase 4: Testing Dev Toolkit tabs...');
    const tabs = ['Timeline', 'Context', 'Reasoning', 'Orchestration'];
    
    for (let i = 0; i < tabs.length; i++) {
      const tabName = tabs[i];
      console.log(`   Testing ${tabName} tab...`);
      
      const tabClicked = await page.evaluate((name) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tab = buttons.find(b => b.textContent.includes(name));
        if (tab) {
          tab.click();
          return true;
        }
        return false;
      }, tabName);
      
      if (tabClicked) {
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: path.join(testDir, `04-tab-${tabName.toLowerCase()}.png`), 
          fullPage: true 
        });
        console.log(`     ✅ ${tabName} tab opened`);
      } else {
        console.log(`     ❌ ${tabName} tab not found`);
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: path.join(testDir, '05-final-state.png'), fullPage: true });
    
    // Save logs and network data
    fs.writeFileSync(path.join(testDir, 'console-messages.json'), JSON.stringify(consoleMessages, null, 2));
    fs.writeFileSync(path.join(testDir, 'network-log.json'), JSON.stringify(networkLog, null, 2));
    
    // SUMMARY
    console.log('\\n' + '━'.repeat(50));
    console.log('🎉 REAL AUTHENTICATION DEV TOOLKIT TEST COMPLETE!');
    console.log('━'.repeat(50));
    
    console.log('\\n📊 Results Summary:');
    console.log('\\n👤 Main Dashboard Authentication:');
    console.log(`   • Welcome message: ${mainAuth.hasWelcomeBack ? '✅' : '❌'}`);
    console.log(`   • User identified: ${mainAuth.hasUserName ? '✅' : '❌'}`);
    
    console.log('\\n🔧 Dev Toolkit Authentication:');
    console.log(`   • Shows "Authenticated": ${devAuth.showsAuthenticated ? '✅' : '❌'}`);
    console.log(`   • Shows "Real Backend": ${devAuth.showsRealBackend ? '✅' : '❌'}`);
    console.log(`   • No Demo Mode: ${!devAuth.showsDemo ? '✅' : '❌'}`);
    console.log(`   • Task Creation: ${devAuth.hasStartButton ? '✅' : '❌'}`);
    console.log(`   • Timeline View: ${devAuth.hasTimelineTabs ? '✅' : '❌'}`);
    
    const authWorking = mainAuth.hasWelcomeBack && devAuth.showsAuthenticated;
    console.log(`\\n🎯 Overall Result: ${authWorking ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
    
    console.log('\\n📁 Screenshots and logs saved to:');
    console.log(`   ${testDir.replace('/Users/gianmatteo/Documents/Arcana-Prototype/', '../')}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: path.join(testDir, 'error-state.png'), fullPage: true });
    
    // Save error details
    fs.writeFileSync(path.join(testDir, 'error-details.json'), JSON.stringify({
      error: error.message,
      stack: error.stack,
      consoleMessages: consoleMessages.slice(-20), // Last 20 console messages
      networkRequests: networkLog.slice(-10) // Last 10 network requests
    }, null, 2));
  } finally {
    await browser.close();
  }
}

// Run the test
testDevToolkitRealAuth().catch(console.error);