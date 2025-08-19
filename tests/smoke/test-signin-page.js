#!/usr/bin/env node

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing Sign-In Page Visibility\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  
  // Go to the app
  console.log('1. Loading app...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  console.log('2. Waiting for page to stabilize...');
  await page.waitForTimeout(3000);
  
  // Check what's visible
  const pageState = await page.evaluate(() => {
    // Look for Google Sign-In button
    const buttons = Array.from(document.querySelectorAll('button'));
    const googleButton = buttons.find(btn => 
      btn.textContent?.includes('Google') || 
      btn.innerHTML?.includes('google') ||
      btn.className?.includes('google')
    );
    
    // Check for sign-in elements
    const hasGoogleSvg = !!document.querySelector('svg path[fill="#4285F4"]');
    const hasSignInText = document.body.textContent.includes('Sign in with Google');
    const hasWelcomeText = document.body.textContent.includes('Welcome to SmallBizAlly');
    const hasComplianceText = document.body.textContent.includes('AI Compliance Co-Pilot');
    
    // Get all button texts
    const allButtonTexts = buttons.map(b => b.textContent?.trim()).filter(Boolean);
    
    return {
      hasGoogleButton: !!googleButton,
      googleButtonText: googleButton?.textContent?.trim(),
      googleButtonVisible: googleButton ? window.getComputedStyle(googleButton).display !== 'none' : false,
      hasGoogleSvg,
      hasSignInText,
      hasWelcomeText,
      hasComplianceText,
      allButtonTexts,
      url: window.location.href,
      bodyHTML: document.body.innerHTML.substring(0, 500)
    };
  });
  
  console.log('\n📊 Page Analysis:');
  console.log('  URL:', pageState.url);
  console.log('  Has Welcome Text:', pageState.hasWelcomeText ? '✅' : '❌');
  console.log('  Has Compliance Text:', pageState.hasComplianceText ? '✅' : '❌');
  console.log('  Has Google Button:', pageState.hasGoogleButton ? '✅' : '❌');
  console.log('  Google Button Visible:', pageState.googleButtonVisible ? '✅' : '❌');
  console.log('  Has Google SVG:', pageState.hasGoogleSvg ? '✅' : '❌');
  console.log('  Has "Sign in with Google" text:', pageState.hasSignInText ? '✅' : '❌');
  console.log('  All Button Texts:', pageState.allButtonTexts);
  
  if (pageState.googleButtonText) {
    console.log('  Google Button Text:', pageState.googleButtonText);
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: 'signin-page-check.png',
    fullPage: true 
  });
  console.log('\n📸 Screenshot saved: signin-page-check.png');
  
  // Try to click the Google button if it exists
  if (pageState.hasGoogleButton) {
    console.log('\n3. Attempting to click Google Sign-In button...');
    try {
      await page.click('button:has(svg path[fill="#4285F4"])');
      console.log('✅ Button clicked successfully');
      
      // Wait to see what happens
      await page.waitForTimeout(3000);
      
      // Check if a new window opened
      const pages = await browser.pages();
      console.log('Number of browser tabs/windows:', pages.length);
      
    } catch (e) {
      console.log('❌ Could not click button:', e.message);
    }
  } else {
    console.log('\n❌ CRITICAL: Google Sign-In button not found!');
    console.log('   The button should be visible but is missing from the page.');
  }
  
  await browser.close();
  console.log('\n✅ Test complete');
})();

// Polyfill for older Puppeteer
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}