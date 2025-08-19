#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🎯 Testing Dashboard with Authenticated Session\n');
  
  // Check if auth state exists
  const authStatePath = '.auth/user-state.json';
  if (!fs.existsSync(authStatePath)) {
    console.error('❌ Auth state not found. Please run auth setup first.');
    process.exit(1);
  }
  
  console.log('✅ Using stored auth state from:', authStatePath);
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  // Load stored auth state
  const context = await browser.newContext({
    storageState: authStatePath
  });
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('Index') || msg.text().includes('Dashboard') || 
        msg.text().includes('ASYNC') || msg.text().includes('BACKGROUND')) {
      console.log(`📝 [${msg.type()}] ${msg.text()}`);
    }
  });
  
  try {
    console.log('1. Loading app with authenticated session...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'auth-test-01-initial.png',
      fullPage: true 
    });
    console.log('📸 Initial load screenshot saved');
    
    // Wait and check for app ready
    console.log('2. Waiting for app to stabilize...');
    await page.waitForTimeout(2000);
    
    // Monitor Dashboard appearance and disappearance
    console.log('3. Monitoring Dashboard behavior...\n');
    
    let dashboardFound = false;
    let dashboardDisappeared = false;
    const maxChecks = 30; // 15 seconds with 500ms intervals
    
    for (let i = 0; i < maxChecks; i++) {
      const state = await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]');
        const loading = document.body.textContent.includes('Loading');
        const welcomeBack = document.body.textContent.includes('Welcome back');
        const userEmail = document.body.textContent.includes('gianmatteo');
        const signInButton = !!document.querySelector('button[class*="google"]');
        const blankScreen = document.body.textContent.trim().length < 100;
        
        // Get more specific Dashboard indicators
        const hasWelcomeCard = !!document.querySelector('[class*="WelcomeCard"]');
        const hasTaskGrid = !!document.querySelector('[class*="TaskGrid"]');
        const hasBackendStatus = !!document.querySelector('[class*="BackendStatus"]');
        
        return {
          hasDashboard: !!dashboard,
          hasWelcomeCard,
          hasTaskGrid,
          hasBackendStatus,
          isLoading: loading,
          welcomeBack,
          userEmail,
          signInButton,
          blankScreen,
          contentLength: document.body.textContent.trim().length,
          url: window.location.href
        };
      });
      
      const checkmark = state.hasDashboard ? '✅' : '❌';
      const status = [];
      if (state.isLoading) status.push('Loading');
      if (state.welcomeBack) status.push('Welcome');
      if (state.userEmail) status.push('User');
      if (state.blankScreen) status.push('BLANK!');
      
      console.log(`   Check ${i+1}: Dashboard ${checkmark} | ${status.join(', ')} | Content: ${state.contentLength} chars`);
      
      // Track Dashboard appearance
      if (state.hasDashboard && !dashboardFound) {
        console.log('\n   🎉 Dashboard APPEARED!');
        console.log(`      - Welcome Card: ${state.hasWelcomeCard ? '✅' : '❌'}`);
        console.log(`      - Task Grid: ${state.hasTaskGrid ? '✅' : '❌'}`);
        console.log(`      - Backend Status: ${state.hasBackendStatus ? '✅' : '❌'}`);
        dashboardFound = true;
        await page.screenshot({ 
          path: 'auth-test-dashboard-visible.png',
          fullPage: true 
        });
        console.log('   📸 Dashboard visible screenshot saved\n');
      }
      
      // Track Dashboard disappearance
      if (dashboardFound && !state.hasDashboard) {
        console.log('\n   ❌ CRITICAL: Dashboard DISAPPEARED!');
        console.log(`      - Content length: ${state.contentLength} chars`);
        console.log(`      - Blank screen: ${state.blankScreen ? 'YES!' : 'No'}`);
        console.log(`      - Sign-in button visible: ${state.signInButton ? 'YES (logged out?)' : 'No'}`);
        dashboardDisappeared = true;
        
        await page.screenshot({ 
          path: 'auth-test-dashboard-gone.png',
          fullPage: true 
        });
        console.log('   📸 Dashboard gone screenshot saved');
        
        // Get details about what's visible
        const visibleElements = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('h1, h2, h3, button'))
            .slice(0, 5)
            .map(el => ({
              tag: el.tagName,
              text: el.textContent?.trim().substring(0, 50)
            }));
        });
        
        console.log('   Visible elements:', visibleElements);
        break; // Stop monitoring after disappearance
      }
      
      await page.waitForTimeout(500);
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'auth-test-final.png',
      fullPage: true 
    });
    console.log('\n📸 Final screenshot saved');
    
    // Analysis
    console.log('\n📊 Test Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (dashboardDisappeared) {
      console.log('❌ BUG CONFIRMED: Dashboard disappeared after initial load!');
      console.log('   This confirms the user-reported issue.');
      console.log('   The Dashboard was visible but then vanished.');
    } else if (dashboardFound) {
      console.log('✅ Dashboard remained stable during the test');
    } else {
      console.log('⚠️ Dashboard never appeared');
      console.log('   Authentication may have failed or expired');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();