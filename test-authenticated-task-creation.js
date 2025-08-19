/**
 * AUTHENTICATED Task Creation Test
 * Ensures proper authentication before testing
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8085';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Create timestamp for unique run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const screenshotDir = path.join(__dirname, `test-authenticated-${timestamp}`);

async function captureScreenshot(page, stepName, stepNumber) {
  const filename = `${String(stepNumber).padStart(2, '0')}-${stepName}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Captured: ${filename}`);
  return filepath;
}

async function authenticatedTaskCreation() {
  console.log('🚀 AUTHENTICATED Task Creation Test');
  console.log(`📁 Screenshots: ${screenshotDir}`);
  
  await fs.mkdir(screenshotDir, { recursive: true });
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DevToolkit') || text.includes('auth') || text.includes('Task')) {
      console.log('📝', text.substring(0, 100));
    }
  });
  
  try {
    // Step 1: First authenticate on main app
    console.log('\n🔐 Step 1: Authenticating on main app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if we need to sign in
    const needsAuth = await page.locator('text=Sign in with Google').isVisible().catch(() => false);
    
    if (needsAuth) {
      console.log('🔐 Need to authenticate - clicking sign in...');
      await page.locator('text=Sign in with Google').click();
      
      // Wait for OAuth flow
      console.log('⏳ Complete OAuth flow in browser...');
      console.log('   1. Select account: gianmatteo.allyn.test@gmail.com');
      console.log('   2. Complete authentication');
      console.log('   3. Wait for redirect back to app');
      
      // Wait for authentication to complete (look for welcome message)
      await page.waitForFunction(
        () => document.body.textContent?.includes('Welcome') || 
            document.body.textContent?.includes('Dashboard') ||
            document.body.textContent?.includes('Gianmatteo'),
        { timeout: 60000 }
      );
      
      console.log('✅ Authentication successful!');
    } else {
      console.log('✅ Already authenticated!');
    }
    
    // Get the auth token from localStorage
    const authData = await page.evaluate(() => {
      const authKey = 'sb-raenkewzlvrdqufwxjpl-auth-token';
      return localStorage.getItem(authKey);
    });
    
    if (!authData) {
      throw new Error('No auth token found after authentication!');
    }
    
    console.log('✅ Got auth token from localStorage');
    
    // Step 2: Navigate to Dev Toolkit with auth
    console.log('\n🔧 Step 2: Opening Dev Toolkit with authentication...');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    
    // Inject auth token into this page's localStorage
    await page.evaluate((token) => {
      localStorage.setItem('sb-raenkewzlvrdqufwxjpl-auth-token', token);
      console.log('[Manual] Injected auth token into localStorage');
      
      // Force a page reload to pick up the auth
      window.location.reload();
    }, authData);
    
    // Wait for reload
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await captureScreenshot(page, 'dev-toolkit-authenticated', 1);
    
    // Verify authentication
    const isAuthenticated = await page.locator('text=✅ Authenticated').isVisible().catch(() => false);
    const hasAuthEmail = await page.locator('text=gianmatteo.allyn.test@gmail.com').isVisible().catch(() => false);
    const isDemoMode = await page.locator('text=Demo Mode').isVisible().catch(() => false);
    
    console.log('\n📊 Authentication Status:');
    console.log(`  Authenticated badge: ${isAuthenticated ? '✅' : '❌'}`);
    console.log(`  User email shown: ${hasAuthEmail ? '✅' : '❌'}`);
    console.log(`  Demo mode: ${isDemoMode ? '❌ STILL IN DEMO MODE!' : '✅ Not in demo mode'}`);
    
    if (!isAuthenticated && !hasAuthEmail) {
      console.log('⚠️ WARNING: May not be properly authenticated!');
    }
    
    // Step 3: Create task via dropdown
    console.log('\n🎯 Step 3: Creating task via dropdown...');
    
    const dropdown = page.locator('button[role="combobox"]').first();
    const isDisabled = await dropdown.getAttribute('disabled');
    
    if (isDisabled === null) {
      console.log('✅ Dropdown is enabled - clicking...');
      await dropdown.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, 'dropdown-opened', 2);
      
      // Select Onboarding
      const onboardingOption = page.locator('text=Onboarding').first();
      if (await onboardingOption.isVisible()) {
        console.log('✅ Clicking Onboarding option...');
        await onboardingOption.click();
        
        // Wait for task creation
        console.log('⏳ Waiting for task to be created...');
        await page.waitForTimeout(5000);
        
        await captureScreenshot(page, 'after-task-creation', 3);
        
        // Check for success
        const taskBadge = await page.locator('text=/Task:.*[a-f0-9-]{8}/').isVisible().catch(() => false);
        const successToast = await page.locator('text=Task Created').isVisible().catch(() => false);
        
        if (taskBadge || successToast) {
          console.log('\n🎉 SUCCESS! Task created!');
          
          // Get task ID if visible
          try {
            const taskText = await page.locator('text=/Task:.*[a-f0-9-]{8}/').first().textContent();
            console.log(`📋 ${taskText}`);
          } catch (e) {
            // Task ID might not be visible
          }
        } else {
          console.log('❌ Task creation may have failed - check screenshots');
        }
      } else {
        console.log('❌ Onboarding option not found');
      }
    } else {
      console.log('❌ Dropdown is disabled!');
      console.log('   This means authentication is not working properly');
    }
    
    // Step 4: Check Task History
    console.log('\n📊 Step 4: Checking Task History tab...');
    await page.locator('text=Task History').click();
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'task-history', 4);
    
    // Step 5: Check Live Stream
    console.log('\n📊 Step 5: Checking Live Stream tab...');
    await page.locator('text=Live Stream').click();
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'live-stream', 5);
    
    // Final screenshot
    await page.locator('text=Agent Visualizer').click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'final-state', 6);
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST COMPLETE');
    console.log('='.repeat(80));
    console.log(`Authentication: ${isAuthenticated || hasAuthEmail ? '✅' : '❌'}`);
    console.log(`Task Creation: Check screenshots for results`);
    console.log(`Screenshots: ${screenshotDir}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await captureScreenshot(page, 'error-state', 99);
  } finally {
    console.log('\n⏰ Keeping browser open for inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

// Run the test
authenticatedTaskCreation()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });