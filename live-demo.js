#!/usr/bin/env node

/**
 * Live Demo of Agent Orchestration Visualizer
 * Shows the visualizer tracking agent activity during onboarding
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const TEST_EMAIL = 'gianmatteo.allyn.test@gmail.com';
const TEST_PASSWORD = 'Test123!@#';
const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function liveDemo() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, `live-demo-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log('🎬 LIVE DEMO: Agent Orchestration Visualizer');
  console.log('============================================');
  console.log(`📁 Screenshots will be saved to: ${outputDir}\n`);
  
  const browser = await chromium.launch({
    headless: false, // Show browser for live demo
    viewport: { width: 1920, height: 1080 },
    slowMo: 500 // Slow down actions for visibility
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🎯') || text.includes('Agent') || text.includes('Task')) {
        console.log('  📝', text);
      }
    });
    
    // Step 1: Navigate to app
    console.log('📱 Step 1: Opening SmallBizAlly app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    // Check if we need to login
    const getStartedButton = await page.locator('button:has-text("Get Started")').first();
    if (await getStartedButton.isVisible()) {
      console.log('🔐 Need to authenticate first...');
      
      // Click Get Started
      await getStartedButton.click();
      await sleep(1000);
      
      // Click Continue with Google
      const googleButton = await page.locator('button:has-text("Continue with Google")').first();
      await googleButton.click();
      
      // Handle Google OAuth in new window
      const popupPromise = page.waitForEvent('popup');
      const popup = await popupPromise;
      
      console.log('  📧 Entering email...');
      await popup.waitForSelector('input[type="email"]');
      await popup.fill('input[type="email"]', TEST_EMAIL);
      await popup.click('#identifierNext');
      
      console.log('  🔑 Entering password...');
      await popup.waitForSelector('input[type="password"]', { state: 'visible' });
      await popup.fill('input[type="password"]', TEST_PASSWORD);
      await popup.click('#passwordNext');
      
      // Wait for redirect back
      console.log('  ⏳ Waiting for authentication...');
      await page.waitForURL('**//**', { timeout: 30000 });
      await sleep(5000);
    }
    
    // Step 2: Take initial screenshot
    console.log('\n📸 Step 2: Capturing initial dashboard state...');
    await page.screenshot({ 
      path: path.join(outputDir, '01-dashboard-initial.png'),
      fullPage: false 
    });
    
    // Step 3: Open Agent Visualizer
    console.log('\n🤖 Step 3: Opening Agent Orchestration Visualizer...');
    
    // Wait for and click the Agent Viz button
    await page.waitForTimeout(2000);
    const vizButton = await page.locator('button:has-text("Agent Viz")').first();
    
    if (await vizButton.isVisible()) {
      await vizButton.click();
      console.log('  ✅ Clicked Agent Viz button');
      await sleep(2000);
      
      await page.screenshot({ 
        path: path.join(outputDir, '02-visualizer-opened.png'),
        fullPage: false 
      });
      console.log('  📸 Captured: Visualizer opened');
      
      // Step 4: Check if onboarding is active
      console.log('\n🎯 Step 4: Checking for active onboarding...');
      const onboardingCard = await page.locator('text=/business name|company name|onboarding/i').first();
      
      if (!await onboardingCard.isVisible({ timeout: 3000 })) {
        console.log('  ⚠️ Onboarding not active, attempting to trigger...');
        
        // Try to trigger onboarding by refreshing
        await page.reload();
        await sleep(5000);
        
        // Re-open visualizer
        const vizButtonAfterReload = await page.locator('button:has-text("Agent Viz")').first();
        if (await vizButtonAfterReload.isVisible()) {
          await vizButtonAfterReload.click();
          await sleep(2000);
        }
      }
      
      // Step 5: Navigate through visualizer tabs
      console.log('\n📊 Step 5: Exploring visualizer tabs...');
      
      // Flow tab (default)
      console.log('  📍 Flow tab - Shows agent pipeline');
      await page.screenshot({ 
        path: path.join(outputDir, '03-flow-tab.png'),
        fullPage: false 
      });
      
      // Timeline tab
      const timelineTab = await page.locator('button[role="tab"]:has-text("Timeline")').first();
      if (await timelineTab.isVisible()) {
        await timelineTab.click();
        console.log('  📍 Timeline tab - Shows chronological events');
        await sleep(1500);
        await page.screenshot({ 
          path: path.join(outputDir, '04-timeline-tab.png'),
          fullPage: false 
        });
      }
      
      // Metrics tab
      const metricsTab = await page.locator('button[role="tab"]:has-text("Metrics")').first();
      if (await metricsTab.isVisible()) {
        await metricsTab.click();
        console.log('  📍 Metrics tab - Shows agent performance');
        await sleep(1500);
        await page.screenshot({ 
          path: path.join(outputDir, '05-metrics-tab.png'),
          fullPage: false 
        });
      }
      
      // Data tab
      const dataTab = await page.locator('button[role="tab"]:has-text("Data")').first();
      if (await dataTab.isVisible()) {
        await dataTab.click();
        console.log('  📍 Data tab - Shows collected information');
        await sleep(1500);
        await page.screenshot({ 
          path: path.join(outputDir, '06-data-tab.png'),
          fullPage: false 
        });
      }
      
      // Return to Flow tab
      const flowTab = await page.locator('button[role="tab"]:has-text("Flow")').first();
      if (await flowTab.isVisible()) {
        await flowTab.click();
        await sleep(1000);
      }
      
      // Step 6: Simulate user interaction if onboarding is visible
      console.log('\n✏️ Step 6: Simulating user interaction...');
      
      // Try to find a business name input
      const businessInputSelectors = [
        'input[placeholder*="business name" i]',
        'input[placeholder*="company name" i]',
        'input[name*="business" i]',
        'input[type="text"]'
      ];
      
      let foundInput = false;
      for (const selector of businessInputSelectors) {
        const input = await page.locator(selector).first();
        if (await input.isVisible({ timeout: 1000 })) {
          console.log('  📝 Found input field, entering business name...');
          await input.fill('TechVision Solutions LLC');
          foundInput = true;
          await sleep(2000);
          
          // Check Timeline for new events
          await timelineTab.click();
          await sleep(1500);
          await page.screenshot({ 
            path: path.join(outputDir, '07-timeline-after-input.png'),
            fullPage: false 
          });
          console.log('  📸 Captured: Timeline showing user input event');
          break;
        }
      }
      
      if (!foundInput) {
        console.log('  ℹ️ No input fields found - onboarding may not be active');
      }
      
      // Step 7: Open Dev Console to show both tools
      console.log('\n💻 Step 7: Opening Dev Console alongside visualizer...');
      const consoleButton = await page.locator('button:has-text("Console")').first();
      if (await consoleButton.isVisible()) {
        await consoleButton.click();
        console.log('  ✅ Opened Dev Console');
        await sleep(2000);
        
        await page.screenshot({ 
          path: path.join(outputDir, '08-both-tools-open.png'),
          fullPage: false 
        });
        console.log('  📸 Captured: Both developer tools active');
      }
      
      // Step 8: Final state
      console.log('\n🎬 Step 8: Capturing final state...');
      await sleep(3000);
      await page.screenshot({ 
        path: path.join(outputDir, '09-final-state.png'),
        fullPage: false 
      });
      
    } else {
      console.log('❌ Agent Viz button not found');
      console.log('ℹ️ The button appears in development mode');
      
      // Take screenshot of current state
      await page.screenshot({ 
        path: path.join(outputDir, 'no-viz-button.png'),
        fullPage: false 
      });
    }
    
    // Demo summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ DEMO COMPLETE!');
    console.log('='.repeat(50));
    console.log('\n📊 What was demonstrated:');
    console.log('  1. Agent Orchestration Visualizer opened');
    console.log('  2. Flow tab - Visual pipeline of agents');
    console.log('  3. Timeline tab - Chronological event log');
    console.log('  4. Metrics tab - Agent performance tracking');
    console.log('  5. Data tab - Collected and enriched data');
    console.log('  6. Real-time updates as user interacts');
    console.log('  7. Integration with Dev Console');
    
    console.log('\n🎯 Key Features Shown:');
    console.log('  • Real-time agent activity monitoring');
    console.log('  • Visual flow of orchestration pipeline');
    console.log('  • Event timeline with detailed logging');
    console.log('  • Performance metrics per agent');
    console.log('  • Data collection and enrichment tracking');
    
    console.log(`\n📂 Screenshots saved to: ${outputDir}`);
    console.log('\n👀 Browser will remain open for 15 seconds for manual inspection...');
    
    await sleep(15000);
    
  } catch (error) {
    console.error('❌ Error during demo:', error);
    
    // Take error screenshot
    try {
      await page.screenshot({ 
        path: path.join(outputDir, 'error-state.png'),
        fullPage: false 
      });
    } catch (e) {
      // Ignore screenshot error
    }
  } finally {
    await browser.close();
    console.log('\n👋 Demo ended. Thank you for watching!');
  }
}

// Run the live demo
console.log('🚀 Starting live demo in 3 seconds...\n');
setTimeout(() => {
  liveDemo().catch(console.error);
}, 3000);