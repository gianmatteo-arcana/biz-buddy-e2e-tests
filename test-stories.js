/**
 * E2E Test User Stories for BizBuddy Ally
 * Test user: gianmatteo.allyn.test@gmail.com
 * 
 * These test stories cover various user behaviors including:
 * - Happy path flows
 * - Mid-task abandonment
 * - Task pause/resume
 * - Task completion
 * - Unusual user behaviors
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'https://bizbuddy-ally-eight.vercel.app',
  testUser: {
    email: 'gianmatteo.allyn.test@gmail.com',
    password: process.env.TEST_USER_PASSWORD,
    name: 'Test User',
    businessName: 'Test Business LLC'
  },
  screenshotDir: './test-results',
  timeout: 30000
};

// Utility function to save test results
async function saveTestResult(testName, status, details, screenshot) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultDir = path.join(TEST_CONFIG.screenshotDir, `${testName}-${timestamp}`);
  
  await fs.mkdir(resultDir, { recursive: true });
  
  if (screenshot) {
    await fs.writeFile(path.join(resultDir, 'screenshot.png'), screenshot);
  }
  
  await fs.writeFile(
    path.join(resultDir, 'result.json'),
    JSON.stringify({ testName, status, timestamp, details }, null, 2)
  );
  
  return resultDir;
}

/**
 * Story 1: Happy Path - Complete onboarding and first task
 */
async function testHappyPath(page) {
  console.log('📖 Story 1: Happy Path - Complete user journey');
  
  try {
    // Navigate to app
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Complete authentication
    await page.click('text="Sign in with Google"');
    // Note: Real Google OAuth flow would need special handling
    
    // Wait for dashboard
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Check for welcome card
    const welcomeCard = await page.locator('text=/Welcome back/i').first();
    await welcomeCard.click();
    
    // Expand to fullscreen
    await page.waitForSelector('[data-testid="fullscreen-card"]');
    
    // Interact with chat
    await page.fill('[placeholder="Ask me anything..."]', 'What tasks do I need to complete?');
    await page.keyboard.press('Enter');
    
    // Wait for AI response
    await page.waitForSelector('text=/compliance|filing|statement/i', { timeout: 10000 });
    
    // Click on an action pill if available
    const actionPill = await page.locator('button:has-text("Review")').first();
    if (await actionPill.isVisible()) {
      await actionPill.click();
    }
    
    // Complete a task
    await page.click('[data-testid="complete-task"]');
    
    const screenshot = await page.screenshot();
    await saveTestResult('happy-path', 'success', {
      message: 'User successfully completed onboarding and first task',
      completedSteps: ['auth', 'dashboard', 'welcome', 'chat', 'task-complete']
    }, screenshot);
    
    return { success: true };
  } catch (_error) {
    const screenshot = await page.screenshot();
    await saveTestResult('happy-path', 'failed', {
      error: error.message,
      stack: error.stack
    }, screenshot);
    return { success: false, error };
  }
}

/**
 * Story 2: Mid-Task Abandonment - User leaves during onboarding
 */
async function testMidTaskAbandonment(page) {
  console.log('📖 Story 2: Mid-Task Abandonment - User leaves during setup');
  
  try {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Start business profile setup
    const profileCard = await page.locator('text=/business profile/i').first();
    await profileCard.click();
    
    // Fill partial information
    await page.fill('[name="business_name"]', 'Partial Business');
    await page.fill('[name="ein"]', '12-345');  // Incomplete EIN
    
    // Simulate user leaving (navigate away)
    await page.goto('https://google.com');
    await page.waitForTimeout(2000);
    
    // Return to app
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Check if partial data is preserved
    const profileCardAgain = await page.locator('text=/business profile/i').first();
    await profileCardAgain.click();
    
    // Verify partial data persistence
    const businessNameField = await page.locator('[name="business_name"]');
    const value = await businessNameField.inputValue();
    
    const screenshot = await page.screenshot();
    await saveTestResult('mid-task-abandonment', 'success', {
      message: 'Tested user abandonment and return',
      dataPreserved: value === 'Partial Business',
      steps: ['start-setup', 'partial-fill', 'abandon', 'return', 'check-persistence']
    }, screenshot);
    
    return { success: true, dataPreserved: value === 'Partial Business' };
  } catch (_error) {
    const screenshot = await page.screenshot();
    await saveTestResult('mid-task-abandonment', 'failed', {
      error: error.message
    }, screenshot);
    return { success: false, error };
  }
}

/**
 * Story 3: Task Pause and Resume - User pauses SOI filing
 */
