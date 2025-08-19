#!/usr/bin/env node

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Live Dashboard Monitoring\n');
  console.log('Please sign in manually when the browser opens.\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Index') || text.includes('Dashboard') || text.includes('ASYNC') || text.includes('BACKGROUND')) {
      console.log(`📝 [${new Date().toISOString().split('T')[1].split('.')[0]}] ${text}`);
    }
  });
  
  // Go to the app
  console.log('Opening app...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  console.log('\nMonitoring Dashboard behavior... (Please sign in now)\n');
  console.log('Legend: 🟢 = Dashboard visible, 🔴 = Dashboard missing, 🟡 = Loading\n');
  
  let lastState = {};
  let dashboardWasVisible = false;
  let screenshotCount = 0;
  
  // Monitor every 500ms
  const monitor = setInterval(async () => {
    try {
      const state = await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]');
        const loading = document.querySelector('[class*="loading"], [class*="Loading"]');
        const signInButton = document.querySelector('button[class*="google"]');
        const welcomeBack = document.body.textContent.includes('Welcome back');
        const blankScreen = document.body.textContent.trim().length < 100;
        
        return {
          hasDashboard: !!dashboard,
          isLoading: !!loading,
          hasSignInButton: !!signInButton,
          welcomeBack,
          blankScreen,
          url: window.location.href,
          bodyLength: document.body.textContent.trim().length
        };
      });
      
      // Detect state changes
      if (JSON.stringify(state) !== JSON.stringify(lastState)) {
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        
        // Dashboard appeared
        if (state.hasDashboard && !dashboardWasVisible) {
          console.log(`\n🟢 [${time}] DASHBOARD APPEARED!`);
          dashboardWasVisible = true;
          await page.screenshot({ 
            path: `monitor-${++screenshotCount}-dashboard-appeared.png`,
            fullPage: true 
          });
        }
        
        // Dashboard disappeared
        if (!state.hasDashboard && dashboardWasVisible) {
          console.log(`\n🔴 [${time}] DASHBOARD DISAPPEARED!`);
          console.log(`   Body content length: ${state.bodyLength} chars`);
          console.log(`   Blank screen: ${state.blankScreen ? 'YES!' : 'No'}`);
          await page.screenshot({ 
            path: `monitor-${++screenshotCount}-dashboard-gone.png`,
            fullPage: true 
          });
          
          // Get more details about what's on the page
          const details = await page.evaluate(() => {
            const visibleElements = Array.from(document.querySelectorAll('*'))
              .filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.textContent.trim();
              })
              .slice(0, 5)
              .map(el => ({
                tag: el.tagName,
                class: el.className,
                text: el.textContent.substring(0, 50)
              }));
            
            return visibleElements;
          });
          
          console.log('   Visible elements:', details);
        }
        
        // Loading state
        if (state.isLoading) {
          console.log(`🟡 [${time}] Loading...`);
        }
        
        // Sign-in detected
        if (state.welcomeBack && !lastState.welcomeBack) {
          console.log(`\n✅ [${time}] User signed in!`);
        }
        
        lastState = state;
      }
    } catch (e) {
      // Page might be navigating
    }
  }, 500);
  
  // Keep running for 2 minutes
  setTimeout(() => {
    clearInterval(monitor);
    console.log('\n\nMonitoring complete. Screenshots saved.');
    console.log('Press Ctrl+C to exit...');
  }, 120000);
  
  // Keep browser open
  await page.waitForTimeout(300000);
  await browser.close();
})();

// Polyfill for older Puppeteer
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}