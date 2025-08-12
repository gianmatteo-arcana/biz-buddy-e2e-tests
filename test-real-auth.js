#!/usr/bin/env node

/**
 * Real auth test - test with actual browser authentication state
 */

const puppeteer = require('puppeteer');
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';

async function testRealAuth() {
  console.log('🧪 Real Auth Test - Using Actual Browser Authentication');
  console.log('=====================================================\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Track all relevant console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('RealTimeVisualizer') || text.includes('Authenticated') || text.includes('auth') || text.includes('user') || text.includes('User')) {
      console.log('   🔍', text.substring(0, 150));
    }
  });
  
  console.log('📍 Step 1: Load main application');
  await page.goto(APP_URL);
  await page.waitForTimeout(3000);
  
  // Check if user is already authenticated
  const mainPageAuth = await page.evaluate(() => {
    const bodyText = document.body.textContent;
    return {
      hasSignIn: bodyText.includes('Sign in') || bodyText.includes('Sign In'),
      hasSignOut: bodyText.includes('Sign out') || bodyText.includes('Sign Out'), 
      hasUserMenu: bodyText.includes('Profile') || bodyText.includes('Dashboard'),
      url: window.location.href
    };
  });
  
  console.log('   • Has sign in button:', mainPageAuth.hasSignIn);
  console.log('   • Has sign out button:', mainPageAuth.hasSignOut);
  console.log('   • Has user menu:', mainPageAuth.hasUserMenu);
  console.log('   • Current URL:', mainPageAuth.url);
  
  if (mainPageAuth.hasSignIn) {
    console.log('\n⚠️  You are not currently signed in to the application.');
    console.log('Please sign in manually and then run this test again.');
    console.log('\nSteps:');
    console.log('1. Sign in to the main application');
    console.log('2. Run this test again');
    await browser.close();
    return;
  }
  
  console.log('\n📍 Step 2: Navigate to Dev Toolkit');
  await page.goto(`${APP_URL}/dev-toolkit-standalone`);
  await page.waitForTimeout(5000);
  
  // Check Dev Toolkit authentication state
  const devToolkitAuth = await page.evaluate(() => {
    const bodyText = document.body.textContent;
    return {
      showsAuthenticated: bodyText.includes('Authenticated'),
      showsDemo: bodyText.includes('Demo mode'),
      showsRealBackend: bodyText.includes('Connected to real backend'),
      hasTaskSelector: !!document.querySelector('select'),
      authBadges: Array.from(document.querySelectorAll('[class*="badge"]'))
        .map(el => el.textContent.trim())
        .filter(text => text.includes('Auth') || text.includes('Real') || text.includes('Demo'))
    };
  });
  
  console.log('   • Shows "Authenticated":', devToolkitAuth.showsAuthenticated);
  console.log('   • Shows "Demo mode":', devToolkitAuth.showsDemo);
  console.log('   • Shows "Connected to real backend":', devToolkitAuth.showsRealBackend);
  console.log('   • Has task selector:', devToolkitAuth.hasTaskSelector);
  console.log('   • Auth badges:', devToolkitAuth.authBadges);
  
  // Take screenshot
  const timestamp = Date.now();
  const screenshotPath = path.join('/Users/gianmatteo/Documents/Arcana-Prototype/tests', `real-auth-test-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('\n📸 Screenshot saved:', screenshotPath);
  
  console.log('\n📋 Summary:');
  if (devToolkitAuth.showsAuthenticated && !devToolkitAuth.showsDemo) {
    console.log('✅ SUCCESS: Dev Toolkit is working with real authentication!');
  } else if (devToolkitAuth.showsDemo) {
    console.log('❌ ISSUE: Still showing demo mode despite being signed in');
  } else {
    console.log('❓ UNKNOWN: Authentication state unclear');
  }
  
  // Keep browser open for inspection
  console.log('\n⏸️  Browser kept open for manual inspection...');
  console.log('   Press Ctrl+C to close');
  
  // Wait indefinitely
  await new Promise(() => {});
}

testRealAuth().catch(console.error);