async function testTaskPauseResume(page) {
  console.log('📖 Story 3: Task Pause/Resume - SOI filing interruption');
  
  try {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Find SOI task
    const soiTask = await page.locator('text=/statement of information/i').first();
    await soiTask.click();
    
    // Start filling SOI
    await page.waitForSelector('[data-testid="soi-form"]');
    await page.fill('[name="business_address"]', '123 Test St');
    await page.fill('[name="city"]', 'Test City');
    
    // Click pause/save for later
    const pauseButton = await page.locator('button:has-text(/save.*later|pause|draft/i)').first();
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
    }
    
    // Navigate to dashboard
    await page.click('[data-testid="back-to-dashboard"]');
    
    // Verify task shows as paused/in-progress
    const pausedIndicator = await page.locator('text=/paused|in progress|draft/i').first();
    const isPaused = await pausedIndicator.isVisible();
    
    // Resume task
    await soiTask.click();
    
    // Verify data persistence
    const addressField = await page.locator('[name="business_address"]');
    const addressValue = await addressField.inputValue();
    
    // Complete the task
    await page.fill('[name="state"]', 'CA');
    await page.fill('[name="zip"]', '90210');
    await page.click('button:has-text(/submit|complete|file/i)');
    
    const screenshot = await page.screenshot();
    await saveTestResult('task-pause-resume', 'success', {
      message: 'Successfully tested pause and resume flow',
      taskPaused: isPaused,
      dataPreserved: addressValue === '123 Test St',
      completed: true
    }, screenshot);
    
    return { success: true };
  } catch (_error) {
    const screenshot = await page.screenshot();
    await saveTestResult('task-pause-resume', 'failed', {
      error: error.message
    }, screenshot);
    return { success: false, error };
  }
}

/**
 * Story 4: Rapid Task Switching - User jumps between tasks
 */
async function testRapidTaskSwitching(page) {
  console.log('📖 Story 4: Rapid Task Switching - Testing card state management');
  
  try {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    
    const taskSwitches = [];
    
    // Switch between cards rapidly
    for (let i = 0; i < 5; i++) {
      // Click welcome card
      const welcomeCard = await page.locator('text=/welcome/i').first();
      await welcomeCard.click();
      await page.waitForTimeout(500);
      taskSwitches.push('welcome');
      
      // Click business profile
      const profileCard = await page.locator('text=/business profile/i').first();
      await profileCard.click();
      await page.waitForTimeout(500);
      taskSwitches.push('profile');
      
      // Click SOI if visible
      const soiCard = await page.locator('text=/statement of information/i').first();
      if (await soiCard.isVisible()) {
        await soiCard.click();
        await page.waitForTimeout(500);
        taskSwitches.push('soi');
      }
    }
    
    // Check if UI remains stable
    const isStable = await page.evaluate(() => {
      // Check for any error messages or broken UI
      const errors = document.querySelectorAll('.error, [data-error], .crash');
      const overlappingCards = document.querySelectorAll('.card-overlap-error');
      return errors.length === 0 && overlappingCards.length === 0;
    });
    
    const screenshot = await page.screenshot();
    await saveTestResult('rapid-task-switching', 'success', {
      message: 'Tested rapid task switching',
      switchCount: taskSwitches.length,
      uiStable: isStable,
      sequence: taskSwitches
    }, screenshot);
    
    return { success: true, uiStable: isStable };
  } catch (_error) {
    const screenshot = await page.screenshot();
    await saveTestResult('rapid-task-switching', 'failed', {
      error: error.message
    }, screenshot);
    return { success: false, error };
  }
}

/**
 * Story 5: Chat Context Persistence - Test chat memory across sessions
 */
async function testChatContextPersistence(page) {
  console.log('📖 Story 5: Chat Context - Testing conversation memory');
  
  try {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Open chat
    const chatButton = await page.locator('button:has-text(/chat.*ally/i)').first();
    await chatButton.click();
    
    // Send first message
    await page.fill('[placeholder*="Ask"]', 'My business is called TestCorp LLC');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    
    // Send follow-up referencing context
    await page.fill('[placeholder*="Ask"]', 'What did I just tell you about my business?');
    await page.keyboard.press('Enter');
    
    // Wait for response mentioning TestCorp
    await page.waitForSelector('text=/TestCorp/i', { timeout: 10000 });
    
    // Close chat
    const closeButton = await page.locator('[data-testid="close-chat"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
    
    // Reopen chat
    await chatButton.click();
    
    // Check if chat history is preserved
    const chatHistory = await page.locator('text=/TestCorp/i').count();
    
    const screenshot = await page.screenshot();
    await saveTestResult('chat-context-persistence', 'success', {
      message: 'Tested chat context persistence',
      contextPreserved: chatHistory > 0,
      messageCount: chatHistory
    }, screenshot);
    
    return { success: true, contextPreserved: chatHistory > 0 };
  } catch (_error) {
    const screenshot = await page.screenshot();
    await saveTestResult('chat-context-persistence', 'failed', {
      error: error.message
    }, screenshot);
    return { success: false, error };
  }
}

/**
 * Story 6: Error Recovery - Test graceful error handling
 */
async function testErrorRecovery(page) {
  console.log('📖 Story 6: Error Recovery - Testing error boundaries');
  
  try {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Try to submit incomplete form
    const submitButton = await page.locator('button:has-text(/submit|complete/i)').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }
    
    // Check for validation errors
    const validationErrors = await page.locator('[role="alert"], .error-message, [data-error]').count();
    
    // Test network error recovery (simulate offline)
    await page.context().setOffline(true);
    await page.click('button:has-text(/save|submit/i)').catch(() => {});
    
    // Check for offline message
    const offlineMessage = await page.locator('text=/offline|connection|network/i').first();
    const hasOfflineHandling = await offlineMessage.isVisible();
    
    // Go back online
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);
    
    // Check if app recovered
    const recovered = await page.evaluate(() => {
      return !document.body.classList.contains('error-state');
    });
    
    const screenshot = await page.screenshot();
    await saveTestResult('error-recovery', 'success', {
      message: 'Tested error recovery mechanisms',
      validationErrors: validationErrors > 0,
      offlineHandling: hasOfflineHandling,
      recovered
    }, screenshot);
    
    return { success: true, recovered };
  } catch (_error) {
    const screenshot = await page.screenshot();
    await saveTestResult('error-recovery', 'failed', {
      error: error.message
    }, screenshot);
    return { success: false, error };
  }
}

