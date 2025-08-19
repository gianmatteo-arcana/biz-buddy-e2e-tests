#!/usr/bin/env node

/**
 * Test Authentication Required Enforcement
 * Verifies that dev-toolkit-standalone shows Google sign-in when not authenticated
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8081';
const DEV_TOOLKIT_URL = `${BASE_URL}/dev-toolkit-standalone`;

async function createUnauthenticatedTest() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🔒 Dev Toolkit Authentication Required Test');
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log(`🌐 Testing URL: ${DEV_TOOLKIT_URL}`);
  console.log(`👤 Test Mode: Unauthenticated session\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = `auth-required-test-${timestamp}`;
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  // Create context WITHOUT auth state to simulate unauthenticated user
  const context = await browser.newContext();
  const page = await context.newPage();

  // Start capturing console logs immediately
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`${msg.type()}: ${text}`);
    if (text.includes('DevToolkitStandalone')) {
      console.log(`🎯 CONSOLE: ${text}`);
    }
  });

  // Clear all authentication data to ensure truly unauthenticated state
  await page.goto(DEV_TOOLKIT_URL);
  await page.evaluate(() => {
    // Clear all localStorage auth tokens
    localStorage.removeItem('sb-raenkewzlvrdqufwxjpl-auth-token');
    // Clear any other Supabase auth data
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    // Clear sessionStorage as well
    sessionStorage.clear();
  });
  
  // Reload page after clearing auth data with cache bypass
  await page.reload({ waitUntil: 'networkidle' });
  
  // Force another reload to ensure fresh code is loaded
  await page.goto(DEV_TOOLKIT_URL, { waitUntil: 'networkidle' });

  try {
    console.log('═══ STEP 1: LOAD DEV TOOLKIT WITHOUT AUTH ═══');
    console.log('────────────────────────────────────────────────────────────');
    await page.goto(DEV_TOOLKIT_URL);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Console logs are already being captured from page creation
    
    // Check localStorage state and component render state
    const authState = await page.evaluate(() => {
      const authKey = 'sb-raenkewzlvrdqufwxjpl-auth-token';
      const authData = localStorage.getItem(authKey);
      
      // Check what's actually rendered
      const authRequiredDiv = document.querySelector('[data-testid="dev-toolkit-auth-required"]');
      const devToolkitDiv = document.querySelector('[data-testid="dev-toolkit-standalone"]');
      const loadingDiv = document.querySelector('[data-testid="dev-toolkit-loading"]');
      
      return {
        authData: authData,
        allKeys: Object.keys(localStorage),
        hasAuthKey: !!authData,
        rendered: {
          authRequired: !!authRequiredDiv,
          devToolkit: !!devToolkitDiv,
          loading: !!loadingDiv
        }
      };
    });
    
    console.log('🔍 Debug Info:');
    console.log(`   📦 localStorage auth data: ${authState.hasAuthKey ? 'Present' : 'Cleared'}`);
    console.log(`   🗝️ localStorage keys: ${authState.allKeys.join(', ')}`);
    console.log(`   🎭 Rendered components:`);
    console.log(`      Auth Required: ${authState.rendered.authRequired ? '✅' : '❌'}`);
    console.log(`      Dev Toolkit: ${authState.rendered.devToolkit ? '✅' : '❌'}`);
    console.log(`      Loading: ${authState.rendered.loading ? '✅' : '❌'}`);
    console.log(`   📄 Recent console logs: ${consoleLogs.slice(-5).join(' | ')}`);
    console.log('');
    
    // Check for authentication required screen
    const authRequiredScreen = await page.locator('[data-testid="dev-toolkit-auth-required"]').count();
    const signInButton = await page.locator('button:has-text("Sign in with Google")').count();
    
    console.log(`🔒 Authentication Required Screen: ${authRequiredScreen > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`🔘 Google Sign-in Button: ${signInButton > 0 ? '✅ Found' : '❌ Missing'}`);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-auth-required-screen.png'),
      fullPage: true 
    });
    console.log('📸 [1] Authentication required screen captured');

    console.log('\n═══ STEP 2: VERIFY NO DEMO MODE ═══');
    console.log('────────────────────────────────────────────────────────────');
    
    // Check that there's no demo mode indicator
    const demoModeIndicator = await page.locator('text=Demo Mode').count();
    const limitedFunctionality = await page.locator('text=Limited functionality').count();
    
    console.log(`❌ Demo Mode Indicator: ${demoModeIndicator === 0 ? '✅ Removed' : '⚠️ Still present'}`);
    console.log(`❌ Limited Functionality Text: ${limitedFunctionality === 0 ? '✅ Removed' : '⚠️ Still present'}`);

    console.log('\n═══ STEP 3: VERIFY AUTH MESSAGE ═══');
    console.log('────────────────────────────────────────────────────────────');
    
    // Check for the correct authentication message
    const authTitle = await page.locator('h1:has-text("Authentication Required")').count();
    const authDescription = await page.locator('text=Dev Toolkit requires authentication').count();
    
    console.log(`📝 Auth Required Title: ${authTitle > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`📄 Auth Description: ${authDescription > 0 ? '✅ Found' : '❌ Missing'}`);

    await page.screenshot({ 
      path: path.join(screenshotDir, '02-full-auth-screen.png'),
      fullPage: true 
    });
    console.log('📸 [2] Full authentication screen captured');

    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log('✅ AUTHENTICATION ENFORCEMENT TEST RESULTS:');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    console.log('');
    
    const results = {
      authRequiredScreen: authRequiredScreen > 0,
      signInButton: signInButton > 0,
      demoModeRemoved: demoModeIndicator === 0,
      authMessagePresent: authTitle > 0 && authDescription > 0
    };
    
    console.log('📊 TEST RESULTS:');
    console.log(`   🔒 Auth Required Screen: ${results.authRequiredScreen ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🔘 Google Sign-in Button: ${results.signInButton ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ❌ Demo Mode Removed: ${results.demoModeRemoved ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   📝 Auth Message Present: ${results.authMessagePresent ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(Boolean);
    console.log('');
    console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('🎉 SUCCESS: Demo mode successfully removed, authentication now required!');
    } else {
      console.log('⚠️ ISSUES: Some authentication enforcement features not working as expected');
    }

    // Keep browser open for verification
    console.log('\n⏰ Browser will remain open for 15 seconds for manual verification...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: path.join(screenshotDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
    console.log('🚪 Browser closed');
  }
}

if (require.main === module) {
  createUnauthenticatedTest().catch(console.error);
}

module.exports = { createUnauthenticatedTest };