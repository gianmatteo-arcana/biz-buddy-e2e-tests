/**
 * Test Task Creation with Authenticated Dev Toolkit
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8085';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Create timestamp for unique run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const screenshotDir = path.join(__dirname, `test-task-creation-${timestamp}`);

async function captureScreenshot(page, stepName, stepNumber) {
  const filename = `${String(stepNumber).padStart(2, '0')}-${stepName}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Captured: ${filename}`);
  return filepath;
}

async function testTaskCreation() {
  console.log('🚀 Testing Task Creation in Dev Toolkit');
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
    if (text.includes('DevToolkit') || text.includes('Task') || text.includes('created')) {
      console.log('📝 Log:', text);
    }
  });
  
  try {
    // Step 1: Navigate to Dev Toolkit
    console.log('\n🔧 Step 1: Opening Dev Toolkit...');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await captureScreenshot(page, 'dev-toolkit-loaded', 1);
    
    // Check authentication status
    const isAuthenticated = await page.locator('text=Authenticated as:').isVisible().catch(() => false);
    const authenticatedBadge = await page.locator('text=✅ Authenticated').isVisible().catch(() => false);
    
    console.log(`📊 Authentication Status:`);
    console.log(`  Top bar auth: ${isAuthenticated ? '✅' : '❌'}`);
    console.log(`  Auth badge: ${authenticatedBadge ? '✅' : '❌'}`);
    
    if (!isAuthenticated && !authenticatedBadge) {
      console.log('⚠️ Not authenticated, but continuing...');
    }
    
    // Step 2: Click the Create Task dropdown
    console.log('\n🎯 Step 2: Creating task via dropdown...');
    
    // Find and click the dropdown
    const dropdown = page.locator('button[role="combobox"]').first();
    const isDisabled = await dropdown.getAttribute('disabled');
    
    if (isDisabled === null) {
      console.log('✅ Dropdown is enabled');
      
      await dropdown.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, 'dropdown-opened', 2);
      
      // Select "Onboarding" option
      const onboardingOption = page.locator('text=Onboarding');
      const hasOnboarding = await onboardingOption.isVisible().catch(() => false);
      
      if (hasOnboarding) {
        console.log('✅ Found Onboarding option');
        await onboardingOption.click();
        console.log('🎯 Clicked Onboarding - task should be creating...');
        
        // Wait for task creation
        await page.waitForTimeout(3000);
        await captureScreenshot(page, 'after-task-creation', 3);
        
        // Check for success indicators
        const taskBadge = await page.locator('text=/Task:.*[a-f0-9]{8}/').isVisible().catch(() => false);
        const errorToast = await page.locator('text=Task Creation Failed').isVisible().catch(() => false);
        const successToast = await page.locator('text=Task Created').isVisible().catch(() => false);
        
        console.log('\n📊 Task Creation Results:');
        console.log(`  Task badge visible: ${taskBadge ? '✅' : '❌'}`);
        console.log(`  Success toast: ${successToast ? '✅' : '❌'}`);
        console.log(`  Error toast: ${errorToast ? '❌ Error occurred' : '✅ No error'}`);
        
        if (taskBadge || successToast) {
          console.log('\n🎉 SUCCESS! Task created successfully!');
          
          // Try to get task ID
          const taskIdElement = page.locator('text=/Task:.*[a-f0-9]{8}/').first();
          if (await taskIdElement.isVisible()) {
            const taskText = await taskIdElement.textContent();
            console.log(`📋 ${taskText}`);
          }
        }
        
      } else {
        console.log('❌ Onboarding option not found in dropdown');
      }
      
    } else {
      console.log('❌ Dropdown is disabled');
      
      // Try to check why
      const demoMode = await page.locator('text=Demo Mode').isVisible().catch(() => false);
      const authRequired = await page.locator('text=Authentication required').isVisible().catch(() => false);
      
      if (demoMode) console.log('  Reason: Demo Mode active');
      if (authRequired) console.log('  Reason: Authentication required');
    }
    
    // Step 3: Check Task History tab
    console.log('\n📊 Step 3: Checking Task History...');
    await page.locator('text=Task History').click();
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'task-history-tab', 4);
    
    const taskCards = await page.locator('[data-testid*="task"]').count();
    console.log(`  Found ${taskCards} task(s) in history`);
    
    // Step 4: Final state
    await captureScreenshot(page, 'final-state', 5);
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Authentication: ${isAuthenticated || authenticatedBadge ? '✅ Authenticated' : '❌ Not authenticated'}`);
    console.log(`Dropdown enabled: ${isDisabled === null ? '✅' : '❌'}`);
    console.log(`Task created: Check screenshots for results`);
    console.log(`Screenshots: ${screenshotDir}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await captureScreenshot(page, 'error-state', 99);
  } finally {
    console.log('\n⏰ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testTaskCreation()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });