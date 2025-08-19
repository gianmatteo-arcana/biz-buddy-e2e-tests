#!/usr/bin/env node

const { chromium } = require('playwright');

(async () => {
  console.log('🎯 Manual Sign-In and Dashboard Monitor\n');
  console.log('INSTRUCTIONS:');
  console.log('1. Browser will open');
  console.log('2. Please sign in manually with Google');
  console.log('3. Watch the console output for Dashboard behavior\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable detailed console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Index') || text.includes('Dashboard') || text.includes('ASYNC') || text.includes('BACKGROUND')) {
      console.log(`📝 [${msg.type()}] ${text}`);
    }
  });
  
  try {
    // Navigate to the app
    console.log('Opening app...\n');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('Please sign in manually now...\n');
    console.log('Monitoring for Dashboard behavior after sign-in...\n');
    
    // Monitor continuously
    let dashboardFound = false;
    let dashboardDisappeared = false;
    let lastState = null;
    
    for (let i = 0; i < 120; i++) { // Monitor for 2 minutes
      const state = await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]');
        const welcomeCard = document.querySelector('h1')?.textContent || '';
        const isAuthenticated = document.body.getAttribute('data-auth-ready') === 'true';
        const hasContent = document.body.textContent.trim().length > 100;
        const isBlank = !hasContent || document.body.textContent.trim() === '';
        
        return {
          hasDashboard: !!dashboard,
          welcomeText: welcomeCard,
          isAuthenticated,
          hasContent,
          isBlank,
          url: window.location.href
        };
      });
      
      // Only log when state changes
      if (JSON.stringify(state) !== JSON.stringify(lastState)) {
        console.log(`\n⏱️ [${i}s] State changed:`);
        console.log(`   Authenticated: ${state.isAuthenticated ? '✅' : '❌'}`);
        console.log(`   Dashboard: ${state.hasDashboard ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
        console.log(`   Content: ${state.hasContent ? '✅' : '❌'}`);
        console.log(`   Blank: ${state.isBlank ? '⚠️ YES' : '✅ No'}`);
        if (state.welcomeText) console.log(`   Welcome: "${state.welcomeText}"`);
        
        // Track Dashboard appearance and disappearance
        if (state.hasDashboard && !dashboardFound) {
          console.log('\n🎉 Dashboard APPEARED!');
          dashboardFound = true;
          await page.screenshot({ 
            path: 'manual-test-dashboard-visible.png',
            fullPage: true 
          });
          console.log('📸 Screenshot saved: manual-test-dashboard-visible.png');
        }
        
        if (dashboardFound && !state.hasDashboard) {
          console.log('\n❌ CRITICAL: Dashboard DISAPPEARED!');
          dashboardDisappeared = true;
          await page.screenshot({ 
            path: 'manual-test-dashboard-gone.png',
            fullPage: true 
          });
          console.log('📸 Screenshot saved: manual-test-dashboard-gone.png');
          
          if (state.isBlank) {
            console.log('🚨 BLANK SCREEN DETECTED - This is the bug!');
          }
        }
        
        lastState = state;
      }
      
      await page.waitForTimeout(1000);
    }
    
    console.log('\n📊 Final Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (dashboardDisappeared) {
      console.log('❌ BUG CONFIRMED: Dashboard disappeared after appearing!');
    } else if (dashboardFound) {
      console.log('✅ Dashboard remained stable');
    } else {
      console.log('⚠️ Dashboard never appeared');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\nPress Ctrl+C to exit when done...');
    await page.waitForTimeout(300000); // Keep open for 5 minutes
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();