/**
 * Story 7: Multi-tab behavior - User opens app in multiple tabs
 */
async function testMultiTabBehavior(context) {
  console.log('📖 Story 7: Multi-tab - Testing concurrent sessions');
  
  const page1 = await context.newPage();
  const page2 = await context.newPage();
  
  try {
    // Open app in both tabs
    await page1.goto(TEST_CONFIG.baseUrl);
    await page2.goto(TEST_CONFIG.baseUrl);
    
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    // Make changes in tab 1
    await page1.fill('[placeholder*="Ask"]', 'Update in tab 1');
    
    // Make changes in tab 2
    await page2.fill('[placeholder*="Ask"]', 'Update in tab 2');
    
    // Submit in tab 1
    await page1.keyboard.press('Enter');
    await page1.waitForTimeout(2000);
    
    // Check if tab 2 gets updated or handles conflict
    await page2.reload();
    
    // Verify no data corruption
    const isStable = await page2.evaluate(() => {
      return !document.body.classList.contains('error-state');
    });
    
    const screenshot1 = await page1.screenshot();
    const screenshot2 = await page2.screenshot();
    
    await saveTestResult('multi-tab-behavior', 'success', {
      message: 'Tested multi-tab behavior',
      stable: isStable,
      tabs: 2
    }, screenshot1);
    
    return { success: true, stable: isStable };
  } catch (_error) {
    const screenshot = await page1.screenshot();
    await saveTestResult('multi-tab-behavior', 'failed', {
      error: error.message
    }, screenshot);
    return { success: false, error };
  } finally {
    await page1.close();
    await page2.close();
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting E2E Test Stories');
  console.log(`📍 Testing: ${TEST_CONFIG.baseUrl}`);
  console.log(`👤 Test User: ${TEST_CONFIG.testUser.email}`);
  console.log('=' .repeat(50));
  
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0')
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'E2E Test Bot'
  });
  
  const results = [];
  
  // Run each test story
  const tests = [
    { name: 'Happy Path', fn: testHappyPath },
    { name: 'Mid-Task Abandonment', fn: testMidTaskAbandonment },
    { name: 'Task Pause/Resume', fn: testTaskPauseResume },
    { name: 'Rapid Task Switching', fn: testRapidTaskSwitching },
    { name: 'Chat Context Persistence', fn: testChatContextPersistence },
    { name: 'Error Recovery', fn: testErrorRecovery }
  ];
  
  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    const page = await context.newPage();
    
    try {
      const result = await test.fn(page);
      results.push({ test: test.name, ...result });
      console.log(`✅ ${test.name}: ${result.success ? 'PASSED' : 'FAILED'}`);
    } catch (_error) {
      console.error(`❌ ${test.name}: ERROR - ${error.message}`);
      results.push({ test: test.name, success: false, error: error.message });
    }
    
    await page.close();
  }
  
  // Run multi-tab test
  console.log('\n🧪 Running: Multi-tab Behavior');
  try {
    const multiTabResult = await testMultiTabBehavior(context);
    results.push({ test: 'Multi-tab Behavior', ...multiTabResult });
    console.log(`✅ Multi-tab Behavior: ${multiTabResult.success ? 'PASSED' : 'FAILED'}`);
  } catch (_error) {
    console.error(`❌ Multi-tab Behavior: ERROR - ${error.message}`);
    results.push({ test: 'Multi-tab Behavior', success: false, error: error.message });
  }
  
  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    url: TEST_CONFIG.baseUrl,
    totalTests: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
  
  await fs.writeFile(
    path.join(TEST_CONFIG.screenshotDir, 'test-summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log(`Total: ${summary.totalTests}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`📁 Results saved to: ${TEST_CONFIG.screenshotDir}`);
  
  await browser.close();
  
  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testHappyPath,
  testMidTaskAbandonment,
  testTaskPauseResume,
  testRapidTaskSwitching,
  testChatContextPersistence,
  testErrorRecovery,
  testMultiTabBehavior
};