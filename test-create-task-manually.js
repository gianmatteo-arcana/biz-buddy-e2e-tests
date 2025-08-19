/**
 * Manual Task Creation Test
 * Opens Dev Toolkit and allows manual interaction to create task
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8085';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Create timestamp for unique run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const screenshotDir = path.join(__dirname, `test-manual-task-${timestamp}`);

async function captureScreenshot(page, stepName, stepNumber) {
  const filename = `${String(stepNumber).padStart(2, '0')}-${stepName}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Captured: ${filename}`);
  return filepath;
}

async function manualTaskCreation() {
  console.log('🚀 Manual Task Creation Test');
  console.log(`📁 Screenshots: ${screenshotDir}`);
  
  await fs.mkdir(screenshotDir, { recursive: true });
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DevToolkit') || text.includes('auth') || text.includes('Auth')) {
      console.log('📝 Log:', text);
    }
  });
  
  try {
    // Step 1: Navigate to Dev Toolkit
    console.log('\n🔧 Opening Dev Toolkit...');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Inject authentication check
    const authStatus = await page.evaluate(() => {
      const authKey = 'sb-raenkewzlvrdqufwxjpl-auth-token';
      const authData = localStorage.getItem(authKey);
      
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          return {
            hasToken: !!parsed.access_token,
            hasUser: !!parsed.user,
            email: parsed.user?.email,
            tokenLength: parsed.access_token?.length
          };
        } catch (e) {
          return { error: 'Parse error' };
        }
      }
      return { error: 'No auth data' };
    });
    
    console.log('🔐 Authentication status:', authStatus);
    
    // Force authentication state
    await page.evaluate(() => {
      // Try to trigger a re-render with authentication
      const authKey = 'sb-raenkewzlvrdqufwxjpl-auth-token';
      const authData = localStorage.getItem(authKey);
      
      if (authData) {
        // Dispatch storage event to trigger listeners
        window.dispatchEvent(new StorageEvent('storage', {
          key: authKey,
          newValue: authData,
          url: window.location.href
        }));
      }
      
      // Log current state
      console.log('[Manual] Auth data present:', !!authData);
    });
    
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'initial-state', 1);
    
    // Check if authenticated badge is showing
    const isAuthenticated = await page.locator('text=✅ Authenticated').isVisible().catch(() => false);
    const isDemoMode = await page.locator('text=Demo Mode').isVisible().catch(() => false);
    
    console.log(`\n📊 UI Status:`);
    console.log(`  Authenticated badge: ${isAuthenticated ? '✅' : '❌'}`);
    console.log(`  Demo mode: ${isDemoMode ? '⚠️ Yes' : '✅ No'}`);
    
    // Check dropdown state
    const dropdown = page.locator('button[role="combobox"]').first();
    const isDisabled = await dropdown.getAttribute('disabled');
    const ariaDisabled = await dropdown.getAttribute('aria-disabled');
    
    console.log(`\n🎯 Dropdown Status:`);
    console.log(`  Disabled attribute: ${isDisabled !== null ? '❌ Yes' : '✅ No'}`);
    console.log(`  Aria-disabled: ${ariaDisabled}`);
    
    if (isDisabled !== null || isDemoMode) {
      console.log('\n⚠️ ISSUE: Dropdown is disabled or in Demo Mode');
      console.log('📝 Despite having valid authentication in localStorage');
      
      // Try to manually enable the dropdown for testing
      console.log('\n🔧 Attempting to manually enable dropdown...');
      
      await page.evaluate(() => {
        const dropdown = document.querySelector('button[role="combobox"]');
        if (dropdown) {
          dropdown.removeAttribute('disabled');
          dropdown.removeAttribute('data-disabled');
          dropdown.removeAttribute('aria-disabled');
          console.log('[Manual] Dropdown attributes removed');
        }
        
        // Also try to force authenticated state
        const demoModeEl = document.querySelector('[data-testid="demo-mode-indicator"]');
        if (demoModeEl) {
          demoModeEl.style.display = 'none';
        }
      });
      
      await captureScreenshot(page, 'manually-enabled', 2);
    }
    
    // Now try to create a task
    console.log('\n🎯 MANUAL INTERACTION TIME!');
    console.log('=====================================');
    console.log('📋 INSTRUCTIONS:');
    console.log('1. Click on the dropdown "Select template..."');
    console.log('2. Select "Onboarding" from the list');
    console.log('3. Watch for the task to be created');
    console.log('');
    console.log('⏰ You have 60 seconds...');
    console.log('=====================================\n');
    
    // Wait for manual interaction
    await page.waitForTimeout(60000);
    
    // Capture final state
    await captureScreenshot(page, 'after-manual-interaction', 3);
    
    // Check if task was created
    const createdTaskBadge = await page.locator('text=/Task:.*[a-f0-9]{8}/').isVisible().catch(() => false);
    const errorMessage = await page.locator('text=Task Creation Failed').isVisible().catch(() => false);
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('==================');
    console.log(`Task created: ${createdTaskBadge ? '✅ SUCCESS!' : '❌ No task badge found'}`);
    console.log(`Error shown: ${errorMessage ? '❌ Yes' : '✅ No'}`);
    
    if (createdTaskBadge) {
      const taskId = await page.locator('text=/Task:.*[a-f0-9]{8}/').textContent();
      console.log(`Task ID: ${taskId}`);
    }
    
    console.log(`\n📸 Screenshots saved to: ${screenshotDir}`);
    
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
manualTaskCreation()
  .then(() => {
    console.log('\n✅ Manual test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Manual test failed:', error);
    process.exit(1);
  });