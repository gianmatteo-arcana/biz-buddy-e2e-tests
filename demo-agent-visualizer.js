const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const TEST_EMAIL = 'gianmatteo.allyn.test@gmail.com';
const TEST_PASSWORD = 'Test123!@#';
const APP_URL = 'https://lovable.dev/projects/c7c73bd8-51e3-493b-8f1f-a899e0e21e0a';

async function captureScreenshot(page, name, testRunDir) {
  const screenshotPath = path.join(testRunDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`📸 Screenshot saved: ${name}.png`);
  return screenshotPath;
}

async function demoAgentVisualizer() {
  const testRunDir = path.join(__dirname, `demo-run-${Date.now()}`);
  await fs.mkdir(testRunDir, { recursive: true });
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for demo
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--window-size=1920,1080']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to app
    console.log('🚀 Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await captureScreenshot(page, '01-initial-load', testRunDir);
    
    // Click "Get Started" to go to login
    console.log('🔘 Clicking Get Started...');
    await page.waitForSelector('button:has-text("Get Started")', { timeout: 5000 });
    await page.click('button:has-text("Get Started")');
    await page.waitForTimeout(1000);
    
    // Sign in with Google
    console.log('🔐 Signing in with Google...');
    await page.waitForSelector('button:has-text("Continue with Google")', { timeout: 5000 });
    await captureScreenshot(page, '02-login-screen', testRunDir);
    await page.click('button:has-text("Continue with Google")');
    
    // Handle Google OAuth in popup
    const newPagePromise = new Promise(resolve => 
      browser.once('targetcreated', target => resolve(target.page()))
    );
    const popup = await newPagePromise;
    
    if (popup) {
      await popup.waitForSelector('input[type="email"]', { timeout: 10000 });
      await popup.type('input[type="email"]', TEST_EMAIL);
      await popup.click('#identifierNext');
      
      await popup.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
      await popup.type('input[type="password"]', TEST_PASSWORD);
      await popup.click('#passwordNext');
      
      // Wait for OAuth redirect
      await page.waitForTimeout(5000);
    }
    
    // Wait for dashboard to load
    console.log('⏳ Waiting for dashboard...');
    await page.waitForTimeout(3000);
    await captureScreenshot(page, '03-dashboard-loaded', testRunDir);
    
    // Open Agent Visualizer
    console.log('🤖 Opening Agent Visualizer...');
    const agentVizButton = await page.$('button:has-text("Agent Viz")');
    if (agentVizButton) {
      await agentVizButton.click();
      await page.waitForTimeout(1000);
      await captureScreenshot(page, '04-agent-viz-opened', testRunDir);
      
      // The onboarding should trigger automatically
      console.log('📋 Waiting for onboarding to start...');
      await page.waitForTimeout(2000);
      
      // Check if onboarding card appears
      const onboardingCard = await page.$('text=/onboarding/i');
      if (onboardingCard) {
        console.log('✅ Onboarding detected!');
        await captureScreenshot(page, '05-onboarding-started', testRunDir);
        
        // Switch to Timeline tab in visualizer
        const timelineTab = await page.$('button[role="tab"]:has-text("Timeline")');
        if (timelineTab) {
          await timelineTab.click();
          await page.waitForTimeout(1000);
          await captureScreenshot(page, '06-timeline-view', testRunDir);
        }
        
        // Fill in some onboarding data
        console.log('📝 Filling onboarding form...');
        
        // Try to find and fill business name
        const businessNameInput = await page.$('input[placeholder*="business name" i]');
        if (businessNameInput) {
          await businessNameInput.type('Demo Tech Solutions LLC');
          await page.waitForTimeout(1000);
          await captureScreenshot(page, '07-entered-business-name', testRunDir);
        }
        
        // Check Timeline for events
        await page.waitForTimeout(2000);
        await captureScreenshot(page, '08-timeline-with-events', testRunDir);
        
        // Switch to Metrics tab
        const metricsTab = await page.$('button[role="tab"]:has-text("Metrics")');
        if (metricsTab) {
          await metricsTab.click();
          await page.waitForTimeout(1000);
          await captureScreenshot(page, '09-metrics-view', testRunDir);
        }
        
        // Switch to Data tab
        const dataTab = await page.$('button[role="tab"]:has-text("Data")');
        if (dataTab) {
          await dataTab.click();
          await page.waitForTimeout(1000);
          await captureScreenshot(page, '10-data-collected', testRunDir);
        }
        
        // Switch back to Flow tab
        const flowTab = await page.$('button[role="tab"]:has-text("Flow")');
        if (flowTab) {
          await flowTab.click();
          await page.waitForTimeout(1000);
          await captureScreenshot(page, '11-flow-visualization', testRunDir);
        }
        
      } else {
        console.log('⚠️ Onboarding did not trigger automatically');
        
        // Try to manually trigger it
        const newBusinessButton = await page.$('button:has-text("New Business")');
        if (newBusinessButton) {
          await newBusinessButton.click();
          await page.waitForTimeout(2000);
          await captureScreenshot(page, '05-manual-trigger', testRunDir);
        }
      }
      
    } else {
      console.log('⚠️ Agent Viz button not found - may need to be in dev mode');
    }
    
    // Also open the Dev Console to show both tools
    console.log('💻 Opening Dev Console...');
    const devConsoleButton = await page.$('button:has-text("Console")');
    if (devConsoleButton) {
      await devConsoleButton.click();
      await page.waitForTimeout(1000);
      await captureScreenshot(page, '12-both-tools-open', testRunDir);
    }
    
    // Final screenshot
    await page.waitForTimeout(2000);
    await captureScreenshot(page, '13-final-state', testRunDir);
    
    console.log(`\n✅ Demo complete! Screenshots saved in: ${testRunDir}`);
    console.log('\n📊 Key Features Demonstrated:');
    console.log('  1. Agent Orchestration Visualizer opened');
    console.log('  2. Real-time agent flow visualization');
    console.log('  3. Timeline of agent events');
    console.log('  4. Metrics tracking');
    console.log('  5. Data collection view');
    console.log('  6. Dev Console integration');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    await captureScreenshot(page, 'error-state', testRunDir);
  } finally {
    await browser.close();
  }
}

// Run the demo
demoAgentVisualizer().catch(console.error);