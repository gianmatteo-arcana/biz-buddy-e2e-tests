#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🎯 Testing Dashboard Stability After Sign-In\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  // Use stored auth state for authenticated session
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  const page = await context.newPage();
  
  try {
    // Navigate to the deployed Lovable URL
    console.log('1. Loading app on Lovable...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for app to be ready
    console.log('2. Waiting for app to be ready...');
    await page.waitForSelector('[data-app-ready="true"]', { timeout: 10000 });
    
    // Check if user is authenticated
    const isAuthenticated = await page.getAttribute('body', 'data-auth-ready');
    console.log(`3. Authentication status: ${isAuthenticated === 'true' ? '✅ Authenticated' : '❌ Not authenticated'}`);
    
    if (isAuthenticated === 'true') {
      // Wait for Dashboard to load
      console.log('4. Waiting for Dashboard to load...');
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      
      // Check if Dashboard is loaded and visible
      const dashboardLoaded = await page.getAttribute('[data-testid="dashboard"]', 'data-loaded');
      console.log(`5. Dashboard loaded: ${dashboardLoaded === 'true' ? '✅ Yes' : '⏳ Still loading'}`);
      
      // Wait a few seconds to see if Dashboard disappears
      console.log('6. Monitoring Dashboard stability for 5 seconds...');
      await page.waitForTimeout(5000);
      
      // Check if Dashboard is still visible
      const dashboardStillVisible = await page.isVisible('[data-testid="dashboard"]');
      console.log(`7. Dashboard still visible after 5 seconds: ${dashboardStillVisible ? '✅ Yes' : '❌ No - Dashboard disappeared!'}`);
      
      // Check what's actually visible on the page
      const visibleContent = await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]');
        const taskFlow = document.querySelector('[data-testid="task-flow"]');
        const blankScreen = !dashboard && !taskFlow && document.body.textContent.trim() === '';
        
        return {
          hasDashboard: !!dashboard,
          hasTaskFlow: !!taskFlow,
          isBlankScreen: blankScreen,
          visibleText: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5).map(el => el.textContent.trim())
        };
      });
      
      console.log('\n📊 Page State Analysis:');
      console.log(`  Dashboard visible: ${visibleContent.hasDashboard ? '✅' : '❌'}`);
      console.log(`  TaskFlow visible: ${visibleContent.hasTaskFlow ? '✅' : '❌'}`);
      console.log(`  Blank screen: ${visibleContent.isBlankScreen ? '❌ YES - This is the bug!' : '✅ No'}`);
      console.log('  Visible headings:', visibleContent.visibleText);
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'dashboard-stability-test.png',
        fullPage: true 
      });
      console.log('\n📸 Screenshot saved: dashboard-stability-test.png');
      
      // Final verdict
      if (dashboardStillVisible && visibleContent.hasDashboard) {
        console.log('\n✅ SUCCESS: Dashboard remains stable after sign-in!');
      } else if (visibleContent.hasTaskFlow) {
        console.log('\n⚠️ ISSUE: Dashboard was replaced by TaskFlow (onboarding)');
      } else if (visibleContent.isBlankScreen) {
        console.log('\n❌ BUG CONFIRMED: Dashboard disappeared leaving blank screen!');
      }
      
    } else {
      console.log('⚠️ User not authenticated - cannot test Dashboard stability');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();