#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVisualizerDemo() {
  console.log('🎬 Agent Orchestration Visualizer Demo');
  console.log('=====================================\n');
  
  const testRunDir = path.join(__dirname, `visualizer-demo-${Date.now()}`);
  await fs.mkdir(testRunDir, { recursive: true });
  
  // Create a demo script using the existing autonomous test framework
  const demoScript = `
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function demo() {
  const browser = await chromium.launch({
    headless: false,
    viewport: { width: 1920, height: 1080 }
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: 'auth-state.json'
  });
  
  const page = await context.newPage();
  
  // Navigate to app
  console.log('📱 Opening app...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
    waitUntil: 'networkidle'
  });
  
  await page.waitForTimeout(3000);
  
  // Take initial screenshot
  await page.screenshot({ 
    path: '${testRunDir}/01-dashboard.png',
    fullPage: false 
  });
  console.log('📸 Screenshot: Dashboard loaded');
  
  // Click Agent Viz button
  console.log('🤖 Opening Agent Orchestration Visualizer...');
  const vizButton = await page.locator('button:has-text("Agent Viz")').first();
  if (await vizButton.isVisible()) {
    await vizButton.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: '${testRunDir}/02-visualizer-opened.png',
      fullPage: false 
    });
    console.log('📸 Screenshot: Visualizer opened');
    
    // The visualizer should now be visible
    // Look for the tabs
    const flowTab = await page.locator('button[role="tab"]:has-text("Flow")').first();
    if (await flowTab.isVisible()) {
      console.log('✅ Flow tab visible');
      
      // Click Timeline tab
      const timelineTab = await page.locator('button[role="tab"]:has-text("Timeline")').first();
      if (await timelineTab.isVisible()) {
        await timelineTab.click();
        await page.waitForTimeout(1500);
        
        await page.screenshot({ 
          path: '${testRunDir}/03-timeline-view.png',
          fullPage: false 
        });
        console.log('📸 Screenshot: Timeline view');
      }
      
      // Click Metrics tab
      const metricsTab = await page.locator('button[role="tab"]:has-text("Metrics")').first();
      if (await metricsTab.isVisible()) {
        await metricsTab.click();
        await page.waitForTimeout(1500);
        
        await page.screenshot({ 
          path: '${testRunDir}/04-metrics-view.png',
          fullPage: false 
        });
        console.log('📸 Screenshot: Metrics view');
      }
      
      // Click Data tab
      const dataTab = await page.locator('button[role="tab"]:has-text("Data")').first();
      if (await dataTab.isVisible()) {
        await dataTab.click();
        await page.waitForTimeout(1500);
        
        await page.screenshot({ 
          path: '${testRunDir}/05-data-view.png',
          fullPage: false 
        });
        console.log('📸 Screenshot: Data view');
      }
      
      // Go back to Flow
      await flowTab.click();
      await page.waitForTimeout(1500);
      
      // Also open Dev Console to show both
      const consoleButton = await page.locator('button:has-text("Show Console")').first();
      if (await consoleButton.isVisible()) {
        await consoleButton.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: '${testRunDir}/06-both-tools.png',
          fullPage: false 
        });
        console.log('📸 Screenshot: Both developer tools open');
      }
    }
    
    // Final state
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '${testRunDir}/07-final-state.png',
      fullPage: false 
    });
    console.log('📸 Screenshot: Final state');
    
  } else {
    console.log('⚠️ Agent Viz button not found');
    await page.screenshot({ 
      path: '${testRunDir}/error-no-viz-button.png',
      fullPage: false 
    });
  }
  
  console.log('\\n✅ Demo complete!');
  console.log('📁 Screenshots saved in: ${testRunDir}');
  
  await browser.close();
}

demo().catch(console.error);
`;

  // Write the script
  const scriptPath = path.join(testRunDir, 'run-demo.js');
  await fs.writeFile(scriptPath, demoScript);
  
  console.log('🚀 Starting demo...\n');
  console.log('📍 This will:');
  console.log('  1. Open the app with saved authentication');
  console.log('  2. Click the Agent Viz button');
  console.log('  3. Navigate through all visualizer tabs');
  console.log('  4. Show Timeline, Metrics, and Data views');
  console.log('  5. Open both Dev Console and Visualizer together\n');
  
  // Run using the existing playwright setup
  console.log('🎯 Executing demo script...\n');
  
  const child = spawn('node', ['visualizer-playwright.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  child.on('exit', (code) => {
    if (code === 0) {
      console.log('\n🎉 Demo completed successfully!');
      console.log(`📂 View screenshots in: ${testRunDir}`);
      
      // List screenshots
      fs.readdir(testRunDir).then(files => {
        const pngFiles = files.filter(f => f.endsWith('.png'));
        if (pngFiles.length > 0) {
          console.log('\n📸 Screenshots captured:');
          pngFiles.forEach(f => console.log(`   - ${f}`));
        }
      });
    } else {
      console.log('\n❌ Demo encountered an error');
    }
  });
}

// Check if we have auth state
fs.access(path.join(__dirname, 'auth-state.json'))
  .then(() => {
    console.log('✅ Found saved authentication\n');
    runVisualizerDemo();
  })
  .catch(() => {
    console.log('❌ No saved authentication found');
    console.log('💡 Run autonomous-test.js first to authenticate\n');
    process.exit(1);
  });