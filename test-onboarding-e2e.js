#!/usr/bin/env node

/**
 * Complete Onboarding E2E Test
 * 
 * This test shows both:
 * 1. User Dashboard experience with onboarding card
 * 2. Dev Toolkit real-time visualization of the process
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const SESSION_FILE = path.join(__dirname, '.auth-session.json');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function success(msg) { console.log(colors.green + '✅ ' + msg + colors.reset); }
function error(msg) { console.log(colors.red + '❌ ' + msg + colors.reset); }
function info(msg) { console.log(colors.blue + '📍 ' + msg + colors.reset); }
function test(msg) { console.log(colors.yellow + '🧪 ' + msg + colors.reset); }

async function loadAuth() {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    error('No authentication found!');
    console.log('\\nRun this first:');
    console.log('  ' + colors.blue + 'node update-test-auth.js' + colors.reset + '\\n');
    process.exit(1);
  }
}

async function screenshot(page, name, testDir) {
  const filename = `${name}.png`;
  await page.screenshot({ 
    path: path.join(testDir, filename), 
    fullPage: true 
  });
  console.log(`   📸 ${filename}`);
}

async function testOnboardingE2E() {
  console.log('🚀 Complete Onboarding E2E Test');
  console.log('=================================\\n');
  
  // Load auth
  info('Loading authentication...');
  const session = await loadAuth();
  
  if (session.user?.email) {
    success(`Authenticated as: ${session.user.email}`);
  }
  
  // Create results directory
  const testDir = path.join('/Users/gianmatteo/Documents/Arcana-Prototype/tests', `onboarding-e2e-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  const testDirName = path.basename(testDir);
  info(`Results will be saved to: ../tests/${testDirName}/\\n`);
  
  // Launch two browser contexts - one for user, one for dev toolkit
  info('Starting browsers...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const userPage = await browser.newPage();
  const devPage = await browser.newPage();
  
  await userPage.setViewport({ width: 1920, height: 1080 });
  await devPage.setViewport({ width: 1920, height: 1080 });
  
  // Inject auth into both pages
  for (const page of [userPage, devPage]) {
    await page.evaluateOnNewDocument((authData) => {
      const supabaseKey = `sb-raenkewzlvrdqufwxjpl-auth-token`;
      const authSession = {
        access_token: authData.access_token,
        token_type: 'bearer',
        user: authData.user || null,
        expires_at: Date.now() + 3600000,
        expires_in: 3600,
        refresh_token: authData.refresh_token || null
      };
      
      localStorage.setItem(supabaseKey, JSON.stringify({
        currentSession: authSession,
        expiresAt: Date.now() + 3600000
      }));
      localStorage.setItem('supabase.auth.token', JSON.stringify(authSession));
    }, session);
  }
  
  // Track console logs from Dev Toolkit
  devPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('RealTimeVisualizer') || text.includes('task') || text.includes('agent') || text.includes('orchestr')) {
      console.log('   🔍 DEV:', text.substring(0, 100));
    }
  });
  
  try {
    // PHASE 1: Set up Dev Toolkit monitoring
    test('Phase 1: Setting up Dev Toolkit monitoring...');
    await devPage.goto(`${APP_URL}/dev-toolkit-standalone`);
    await devPage.waitForTimeout(3000);
    await screenshot(devPage, '01-dev-toolkit-initial', testDir);
    
    // PHASE 2: User Dashboard - initial state
    test('Phase 2: Loading user dashboard...');
    await userPage.goto(APP_URL);
    await userPage.waitForTimeout(3000);
    await screenshot(userPage, '02-dashboard-initial', testDir);
    
    // Check for onboarding card
    const hasOnboardingCard = await userPage.evaluate(() => {
      const bodyText = document.body.textContent;
      return {
        hasOnboarding: bodyText.includes('onboarding') || bodyText.includes('Onboarding'),
        hasBusinessSetup: bodyText.includes('Business') || bodyText.includes('business'),
        hasGetStarted: bodyText.includes('Get Started') || bodyText.includes('get started'),
        hasCompleteProfile: bodyText.includes('Complete') || bodyText.includes('Profile'),
        cardCount: document.querySelectorAll('[class*="card"]').length,
        buttonCount: document.querySelectorAll('button').length
      };
    });
    
    console.log('   • Has onboarding content:', hasOnboardingCard.hasOnboarding ? '✅' : '❌');
    console.log('   • Has business setup:', hasOnboardingCard.hasBusinessSetup ? '✅' : '❌');
    console.log('   • Cards found:', hasOnboardingCard.cardCount);
    console.log('   • Buttons found:', hasOnboardingCard.buttonCount);
    
    // PHASE 3: Look for and interact with onboarding elements
    test('Phase 3: Interacting with onboarding elements...');
    
    // Try to find and click onboarding/business setup buttons
    const onboardingStarted = await userPage.evaluate(() => {
      // Look for various onboarding trigger buttons
      const buttons = Array.from(document.querySelectorAll('button'));
      const onboardingButtons = buttons.filter(btn => {
        const text = btn.textContent.toLowerCase();
        return text.includes('onboard') || 
               text.includes('get started') || 
               text.includes('setup') ||
               text.includes('complete') ||
               text.includes('begin');
      });
      
      if (onboardingButtons.length > 0) {
        console.log('Found onboarding button:', onboardingButtons[0].textContent);
        onboardingButtons[0].click();
        return true;
      }
      
      // Also try clicking any prominent business-related cards
      const cards = Array.from(document.querySelectorAll('[class*="card"]'));
      const businessCards = cards.filter(card => {
        const text = card.textContent.toLowerCase();
        return text.includes('business') || text.includes('profile') || text.includes('setup');
      });
      
      if (businessCards.length > 0) {
        console.log('Found business card, clicking...');
        businessCards[0].click();
        return true;
      }
      
      return false;
    });
    
    await userPage.waitForTimeout(2000);
    await screenshot(userPage, '03-dashboard-after-click', testDir);
    
    // PHASE 4: Check Dev Toolkit for task creation
    test('Phase 4: Checking Dev Toolkit for task activity...');
    await devPage.reload();
    await devPage.waitForTimeout(3000);
    
    // Try to start a new onboarding task in Dev Toolkit
    const devToolkitTaskCreated = await devPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startButton = buttons.find(b => b.textContent.includes('Start New Onboarding'));
      
      if (startButton) {
        console.log('Creating new onboarding task via Dev Toolkit...');
        startButton.click();
        return true;
      }
      return false;
    });
    
    if (devToolkitTaskCreated) {
      info('Created task via Dev Toolkit');
      await devPage.waitForTimeout(5000);
    }
    
    await screenshot(devPage, '04-dev-toolkit-with-task', testDir);
    
    // PHASE 5: Monitor real-time updates
    test('Phase 5: Capturing real-time visualization...');
    
    // Check if Dev Toolkit is showing real data
    const devToolkitState = await devPage.evaluate(() => {
      const bodyText = document.body.textContent;
      return {
        hasAuthenticated: bodyText.includes('Authenticated'),
        hasRealData: bodyText.includes('Real') && !bodyText.includes('Demo'),
        hasDemoMode: bodyText.includes('Demo mode'),
        hasTaskTimeline: bodyText.includes('Timeline'),
        hasActiveTask: bodyText.includes('active') || bodyText.includes('Active'),
        taskElements: document.querySelectorAll('[class*="task"]').length,
        timelineElements: document.querySelectorAll('[class*="timeline"]').length
      };
    });
    
    console.log('   • Shows authenticated:', devToolkitState.hasAuthenticated ? '✅' : '❌');
    console.log('   • Shows real data:', devToolkitState.hasRealData ? '✅' : '❌');
    console.log('   • Has demo mode:', devToolkitState.hasDemoMode ? '❌' : '✅');
    console.log('   • Has timeline:', devToolkitState.hasTaskTimeline ? '✅' : '❌');
    console.log('   • Task elements:', devToolkitState.taskElements);
    
    // Test the different tabs in Dev Toolkit
    const tabs = ['Timeline', 'Context', 'Reasoning', 'Orchestration'];
    for (let i = 0; i < tabs.length; i++) {
      const tabName = tabs[i];
      const tabClicked = await devPage.evaluate((name) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tab = buttons.find(b => b.textContent.includes(name));
        if (tab) {
          tab.click();
          return true;
        }
        return false;
      }, tabName);
      
      if (tabClicked) {
        await devPage.waitForTimeout(1000);
        info(`Switched to ${tabName} tab`);
      }
    }
    
    await screenshot(devPage, '05-dev-toolkit-final', testDir);
    
    // PHASE 6: Return to user dashboard for final state
    test('Phase 6: Checking final user dashboard state...');
    await userPage.waitForTimeout(2000);
    await screenshot(userPage, '06-dashboard-final', testDir);
    
    // Check if anything changed in user dashboard
    const finalDashboardState = await userPage.evaluate(() => {
      const bodyText = document.body.textContent;
      return {
        hasProgressIndicator: bodyText.includes('progress') || bodyText.includes('Progress'),
        hasCompletionStatus: bodyText.includes('complete') || bodyText.includes('Complete'),
        hasNextSteps: bodyText.includes('next') || bodyText.includes('Next'),
        currentUrl: window.location.href,
        hasErrorMessages: bodyText.includes('error') || bodyText.includes('Error')
      };
    });
    
    console.log('   • Has progress indicator:', finalDashboardState.hasProgressIndicator ? '✅' : '❌');
    console.log('   • Current URL:', finalDashboardState.currentUrl);
    console.log('   • Has errors:', finalDashboardState.hasErrorMessages ? '❌' : '✅');
    
    // Summary
    console.log('\\n' + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    success('Onboarding E2E Test Complete!');
    console.log(colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    
    console.log('\\n📊 Results Summary:');
    console.log('\\n👤 User Experience:');
    console.log(`   • Onboarding elements: ${hasOnboardingCard.hasOnboarding ? '✅' : '❌'}`);
    console.log(`   • Business setup: ${hasOnboardingCard.hasBusinessSetup ? '✅' : '❌'}`);
    console.log(`   • Onboarding started: ${onboardingStarted ? '✅' : '❌'}`);
    
    console.log('\\n🔧 Dev Toolkit:');
    console.log(`   • Authentication: ${devToolkitState.hasAuthenticated ? '✅' : '❌'}`);
    console.log(`   • Real Data: ${devToolkitState.hasRealData ? '✅' : '❌'}`);
    console.log(`   • Task Creation: ${devToolkitTaskCreated ? '✅' : '❌'}`);
    console.log(`   • Timeline View: ${devToolkitState.hasTaskTimeline ? '✅' : '❌'}`);
    
    console.log('\\n📁 Screenshots saved to:');
    console.log('   ' + colors.blue + `../tests/${testDirName}/` + colors.reset);
    console.log('\\n💡 View screenshots with:');
    console.log('   ' + colors.blue + `open ../tests/${testDirName}/` + colors.reset + '\\n');
    
  } catch (err) {
    error('Test failed: ' + err.message);
    await screenshot(userPage, 'error-user', testDir);
    await screenshot(devPage, 'error-dev', testDir);
  } finally {
    await browser.close();
  }
}

// Polyfill for older puppeteer
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}

// Run
testOnboardingE2E().catch(err => {
  error('Fatal error: ' + err.message);
  process.exit(1);
});