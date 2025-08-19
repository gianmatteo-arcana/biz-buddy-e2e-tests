/**
 * Create a real onboarding task in the database
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:8085';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Create timestamp for unique run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const screenshotDir = path.join(__dirname, `test-create-task-${timestamp}`);

async function captureScreenshot(page, stepName, stepNumber) {
  const filename = `${String(stepNumber).padStart(2, '0')}-${stepName}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Captured: ${filename}`);
  return filepath;
}

async function createRealOnboardingTask() {
  console.log('🚀 Creating Real Onboarding Task');
  console.log(`📁 Screenshots will be saved to: ${screenshotDir}`);
  
  // Create screenshot directory
  await fs.mkdir(screenshotDir, { recursive: true });
  
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    // Load existing auth state
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Task') || text.includes('created') || text.includes('onboarding')) {
      console.log('📝 Relevant log:', text);
    }
  });
  
  try {
    // Step 1: Get auth token from localStorage
    console.log('\n🔐 Step 1: Getting authentication token...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    
    const authToken = await page.evaluate(() => {
      const authKey = 'sb-raenkewzlvrdqufwxjpl-auth-token';
      const authData = localStorage.getItem(authKey);
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.access_token;
      }
      return null;
    });
    
    if (!authToken) {
      throw new Error('No authentication token found. Please run authentication first.');
    }
    
    console.log('✅ Got authentication token');
    
    // Step 2: Call backend API to create onboarding task
    console.log('\n🎯 Step 2: Creating onboarding task via backend API...');
    
    const taskResponse = await fetch(`${BACKEND_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskType: 'user_onboarding',
        title: 'Complete Business Onboarding',
        description: 'Set up your business profile and get started with SmallBizAlly',
        metadata: {
          source: 'e2e_test',
          createdBy: 'test_script',
          templateId: 'user_onboarding'
        }
      })
    });
    
    if (!taskResponse.ok) {
      const error = await taskResponse.text();
      console.error('❌ Failed to create task:', taskResponse.status, error);
      throw new Error(`Task creation failed: ${taskResponse.status}`);
    }
    
    const taskData = await taskResponse.json();
    console.log('✅ Task created successfully!');
    console.log('📋 Task ID:', taskData.id || taskData.task?.id || taskData.contextId);
    console.log('📋 Task Type:', taskData.taskType || taskData.task?.task_type);
    console.log('📋 Status:', taskData.status || taskData.task?.status);
    
    // Step 3: Navigate to Dev Toolkit to see the task
    console.log('\n🛠️ Step 3: Opening Dev Toolkit to view task...');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check if we're authenticated
    const isAuthenticated = await page.locator('text=Authenticated as:').isVisible().catch(() => false);
    console.log(`📊 Dev Toolkit Authentication: ${isAuthenticated ? 'Authenticated' : 'Demo Mode'}`);
    
    await captureScreenshot(page, 'dev-toolkit-with-task', 1);
    
    // Step 4: Check if task appears in the dropdown
    console.log('\n🔍 Step 4: Looking for task in selector...');
    
    // Look for task selector
    const taskSelector = page.locator('[data-testid="task-selector"]').first();
    const hasSelectorVisible = await taskSelector.isVisible().catch(() => false);
    
    if (hasSelectorVisible) {
      console.log('✅ Found task selector');
      
      // Open the selector to see available tasks
      await taskSelector.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, 'task-selector-open', 2);
      
      // Check if our task is there
      const taskOptions = await taskSelector.locator('option').allTextContents();
      console.log('📋 Available tasks:', taskOptions);
      
      if (taskOptions.some(t => t.includes('Onboarding'))) {
        console.log('✅ Onboarding task found in selector!');
      }
    } else {
      console.log('⚠️ Task selector not visible');
    }
    
    // Step 5: Check main dashboard for the task
    console.log('\n📊 Step 5: Checking main dashboard...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Look for task cards
    const taskCards = await page.locator('[data-testid*="task"]').count();
    console.log(`📋 Found ${taskCards} task card(s) on dashboard`);
    
    await captureScreenshot(page, 'dashboard-with-task', 3);
    
    // Generate summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 TASK CREATION SUMMARY');
    console.log('='.repeat(80));
    console.log('✅ Task created successfully via backend API');
    console.log(`✅ Task ID: ${taskData.id || taskData.task?.id || 'Check response'}`);
    console.log(`✅ Authentication: ${isAuthenticated ? 'Valid' : 'Demo Mode'}`);
    console.log(`✅ Task Cards on Dashboard: ${taskCards}`);
    console.log(`\n📸 Screenshots saved to: ${screenshotDir}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await captureScreenshot(page, 'error-state', 99);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
createRealOnboardingTask()
  .then(() => {
    console.log('\n✅ Task creation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Task creation failed:', error);
    process.exit(1);
  });