/**
 * Test Dev Toolkit Task Creation
 * 
 * Tests if the Dev Toolkit can create tasks in the database
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8085';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Create timestamp for unique run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const screenshotDir = path.join(__dirname, `test-devtoolkit-${timestamp}`);

async function captureScreenshot(page, stepName, stepNumber) {
  const filename = `${String(stepNumber).padStart(2, '0')}-${stepName}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Captured: ${filename}`);
  return filepath;
}

async function testDevToolkitTaskCreation() {
  console.log('🚀 Testing Dev Toolkit Task Creation');
  console.log(`📁 Screenshots will be saved to: ${screenshotDir}`);
  
  // Create screenshot directory
  await fs.mkdir(screenshotDir, { recursive: true });
  
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    // Try to load existing auth state if available
    ...(await fs.access('.auth/user-state.json').then(() => ({ 
      storageState: '.auth/user-state.json' 
    })).catch(() => ({})))
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('X-Frame-Options')) {
      console.error('❌ Browser console error:', text);
    } else if (text.includes('Task') || text.includes('task')) {
      console.log('📝 Task-related log:', text);
    }
  });
  
  try {
    // Step 1: Navigate to Dev Toolkit
    console.log('\n🛠️ Step 1: Opening Dev Toolkit...');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'dev-toolkit-initial', 1);
    
    // Step 2: Check if we're in demo mode
    const demoMode = await page.locator('text=Demo Mode').isVisible().catch(() => false);
    console.log(`📊 Mode: ${demoMode ? 'Demo Mode' : 'Authenticated'}`);
    
    // Step 3: Try to find and click the Create Task button/dropdown
    console.log('\n🎯 Step 3: Looking for Create Task controls...');
    
    // Look for the task creation dropdown
    const createTaskDropdown = page.locator('button:has-text("Select template")').first();
    const dropdownExists = await createTaskDropdown.isVisible().catch(() => false);
    
    if (dropdownExists) {
      console.log('✅ Found task creation dropdown');
      await captureScreenshot(page, 'task-dropdown-found', 2);
      
      // Click the dropdown to see templates
      await createTaskDropdown.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, 'task-dropdown-open', 3);
      
      // Look for onboarding template
      const onboardingOption = page.locator('text=Complete Business Onboarding').first();
      const hasOnboarding = await onboardingOption.isVisible().catch(() => false);
      
      if (hasOnboarding) {
        console.log('✅ Found onboarding template option');
        await onboardingOption.click();
        await page.waitForTimeout(500);
        await captureScreenshot(page, 'onboarding-selected', 4);
        
        // Look for the Live button to create the task
        const liveButton = page.locator('button:has-text("Live")').first();
        const canCreate = await liveButton.isEnabled().catch(() => false);
        
        if (canCreate) {
          console.log('🚀 Attempting to create live task...');
          await liveButton.click();
          await page.waitForTimeout(2000);
          await captureScreenshot(page, 'task-created', 5);
          
          // Check if task appeared in the introspection view
          const taskIntrospection = await page.locator('[data-testid*="task"]').first().isVisible().catch(() => false);
          if (taskIntrospection) {
            console.log('✅ Task created and visible in introspection!');
            await captureScreenshot(page, 'task-in-introspection', 6);
          } else {
            console.log('⚠️ Task may have been created but not visible in UI');
          }
        } else {
          console.log('⚠️ Live button is disabled - authentication may be required');
          await captureScreenshot(page, 'live-button-disabled', 5);
        }
      } else {
        console.log('❌ No onboarding template found in dropdown');
      }
    } else {
      console.log('❌ Create Task dropdown not found');
      await captureScreenshot(page, 'no-task-controls', 2);
    }
    
    // Step 4: Check for any error messages
    console.log('\n🔍 Step 4: Checking for error messages...');
    const errorMessage = await page.locator('text=Error').first().isVisible().catch(() => false);
    const failedMessage = await page.locator('text=Failed').first().isVisible().catch(() => false);
    
    if (errorMessage || failedMessage) {
      console.log('❌ Error messages found on page');
      await captureScreenshot(page, 'error-state', 7);
      
      // Try to get more details about the error
      const errorText = await page.locator('text=/Error|Failed/').first().textContent().catch(() => 'Unknown error');
      console.log('Error details:', errorText);
    }
    
    // Step 5: Check backend health
    console.log('\n🔧 Step 5: Checking backend connection...');
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const health = await response.json();
      console.log('✅ Backend health:', health);
    } catch (err) {
      console.log('❌ Backend not responding:', err.message);
    }
    
    // Generate summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST SUMMARY: Dev Toolkit Task Creation');
    console.log('='.repeat(80));
    console.log(`Mode: ${demoMode ? 'Demo Mode' : 'Authenticated'}`);
    console.log(`Task Dropdown Found: ${dropdownExists ? 'Yes' : 'No'}`);
    console.log(`Onboarding Template Available: ${dropdownExists ? 'Check screenshots' : 'N/A'}`);
    console.log(`Errors Detected: ${errorMessage || failedMessage ? 'Yes' : 'No'}`);
    console.log(`\n📸 Screenshots saved to: ${screenshotDir}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await captureScreenshot(page, 'test-error', 99);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testDevToolkitTaskCreation()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });