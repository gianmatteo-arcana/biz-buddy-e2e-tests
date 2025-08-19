#!/usr/bin/env node

/**
 * Dev Toolkit Onboarding Test
 * Specifically tests the Dev Toolkit visualization with onboarding
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const TEST_RUN_DIR = `test-run-dev-toolkit-${new Date().toISOString().replace(/[:.]/g, '-')}`;

console.log('🔧 Dev Toolkit Onboarding Visualization Test');
console.log('============================================');
console.log(`📁 Results: ${TEST_RUN_DIR}/`);
console.log('');

async function captureScreenshot(page, name, description) {
  const filename = `${name}.png`;
  await page.screenshot({ 
    path: path.join(TEST_RUN_DIR, filename), 
    fullPage: true 
  });
  console.log(`📸 ${description}: ${filename}`);
}

async function runTest() {
  // Create results directory
  await fs.mkdir(TEST_RUN_DIR, { recursive: true });
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (msg.text().includes('onboarding') || msg.text().includes('task')) {
      console.log('   Console:', text);
    }
  });
  
  try {
    // Step 1: Go directly to Dev Toolkit Standalone
    console.log('\n1️⃣ Navigate to Dev Toolkit Standalone');
    console.log('--------------------------------------');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    console.log('   Page loaded, waiting for UI...');
    
    // Wait for the Dev Toolkit to be visible
    try {
      await page.waitForSelector('h1, h2, button', { 
        visible: true, 
        timeout: 10000 
      });
    } catch (e) {
      console.log('   Warning: Could not find expected elements');
    }
    
    await captureScreenshot(page, '01-dev-toolkit-initial', 'Dev Toolkit initial state');
    
    // Step 2: Look for the Start New Onboarding button
    console.log('\n2️⃣ Check for Start New Onboarding Button');
    console.log('-----------------------------------------');
    
    const startButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const onboardingBtn = buttons.find(b => 
        b.textContent.includes('Start New Onboarding') ||
        b.textContent.includes('Start Onboarding') ||
        b.textContent.includes('New Onboarding')
      );
      return onboardingBtn ? buttons.indexOf(onboardingBtn) : -1;
    });
    
    if (startButton >= 0) {
      console.log('   ✅ Found "Start New Onboarding" button');
      const buttons = await page.$$('button');
      
      // Click the button
      console.log('   Clicking button...');
      await buttons[startButton].click();
      
      // Wait for any changes
      try {
        await page.waitForFunction(() => {
          // Look for any task-related elements appearing
          return document.querySelector('[data-testid*="task"]') ||
                 document.querySelector('.task-node') ||
                 document.querySelector('.agent-node') ||
                 document.querySelector('[id*="task"]');
        }, { timeout: 10000 });
        console.log('   ✅ Task visualization appeared!');
      } catch (e) {
        console.log('   ⏳ Waiting for task to appear...');
      }
      
      await captureScreenshot(page, '02-after-start-onboarding', 'After clicking Start New Onboarding');
    } else {
      console.log('   ❌ "Start New Onboarding" button not found');
    }
    
    // Step 3: Check for Agent Visualizer elements
    console.log('\n3️⃣ Check Agent Visualizer Elements');
    console.log('------------------------------------');
    
    const visualizerElements = await page.evaluate(() => {
      return {
        hasAgentVisualizer: !!document.querySelector('[data-testid="agent-visualizer"]') || 
                           !!document.querySelector('.agent-visualizer') ||
                           document.body.textContent.includes('Real-Time Agent Visualizer'),
        hasTaskNodes: document.querySelectorAll('.task-node, [data-testid*="task-node"]').length,
        hasAgentNodes: document.querySelectorAll('.agent-node, [data-testid*="agent-node"]').length,
        hasConnections: document.querySelectorAll('.connection, line, path').length,
        tabsVisible: Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent.includes('Console') || 
          b.textContent.includes('Live Stream') ||
          b.textContent.includes('Task History')
        ).length
      };
    });
    
    console.log('   Agent Visualizer present:', visualizerElements.hasAgentVisualizer);
    console.log('   Task nodes found:', visualizerElements.hasTaskNodes);
    console.log('   Agent nodes found:', visualizerElements.hasAgentNodes);
    console.log('   Connections found:', visualizerElements.hasConnections);
    console.log('   Tabs visible:', visualizerElements.tabsVisible);
    
    // Step 4: Try to expand any task or agent nodes
    console.log('\n4️⃣ Expand Task/Agent Details');
    console.log('------------------------------');
    
    // Look for expandable elements
    const expandableElements = await page.$$('[data-testid*="expand"], .expandable, button[aria-expanded="false"]');
    console.log(`   Found ${expandableElements.length} expandable elements`);
    
    for (let i = 0; i < Math.min(expandableElements.length, 3); i++) {
      await expandableElements[i].click();
      console.log(`   Expanded element ${i + 1}`);
      await page.waitForTimeout(500); // Small wait for animation
    }
    
    await captureScreenshot(page, '03-expanded-details', 'With expanded task/agent details');
    
    // Step 5: Check for TaskContext data
    console.log('\n5️⃣ Check for TaskContext Data');
    console.log('-------------------------------');
    
    const contextData = await page.evaluate(() => {
      // Look for any JSON-like data displays
      const preElements = document.querySelectorAll('pre, code, .json-viewer');
      const hasContextData = Array.from(preElements).some(el => 
        el.textContent.includes('taskId') || 
        el.textContent.includes('context') ||
        el.textContent.includes('agent')
      );
      
      // Look for metadata displays
      const metadataElements = document.querySelectorAll('[data-testid*="metadata"], .metadata, .context-data');
      
      return {
        hasJSONDisplay: preElements.length > 0,
        hasContextData: hasContextData,
        metadataCount: metadataElements.length,
        visibleJSON: Array.from(preElements).slice(0, 2).map(el => 
          el.textContent.substring(0, 100) + '...'
        )
      };
    });
    
    console.log('   JSON displays found:', contextData.hasJSONDisplay);
    console.log('   Context data present:', contextData.hasContextData);
    console.log('   Metadata elements:', contextData.metadataCount);
    if (contextData.visibleJSON.length > 0) {
      console.log('   Sample data:', contextData.visibleJSON[0]);
    }
    
    // Step 6: Switch to different tabs if available
    console.log('\n6️⃣ Check Other Tabs');
    console.log('--------------------');
    
    const tabs = ['Console', 'Live Stream', 'Task History', 'Migrations', 'OAuth', 'ENGINE PRD'];
    
    for (const tabName of tabs) {
      const tabButton = await page.evaluate((name) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tab = buttons.find(b => b.textContent.includes(name));
        return tab ? buttons.indexOf(tab) : -1;
      }, tabName);
      
      if (tabButton >= 0) {
        const buttons = await page.$$('button');
        console.log(`   Clicking ${tabName} tab...`);
        await buttons[tabButton].click();
        await page.waitForTimeout(1000);
        await captureScreenshot(page, `04-tab-${tabName.toLowerCase().replace(' ', '-')}`, `${tabName} tab view`);
      }
    }
    
    // Step 7: Final comprehensive screenshot
    console.log('\n7️⃣ Final State');
    console.log('---------------');
    
    // Go back to Agent Visualizer tab if possible
    const agentTab = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tab = buttons.find(b => b.textContent.includes('Agent Visualizer'));
      return tab ? buttons.indexOf(tab) : -1;
    });
    
    if (agentTab >= 0) {
      const buttons = await page.$$('button');
      await buttons[agentTab].click();
      await page.waitForTimeout(500);
    }
    
    await captureScreenshot(page, '05-final-state', 'Final Dev Toolkit state');
    
    // Save console logs
    await fs.writeFile(
      path.join(TEST_RUN_DIR, 'console.log'),
      logs.join('\n')
    );
    
    console.log('\n✅ TEST COMPLETE');
    console.log('=================');
    console.log(`📁 Screenshots saved to: ${TEST_RUN_DIR}/`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await captureScreenshot(page, 'error-state', 'Error state');
  } finally {
    await browser.close();
  }
}

// Add waitForTimeout polyfill for older Puppeteer versions
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}

// Run the test
runTest().catch(console.error);