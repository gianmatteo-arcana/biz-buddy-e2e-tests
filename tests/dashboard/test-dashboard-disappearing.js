#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🎯 Testing Dashboard Disappearing Issue\n');
  console.log('This test will authenticate and monitor the Dashboard behavior\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // Slow down to see what's happening
  });
  
  // Use stored auth state for authenticated session
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('Index')) {
      console.log('📝 Console:', msg.text());
    }
  });
  
  try {
    // Navigate to the app
    console.log('1. Loading app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'dashboard-test-01-initial.png',
      fullPage: true 
    });
    console.log('📸 Initial load screenshot saved');
    
    // Wait for app to be ready
    console.log('2. Waiting for app to be ready...');
    try {
      await page.waitForSelector('[data-app-ready="true"]', { timeout: 10000 });
      console.log('✅ App is ready');
    } catch (e) {
      console.log('⚠️ App ready signal not found, continuing...');
    }
    
    // Check authentication status
    const authStatus = await page.evaluate(() => {
      return {
        hasUser: !!window.localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token'),
        bodyAttr: document.body.getAttribute('data-auth-ready'),
        welcomeText: document.body.textContent.includes('Welcome back') || 
                     document.body.textContent.includes('Welcome,')
      };
    });
    console.log('3. Auth status:', authStatus);
    
    // Monitor for Dashboard appearance
    console.log('4. Monitoring for Dashboard...');
    let dashboardFound = false;
    let dashboardDisappeared = false;
    let iterations = 0;
    const maxIterations = 20; // 10 seconds with 500ms intervals
    
    while (iterations < maxIterations) {
      const state = await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]');
        const taskFlow = document.querySelector('[data-testid="task-flow"]');
        const welcomeCard = document.querySelector('[class*="WelcomeCard"]');
        const chatInterface = document.querySelector('[class*="ChatInterface"]');
        const signInButton = document.querySelector('button[class*="google"]');
        
        // Check for blank screen
        const mainContent = document.querySelector('main') || document.body;
        const hasVisibleContent = mainContent.textContent.trim().length > 100;
        
        return {
          hasDashboard: !!dashboard,
          hasTaskFlow: !!taskFlow,
          hasWelcomeCard: !!welcomeCard,
          hasChatInterface: !!chatInterface,
          hasSignInButton: !!signInButton,
          hasVisibleContent,
          bodyText: document.body.textContent.substring(0, 200),
          url: window.location.href
        };
      });
      
      console.log(`   Iteration ${iterations + 1}:`, {
        dashboard: state.hasDashboard ? '✅' : '❌',
        content: state.hasVisibleContent ? '✅' : '❌',
        taskFlow: state.hasTaskFlow ? '✅' : '❌',
        signIn: state.hasSignInButton ? '✅' : '❌'
      });
      
      // Track Dashboard appearance and disappearance
      if (state.hasDashboard && !dashboardFound) {
        console.log('   ✅ Dashboard appeared!');
        dashboardFound = true;
        await page.screenshot({ 
          path: 'dashboard-test-dashboard-visible.png',
          fullPage: true 
        });
      }
      
      if (dashboardFound && !state.hasDashboard && !state.hasVisibleContent) {
        console.log('   ❌ Dashboard disappeared! Blank screen detected!');
        dashboardDisappeared = true;
        await page.screenshot({ 
          path: 'dashboard-test-blank-screen.png',
          fullPage: true 
        });
        break;
      }
      
      await page.waitForTimeout(500);
      iterations++;
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'dashboard-test-final.png',
      fullPage: true 
    });
    console.log('📸 Final screenshot saved');
    
    // Get console errors
    const errors = await page.evaluate(() => {
      const logs = [];
      // Try to capture any error messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
      errorElements.forEach(el => logs.push(el.textContent));
      return logs;
    });
    
    if (errors.length > 0) {
      console.log('\n⚠️ Error messages found:', errors);
    }
    
    // Final analysis
    console.log('\n📊 Test Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (dashboardDisappeared) {
      console.log('❌ BUG CONFIRMED: Dashboard disappears after initial load!');
      console.log('   The Dashboard was visible initially but then disappeared.');
      console.log('   This confirms the user-reported issue.');
    } else if (dashboardFound) {
      console.log('✅ Dashboard remained stable during test');
    } else {
      console.log('⚠️ Dashboard never appeared - authentication may have failed');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();