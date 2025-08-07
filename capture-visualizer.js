#!/usr/bin/env node

/**
 * Captures the Agent Orchestration Visualizer in action
 * Run autonomous-test.js first to authenticate
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/';

async function captureVisualizer() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, `visualizer-demo-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log('🎬 Agent Orchestration Visualizer Demo');
  console.log('=====================================');
  console.log(`📁 Output: ${outputDir}\n`);
  
  let authState;
  try {
    const authData = await fs.readFile('auth-state.json', 'utf-8');
    authState = JSON.parse(authData);
    console.log('✅ Using saved authentication\n');
  } catch (error) {
    console.log('❌ No auth state found. Run autonomous-test.js first');
    return;
  }
  
  const browser = await chromium.launch({
    headless: false, // Show browser for demo
    viewport: { width: 1920, height: 1080 }
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: authState
    });
    
    const page = await context.newPage();
    
    // Log console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      } else if (msg.text().includes('Agent') || msg.text().includes('Task')) {
        console.log('📝', msg.text());
      }
    });
    
    // Navigate to app
    console.log('📱 Opening app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Capture initial state
    await page.screenshot({ 
      path: path.join(outputDir, '01-dashboard.png'),
      fullPage: false 
    });
    console.log('📸 Captured: Dashboard');
    
    // Look for and click Agent Viz button
    console.log('\n🤖 Looking for Agent Viz button...');
    
    // Try multiple selectors
    const vizSelectors = [
      'button:has-text("Agent Viz")',
      'button:has-text("Show Agent Viz")',
      'button >> text="Agent Viz"',
      'button[aria-label*="Agent"]'
    ];
    
    let vizButton = null;
    for (const selector of vizSelectors) {
      try {
        vizButton = await page.locator(selector).first();
        if (await vizButton.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    if (vizButton && await vizButton.isVisible()) {
      await vizButton.click();
      console.log('✅ Clicked Agent Viz button');
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(outputDir, '02-visualizer-opened.png'),
        fullPage: false 
      });
      console.log('📸 Captured: Visualizer opened');
      
      // Look for visualizer tabs
      console.log('\n📊 Exploring visualizer tabs...');
      
      const tabs = ['Timeline', 'Metrics', 'Data', 'Flow'];
      for (const tabName of tabs) {
        try {
          const tab = await page.locator(`button[role="tab"]:has-text("${tabName}")`).first();
          if (await tab.isVisible({ timeout: 1000 })) {
            await tab.click();
            console.log(`✅ Clicked ${tabName} tab`);
            await page.waitForTimeout(1500);
            
            await page.screenshot({ 
              path: path.join(outputDir, `03-${tabName.toLowerCase()}-view.png`),
              fullPage: false 
            });
            console.log(`📸 Captured: ${tabName} view`);
          }
        } catch (e) {
          console.log(`⚠️ ${tabName} tab not found`);
        }
      }
      
      // Check for agent activity
      console.log('\n🔍 Checking for agent activity...');
      const agentEvents = await page.locator('text=/orchestrator|data_collection|enrichment|validation/i').count();
      console.log(`📊 Found ${agentEvents} agent-related elements`);
      
      // Open Dev Console too
      console.log('\n💻 Opening Dev Console...');
      const consoleButton = await page.locator('button:has-text("Console")').first();
      if (await consoleButton.isVisible()) {
        await consoleButton.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: path.join(outputDir, '04-both-tools.png'),
          fullPage: false 
        });
        console.log('📸 Captured: Both dev tools open');
      }
      
    } else {
      console.log('❌ Agent Viz button not found');
      console.log('💡 The button appears in development mode');
      
      // Check if we're in production
      const url = page.url();
      console.log(`Current URL: ${url}`);
      
      // Take a screenshot to see current state
      await page.screenshot({ 
        path: path.join(outputDir, 'current-state.png'),
        fullPage: false 
      });
    }
    
    // Final capture
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(outputDir, 'final-state.png'),
      fullPage: false 
    });
    console.log('📸 Captured: Final state');
    
    console.log('\n✅ Demo complete!');
    console.log(`📂 Screenshots saved in: ${outputDir}`);
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error during demo:', error);
  } finally {
    await browser.close();
  }
}

// Run the demo
captureVisualizer().catch(console.error);