#!/usr/bin/env node

/**
 * Simple E2E Test for Onboarding Flow
 * 
 * A simpler version to verify the basic flow works
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testSimpleOnboardingFlow() {
  const testRunId = Date.now();
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/simple-test-${testRunId}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🚀 SIMPLE ONBOARDING FLOW TEST');
  console.log('=' .repeat(80));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('🆔 Test Run:', testRunId);
  console.log('📁 Output:', outputDir);
  console.log('=' .repeat(80) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });

  let screenshotCount = 0;

  const takeScreenshot = async (page, name, description) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', filename),
      fullPage: true
    });
    console.log(`  📸 [${screenshotCount}] ${description}`);
    return filename;
  };

  try {
    console.log('📍 PHASE 1: LOAD APPLICATION');
    console.log('-' .repeat(60));
    
    const page = await context.newPage();
    
    console.log('  Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for app to stabilize
    await page.waitForTimeout(5000);
    
    // Check if body has data-app-ready attribute
    const appReady = await page.getAttribute('body', 'data-app-ready');
    console.log(`  App ready state: ${appReady || 'not set'}`);
    
    // Check authentication
    const authReady = await page.getAttribute('body', 'data-auth-ready');
    console.log(`  Auth ready state: ${authReady || 'not set'}`);
    
    await takeScreenshot(page, 'app-loaded', 'Application loaded');
    
    console.log('\n📍 PHASE 2: OPEN DEV TOOLKIT');
    console.log('-' .repeat(60));
    
    // Look for Dev Toolkit button
    const devButton = await page.$('[data-testid="dev-toolkit-button"]');
    if (devButton) {
      console.log('  ✅ Dev Toolkit button found (with data-testid)');
    } else {
      // Fallback to title attribute
      const devButtonAlt = await page.$('button[title="Open Dev Toolkit"]');
      if (devButtonAlt) {
        console.log('  ✅ Dev Toolkit button found (with title)');
        await devButtonAlt.click();
      } else {
        console.log('  ❌ Dev Toolkit button not found');
      }
    }
    
    if (devButton) {
      await takeScreenshot(page, 'before-click', 'Before clicking Dev Toolkit');
      await devButton.click();
      console.log('  Clicked Dev Toolkit button');
    }
    
    // Wait for new tab
    await page.waitForTimeout(3000);
    
    const pages = context.pages();
    console.log(`  Number of tabs open: ${pages.length}`);
    
    if (pages.length > 1) {
      console.log('  ✅ Dev Toolkit opened in new tab');
      
      const devToolkitPage = pages[pages.length - 1];
      await devToolkitPage.waitForTimeout(5000); // Let it load
      
      await devToolkitPage.screenshot({
        path: path.join(outputDir, 'screenshots', '03-dev-toolkit.png'),
        fullPage: true
      });
      console.log('  📸 [3] Dev Toolkit loaded');
      
      // Check for authentication display
      const authEmail = await devToolkitPage.$('[data-testid="auth-email"]');
      if (authEmail) {
        const email = await authEmail.textContent();
        console.log(`  ✅ Authenticated as: ${email}`);
      } else {
        console.log('  ⚠️ Auth email element not found');
      }
      
      // Check for agent visualizer
      const visualizer = await devToolkitPage.$('[data-testid="agent-visualizer"]');
      if (visualizer) {
        console.log('  ✅ Agent Visualizer found');
        
        // Check its data attributes
        const loaded = await visualizer.getAttribute('data-loaded');
        const authenticated = await visualizer.getAttribute('data-authenticated');
        const hasTask = await visualizer.getAttribute('data-has-task');
        
        console.log(`    - Loaded: ${loaded}`);
        console.log(`    - Authenticated: ${authenticated}`);
        console.log(`    - Has Task: ${hasTask}`);
      } else {
        console.log('  ⚠️ Agent Visualizer not found');
      }
      
      // Look for Start Onboarding button
      const startButton = await devToolkitPage.$('[data-testid="start-onboarding-button"]');
      if (startButton) {
        console.log('  ✅ Start Onboarding button found');
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '04-before-onboarding.png'),
          fullPage: true
        });
        console.log('  📸 [4] Before starting onboarding');
        
        await startButton.click();
        console.log('  Clicked Start Onboarding');
        
        await devToolkitPage.waitForTimeout(5000);
        
        await devToolkitPage.screenshot({
          path: path.join(outputDir, 'screenshots', '05-after-onboarding.png'),
          fullPage: true
        });
        console.log('  📸 [5] After starting onboarding');
      } else {
        console.log('  ⚠️ Start Onboarding button not found');
        
        // Check if there's a task selector instead
        const taskSelector = await devToolkitPage.$('[data-testid="task-selector"]');
        if (taskSelector) {
          console.log('  ℹ️ Task selector found - user may have existing tasks');
        }
      }
      
    } else {
      console.log('  ❌ Dev Toolkit did not open in new tab');
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(80));
    
    console.log('\n📈 Results:');
    console.log(`  • Screenshots captured: ${screenshotCount}`);
    console.log(`  • App ready: ${appReady === 'true' ? '✅' : '❌'}`);
    console.log(`  • Authenticated: ${authReady === 'true' ? '✅' : '❌'}`);
    console.log(`  • Dev Toolkit opened: ${pages.length > 1 ? '✅' : '❌'}`);
    
    console.log(`\n📁 Results saved to: ${outputDir}`);
    console.log('✅ Test completed');
    
    // Keep browser open for inspection
    console.log('\n🔍 Browser windows remain open for manual inspection');
    console.log('Press Ctrl+C to close when done');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await browser.close();
    process.exit(1);
  }
}

// Run the test
testSimpleOnboardingFlow().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});