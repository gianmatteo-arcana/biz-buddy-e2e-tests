const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * E2E Test for Issue #42: Basic Fullscreen Modal Container & Authentication
 * 
 * Tests the fullscreen TaskCard modal functionality:
 * 1. Authenticates and reaches Dashboard
 * 2. Opens TaskCard in fullscreen mode (90vh)
 * 3. Verifies authentication status in modal header
 * 4. Tests close functionality
 */

async function testFullscreenModalAuth() {
  console.log('🎯 Testing Issue #42: Fullscreen Modal Container & Authentication');
  console.log('=' .repeat(70));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  // Use stored authentication
  const authFile = path.join(__dirname, '.auth/user-state.json');
  
  if (!fs.existsSync(authFile)) {
    console.log('❌ No auth file found! Please run authentication first.');
    console.log('   Run: node authenticate.js');
    process.exit(1);
  }

  console.log('✅ Loading authentication from .auth/user-state.json');
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: authFile
  });

  const page = await context.newPage();

  // Create screenshots directory for this test
  const screenshotDir = path.join(__dirname, 'test-screenshots', 'issue-42-fullscreen-modal');
  fs.mkdirSync(screenshotDir, { recursive: true });

  try {
    // Step 1: Navigate to main app and verify authentication
    console.log('\n📍 Step 1: Navigate to authenticated Dashboard...');
    await page.goto('http://localhost:8081', {
      waitUntil: 'networkidle'
    });
    
    await page.waitForTimeout(2000);
    
    // Check we're NOT on sign-in screen
    const signInButton = await page.locator('text=/Sign in with Google/i').first();
    const isOnSignIn = await signInButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isOnSignIn) {
      console.log('   ❌ Still on sign-in screen - not authenticated!');
      throw new Error('Not authenticated - cannot proceed with test');
    }
    
    // Look for Dashboard indicators
    const dashboardIndicators = [
      page.locator('text=/Welcome.*Gianmatteo/i').first(),
      page.locator('text=/Dashboard/i').first(),
      page.locator('[data-testid="user-profile"]').first()
    ];
    
    let isOnDashboard = false;
    for (const indicator of dashboardIndicators) {
      if (await indicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        isOnDashboard = true;
        break;
      }
    }
    
    if (isOnDashboard) {
      console.log('   ✅ Successfully reached authenticated Dashboard');
    } else {
      console.log('   ⚠️ May not be on Dashboard, but not on sign-in either');
    }
    
    // Take screenshot of authenticated dashboard
    await page.screenshot({
      path: path.join(screenshotDir, '1-authenticated-dashboard.png'),
      fullPage: true
    });
    console.log('   📸 Screenshot: 1-authenticated-dashboard.png');
    
    // Step 2: Open TaskCard in fullscreen mode
    console.log('\n📍 Step 2: Opening TaskCard in fullscreen mode...');
    
    // Try different ways to open a task
    let modalOpened = false;
    
    // Method 1: Click on existing task card
    const taskCard = await page.locator('[data-testid="task-card"], .task-card, [class*="task"]').first();
    if (await taskCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Found task card, clicking...');
      await taskCard.click();
      modalOpened = true;
    }
    
    // Method 2: Click on task in grid
    if (!modalOpened) {
      const taskInGrid = await page.locator('[role="button"][aria-label*="task"], button:has-text("Task")').first();
      if (await taskInGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   Found task in grid, clicking...');
        await taskInGrid.click();
        modalOpened = true;
      }
    }
    
    // Method 3: Create new task
    if (!modalOpened) {
      const newTaskButton = await page.locator('button:has-text("New Task"), button:has-text("Create Task")').first();
      if (await newTaskButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   Found "New Task" button, clicking...');
        await newTaskButton.click();
        modalOpened = true;
      }
    }
    
    // Wait for modal to appear
    await page.waitForTimeout(2000);
    
    // Step 3: Verify fullscreen modal is open
    console.log('\n📍 Step 3: Verifying fullscreen modal properties...');
    
    const fullscreenModal = await page.locator('[data-testid="task-card-fullscreen"], [role="dialog"]').first();
    const isModalVisible = await fullscreenModal.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isModalVisible) {
      console.log('   ❌ Fullscreen modal not found!');
      console.log('   Trying to find any dialog...');
      
      const anyDialog = await page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      if (await anyDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   Found a dialog/modal element');
      }
    } else {
      console.log('   ✅ Fullscreen modal is visible');
      
      // Verify modal height is 90vh
      const modalHeight = await fullscreenModal.evaluate(el => {
        const styles = window.getComputedStyle(el);
        const height = styles.height;
        const vh = window.innerHeight;
        const heightPx = parseFloat(height);
        const heightVh = (heightPx / vh) * 100;
        return {
          height: height,
          viewportHeight: vh,
          heightInVh: Math.round(heightVh)
        };
      });
      
      console.log(`   📏 Modal height: ${modalHeight.height} (${modalHeight.heightInVh}vh)`);
      
      if (modalHeight.heightInVh >= 85 && modalHeight.heightInVh <= 95) {
        console.log('   ✅ Modal height is approximately 90vh');
      } else {
        console.log('   ⚠️ Modal height is not 90vh as expected');
      }
    }
    
    // Take screenshot of modal
    await page.screenshot({
      path: path.join(screenshotDir, '2-fullscreen-modal-open.png'),
      fullPage: false
    });
    console.log('   📸 Screenshot: 2-fullscreen-modal-open.png');
    
    // Step 4: Verify authentication status in header
    console.log('\n📍 Step 4: Checking authentication status in modal header...');
    
    const authIndicator = await page.locator('[data-testid="authenticated-user"], text=/Authenticated.*@/i').first();
    const hasAuthIndicator = await authIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasAuthIndicator) {
      const authText = await authIndicator.textContent();
      console.log(`   ✅ Authentication indicator found: "${authText}"`);
      
      // Extract email
      const emailMatch = authText.match(/[\w.]+@[\w.]+/);
      if (emailMatch) {
        console.log(`   📧 Authenticated as: ${emailMatch[0]}`);
      }
    } else {
      console.log('   ❌ No authentication indicator in modal header');
      
      // Check for any user info
      const userInfo = await page.locator('text=/@.*\.com/i').first();
      if (await userInfo.isVisible({ timeout: 1000 }).catch(() => false)) {
        const text = await userInfo.textContent();
        console.log(`   Found user info: ${text}`);
      }
    }
    
    // Step 5: Test close functionality
    console.log('\n📍 Step 5: Testing modal close functionality...');
    
    const closeButton = await page.locator('[data-testid="modal-close-button"], [aria-label="Close"], button:has-text("X")').first();
    const hasCloseButton = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasCloseButton) {
      console.log('   Found close button, clicking...');
      await closeButton.click();
      
      await page.waitForTimeout(1000);
      
      // Verify modal is closed
      const isModalStillVisible = await fullscreenModal.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (!isModalStillVisible) {
        console.log('   ✅ Modal closed successfully');
      } else {
        console.log('   ❌ Modal did not close');
      }
    } else {
      console.log('   ❌ No close button found');
    }
    
    // Verify we're back on Dashboard
    const backOnDashboard = await page.locator('text=/Dashboard|Welcome/i').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (backOnDashboard) {
      console.log('   ✅ Back on Dashboard after closing modal');
    }
    
    // Take final screenshot
    await page.screenshot({
      path: path.join(screenshotDir, '3-modal-closed-back-to-dashboard.png'),
      fullPage: true
    });
    console.log('   📸 Screenshot: 3-modal-closed-back-to-dashboard.png');
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 TEST SUMMARY - Issue #42 Acceptance Criteria:');
    console.log('=' .repeat(70));
    
    const criteria = {
      'Modal opens from authenticated Dashboard': isOnDashboard && modalOpened,
      'Modal has 90vh height': modalHeight?.heightInVh >= 85 && modalHeight?.heightInVh <= 95,
      'Shows authenticated user email': hasAuthIndicator,
      'Has close functionality': hasCloseButton && !isModalStillVisible,
      'Returns to Dashboard after close': backOnDashboard
    };
    
    Object.entries(criteria).forEach(([criterion, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${criterion}`);
    });
    
    const allPassed = Object.values(criteria).every(v => v);
    
    console.log('\n' + '=' .repeat(70));
    if (allPassed) {
      console.log('🎉 ALL ACCEPTANCE CRITERIA MET! Issue #42 is complete.');
    } else {
      console.log('⚠️ Some criteria not met. See results above.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'error-state.png'),
      fullPage: true
    });
    console.log('📸 Error screenshot saved: error-state.png');
    
  } finally {
    await browser.close();
    console.log('\n✅ Test completed. Screenshots saved in:', screenshotDir);
  }
}

// Run the test
testFullscreenModalAuth().catch(console.error);