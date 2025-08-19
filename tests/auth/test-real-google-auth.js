#!/usr/bin/env node

/**
 * REAL Google OAuth E2E Test
 * 
 * This test performs ACTUAL Google authentication, not fake localStorage injection
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const GOOGLE_TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
const GOOGLE_TEST_PASSWORD = process.env.GOOGLE_TEST_PASSWORD;

// Colors
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

async function screenshot(page, name, testDir) {
  const filename = `${name}.png`;
  await page.screenshot({ 
    path: path.join(testDir, filename), 
    fullPage: true 
  });
  console.log(`   📸 ${filename}`);
}

async function testRealGoogleAuth() {
  console.log('🔥 REAL Google OAuth E2E Test');
  console.log('==============================\n');
  
  if (!GOOGLE_TEST_PASSWORD) {
    error('GOOGLE_TEST_PASSWORD environment variable not set!');
    console.log('Set it with: export GOOGLE_TEST_PASSWORD="your_password"');
    process.exit(1);
  }
  
  // Create results directory
  const testDir = path.join('/Users/gianmatteo/Documents/Arcana-Prototype/tests', `real-auth-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  info(`Results will be saved to: ../tests/${path.basename(testDir)}/\n`);
  
  // Launch browser in non-headless mode for OAuth
  info('Starting browser for OAuth...');
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Track console logs for debugging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('auth') || text.includes('Auth') || text.includes('user') || text.includes('User')) {
      console.log('   🔍', text.substring(0, 120));
    }
  });
  
  try {
    // PHASE 1: Load app and check initial state
    test('Phase 1: Loading application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    await screenshot(page, '01-initial-load', testDir);
    
    // Check if already authenticated
    const initialAuth = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      return {
        hasSignIn: bodyText.includes('Sign in') || bodyText.includes('Sign In'),
        hasGoogleButton: !!document.querySelector('button[class*="google"], [class*="Google"]'),
        hasSignOut: bodyText.includes('Sign out') || bodyText.includes('Sign Out'),
        currentUrl: window.location.href
      };
    });
    
    console.log('   • Has sign in:', initialAuth.hasSignIn ? '✅' : '❌');
    console.log('   • Has Google button:', initialAuth.hasGoogleButton ? '✅' : '❌');
    console.log('   • Already signed in:', initialAuth.hasSignOut ? '✅' : '❌');
    
    if (initialAuth.hasSignOut) {
      success('Already authenticated! Proceeding to Dev Toolkit test...');
    } else {
      // PHASE 2: Perform Google OAuth
      test('Phase 2: Performing Google OAuth...');
      
      // Look for Google sign-in button
      const googleButtonClicked = await page.evaluate(() => {
        // Look for Google sign-in button with various selectors
        const selectors = [
          'button[class*="google"]',
          'button[class*="Google"]', 
          'button:contains("Google")',
          'button:contains("Sign in with Google")',
          '[data-testid*="google"]',
          '[class*="google-signin"]'
        ];
        
        for (const selector of selectors) {
          try {
            const button = document.querySelector(selector);
            if (button) {
              console.log('Found Google button with selector:', selector);
              button.click();
              return true;
            }
          } catch (e) {
            // Try next selector
          }
        }
        
        // Also try text-based search
        const buttons = Array.from(document.querySelectorAll('button'));
        const googleButton = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('google') ||
          btn.textContent.toLowerCase().includes('sign in')
        );
        
        if (googleButton) {
          console.log('Found Google button by text:', googleButton.textContent);
          googleButton.click();
          return true;
        }
        
        return false;
      });
      
      if (!googleButtonClicked) {
        error('Could not find Google sign-in button!');
        await screenshot(page, '02-no-google-button', testDir);
        await browser.close();
        process.exit(1);
      }
      
      info('Clicked Google sign-in button, waiting for OAuth flow...');
      await page.waitForTimeout(3000);
      await screenshot(page, '02-after-google-click', testDir);
      
      // Wait for Google OAuth page or popup
      try {
        // Check if we're on Google's OAuth page
        await page.waitForSelector('input[type="email"], #identifierId', { timeout: 10000 });
        info('Google OAuth page detected');
        
        // Enter email
        await page.type('input[type="email"], #identifierId', GOOGLE_TEST_EMAIL);
        await page.click('#identifierNext, [id="identifierNext"]');
        await page.waitForTimeout(2000);
        
        // Enter password
        await page.waitForSelector('input[type="password"], #password', { timeout: 10000 });
        await page.type('input[type="password"], #password', GOOGLE_TEST_PASSWORD);
        await page.click('#passwordNext, [id="passwordNext"]');
        
        info('Submitted Google credentials, waiting for redirect...');
        await page.waitForTimeout(5000);
        
      } catch (authError) {
        info('OAuth might be in popup or iframe, checking current page...');
        // Continue to check if authentication worked
      }
      
      await screenshot(page, '03-after-oauth', testDir);
    }
    
    // PHASE 3: Verify authentication worked
    test('Phase 3: Verifying authentication...');
    
    // Go back to main app if we're somewhere else
    if (!page.url().includes(APP_URL)) {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(3000);
    }
    
    const authCheck = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      return {
        hasSignOut: bodyText.includes('Sign out') || bodyText.includes('Sign Out'),
        hasUserMenu: bodyText.includes('Profile') || bodyText.includes('Dashboard'),
        hasWelcome: bodyText.includes('Welcome'),
        hasUserName: bodyText.includes('@') || bodyText.includes('gianmatteo'),
        currentUrl: window.location.href
      };
    });
    
    console.log('   • Has sign out:', authCheck.hasSignOut ? '✅' : '❌');
    console.log('   • Has user menu:', authCheck.hasUserMenu ? '✅' : '❌');
    console.log('   • Shows user info:', authCheck.hasUserName ? '✅' : '❌');
    
    if (!authCheck.hasSignOut && !authCheck.hasUserMenu) {
      error('Authentication failed! Not signed in.');
      await screenshot(page, '04-auth-failed', testDir);
    } else {
      success('Authentication successful!');
    }
    
    await screenshot(page, '04-authenticated-dashboard', testDir);
    
    // PHASE 4: Test Dev Toolkit with real authentication
    test('Phase 4: Testing Dev Toolkit with real authentication...');
    
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(5000);
    
    const devToolkitAuth = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const badges = Array.from(document.querySelectorAll('[class*="badge"]'));
      
      return {
        showsAuthenticated: badges.some(b => b.textContent.includes('Authenticated')),
        showsDemo: bodyText.includes('Demo mode'),
        showsRealBackend: bodyText.includes('Connected to real backend'),
        hasTaskSelector: !!document.querySelector('select'),
        authBadges: badges.map(b => b.textContent.trim()).filter(t => t),
        hasStartButton: !!Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Start New Onboarding')
        )
      };
    });
    
    console.log('   • Shows "Authenticated":', devToolkitAuth.showsAuthenticated ? '✅' : '❌');
    console.log('   • Shows "Real Backend":', devToolkitAuth.showsRealBackend ? '✅' : '❌');
    console.log('   • Shows "Demo mode":', devToolkitAuth.showsDemo ? '❌' : '✅');
    console.log('   • Has task selector:', devToolkitAuth.hasTaskSelector ? '✅' : '❌');
    console.log('   • Auth badges:', devToolkitAuth.authBadges);
    
    await screenshot(page, '05-dev-toolkit-authenticated', testDir);
    
    // Create a real task with real authentication
    if (devToolkitAuth.hasStartButton) {
      info('Creating task with real authentication...');
      await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.includes('Start New Onboarding'));
        if (button) button.click();
      });
      
      await page.waitForTimeout(5000);
      await screenshot(page, '06-task-created-real-auth', testDir);
    }
    
    // SUMMARY
    console.log('\n' + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    success('REAL Authentication E2E Test Complete!');
    console.log(colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    
    console.log('\n📊 Results:');
    console.log(`   • Google OAuth: ${authCheck.hasSignOut || authCheck.hasUserMenu ? '✅' : '❌'}`);
    console.log(`   • Dev Toolkit Auth: ${devToolkitAuth.showsAuthenticated ? '✅' : '❌'}`);
    console.log(`   • Real Backend: ${devToolkitAuth.showsRealBackend ? '✅' : '❌'}`);
    console.log(`   • No Demo Mode: ${!devToolkitAuth.showsDemo ? '✅' : '❌'}`);
    
    console.log('\n📁 Screenshots saved to:');
    console.log('   ' + colors.blue + `../tests/${path.basename(testDir)}/` + colors.reset);
    
  } catch (err) {
    error('Test failed: ' + err.message);
    console.error(err.stack);
    await screenshot(page, 'error-final', testDir);
  } finally {
    // Keep browser open for inspection if auth failed
    const finalCheck = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      return bodyText.includes('Authenticated') || bodyText.includes('Sign out');
    });
    
    if (finalCheck) {
      await browser.close();
    } else {
      console.log('\n⚠️  Browser kept open for debugging...');
      console.log('   Close manually after inspection');
    }
  }
}

testRealGoogleAuth().catch(err => {
  error('Fatal error: ' + err.message);
  process.exit(1);
});