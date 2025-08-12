#!/usr/bin/env node

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Checking Dashboard State...\n');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Go to main dashboard
  console.log('1. Loading main app...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  await page.waitForTimeout(3000);
  
  // Check what's on the dashboard
  const dashboardState = await page.evaluate(() => {
    return {
      url: window.location.href,
      hasLoginButton: !!document.querySelector('button'),
      hasTaskCards: document.querySelectorAll('[data-testid*="task"], .task-card').length,
      hasOnboardingCard: !!document.querySelector('[data-testid="onboarding-card"], .onboarding'),
      hasLoadingSpinner: !!document.querySelector('.spinner, [class*="loading"]'),
      visibleText: Array.from(document.querySelectorAll('h1, h2, p')).slice(0, 5).map(el => el.textContent.trim())
    };
  });
  
  console.log('\n📊 Dashboard State:');
  console.log('  URL:', dashboardState.url);
  console.log('  Has Login Button:', dashboardState.hasLoginButton);
  console.log('  Task Cards Found:', dashboardState.hasTaskCards);
  console.log('  Onboarding Card:', dashboardState.hasOnboardingCard);
  console.log('  Loading Spinner:', dashboardState.hasLoadingSpinner);
  console.log('  Visible Text:');
  dashboardState.visibleText.forEach(text => {
    console.log('    -', text);
  });
  
  // Take screenshot
  await page.screenshot({ 
    path: 'dashboard-check.png',
    fullPage: true 
  });
  console.log('\n📸 Screenshot saved: dashboard-check.png');
  
  // Now check if Dev Toolkit shows real data
  console.log('\n2. Checking Dev Toolkit Standalone...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);
  
  const devToolkitState = await page.evaluate(() => {
    // Check if there are any real tasks loaded
    const taskElements = document.querySelectorAll('[data-testid*="task"], .task-node');
    const hasRealData = Array.from(document.querySelectorAll('*')).some(el => 
      el.textContent.includes('No Task Selected') || 
      el.textContent.includes('Demo')
    );
    
    return {
      url: window.location.href,
      hasTaskNodes: taskElements.length,
      showsNoTaskMessage: document.body.textContent.includes('No Task Selected'),
      hasDemoButton: !!Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Start New Onboarding')
      ),
      isUsingMockData: document.body.textContent.includes('Demo') || 
                       document.body.textContent.includes('demo')
    };
  });
  
  console.log('\n🔧 Dev Toolkit State:');
  console.log('  URL:', devToolkitState.url);
  console.log('  Task Nodes:', devToolkitState.hasTaskNodes);
  console.log('  Shows "No Task":', devToolkitState.showsNoTaskMessage);
  console.log('  Has Demo Button:', devToolkitState.hasDemoButton);
  console.log('  Using Mock Data:', devToolkitState.isUsingMockData);
  
  await page.screenshot({ 
    path: 'dev-toolkit-check.png',
    fullPage: true 
  });
  console.log('\n📸 Screenshot saved: dev-toolkit-check.png');
  
  await browser.close();
  
  console.log('\n✅ Check complete!');
})();

// Polyfill for older Puppeteer
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}