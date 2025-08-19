#!/usr/bin/env node

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Analyzing Sign-In Page Rendering Issue\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100
  });
  const page = await browser.newPage();
  
  // Enable console error logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message);
  });
  
  // Go to the app
  console.log('Loading app...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  await page.waitForTimeout(3000);
  
  // Check what's missing from the attractive sign-in page
  const pageAnalysis = await page.evaluate(() => {
    // Expected elements from the attractive sign-in page
    const checks = {
      // Logo section
      hasLogo: !!document.querySelector('.bg-gradient-to-br.from-blue-600.to-purple-600.rounded-2xl'),
      hasLogoText: document.body.textContent.includes('SA'),
      
      // Title and tagline
      hasTitle: !!document.querySelector('.text-5xl.font-bold'),
      hasTagline: document.body.textContent.includes('Your AI Compliance Co-Pilot'),
      hasDescription: document.body.textContent.includes('Never miss a deadline'),
      
      // Benefits section
      hasBenefitsCard: !!document.querySelector('.bg-white.rounded-2xl.shadow-xl'),
      hasSmartReminders: document.body.textContent.includes('Smart Reminders'),
      hasAIPowered: document.body.textContent.includes('AI-Powered'),
      hasAlwaysCurrent: document.body.textContent.includes('Always Current'),
      hasCheckmarks: document.querySelectorAll('.bg-green-100').length,
      
      // Google button
      hasGoogleButton: !!document.querySelector('button svg path[fill="#4285F4"]'),
      
      // Trust badges
      hasTrustBadges: document.body.textContent.includes('Trusted by small businesses'),
      hasSOC2: document.body.textContent.includes('SOC 2'),
      hasSecurity: document.body.textContent.includes('Bank-Level Security'),
      
      // Get actual classes on divs
      divClasses: Array.from(document.querySelectorAll('div')).map(d => d.className).filter(c => c),
      
      // Get body HTML snippet
      htmlSnippet: document.body.innerHTML.substring(0, 1000)
    };
    
    return checks;
  });
  
  console.log('\n📊 Expected Elements Analysis:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Logo Section:');
  console.log('  Has logo div:', pageAnalysis.hasLogo ? '✅' : '❌ MISSING');
  console.log('  Has "SA" text:', pageAnalysis.hasLogoText ? '✅' : '❌ MISSING');
  
  console.log('\nBranding:');
  console.log('  Has title (5xl):', pageAnalysis.hasTitle ? '✅' : '❌ MISSING');
  console.log('  Has tagline:', pageAnalysis.hasTagline ? '✅' : '❌ MISSING');
  console.log('  Has description:', pageAnalysis.hasDescription ? '✅' : '❌ MISSING');
  
  console.log('\nBenefits Section:');
  console.log('  Has white card:', pageAnalysis.hasBenefitsCard ? '✅' : '❌ MISSING');
  console.log('  Smart Reminders:', pageAnalysis.hasSmartReminders ? '✅' : '❌ MISSING');
  console.log('  AI-Powered:', pageAnalysis.hasAIPowered ? '✅' : '❌ MISSING');
  console.log('  Always Current:', pageAnalysis.hasAlwaysCurrent ? '✅' : '❌ MISSING');
  console.log('  Green checkmarks:', pageAnalysis.hasCheckmarks || '0', '(expected 3)');
  
  console.log('\nGoogle Auth:');
  console.log('  Has Google button:', pageAnalysis.hasGoogleButton ? '✅' : '❌ MISSING');
  
  console.log('\nTrust Section:');
  console.log('  Trust badges:', pageAnalysis.hasTrustBadges ? '✅' : '❌ MISSING');
  console.log('  SOC 2 text:', pageAnalysis.hasSOC2 ? '✅' : '❌ MISSING');
  console.log('  Security text:', pageAnalysis.hasSecurity ? '✅' : '❌ MISSING');
  
  console.log('\n🔍 CSS Classes Found:');
  console.log(pageAnalysis.divClasses.slice(0, 10));
  
  // Take viewport screenshot
  await page.screenshot({ 
    path: 'signin-viewport.png',
    fullPage: false 
  });
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'signin-fullpage.png',
    fullPage: true 
  });
  
  console.log('\n📸 Screenshots saved:');
  console.log('  - signin-viewport.png (what user sees)');
  console.log('  - signin-fullpage.png (entire page)');
  
  // Get viewport size
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollHeight: document.body.scrollHeight
  }));
  
  console.log('\n📐 Page Dimensions:');
  console.log(`  Viewport: ${viewport.width}x${viewport.height}`);
  console.log(`  Scroll height: ${viewport.scrollHeight}px`);
  
  await browser.close();
  
  console.log('\n🎯 Diagnosis:');
  if (!pageAnalysis.hasBenefitsCard && !pageAnalysis.hasLogo) {
    console.log('❌ The attractive sign-in page components are NOT rendering!');
    console.log('   Only the basic fallback is showing.');
  } else if (pageAnalysis.hasBenefitsCard && pageAnalysis.hasLogo) {
    console.log('✅ The attractive sign-in page IS rendering correctly.');
  } else {
    console.log('⚠️ The sign-in page is partially rendering.');
  }
})();

// Polyfill
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}