#!/usr/bin/env node

const { chromium } = require('playwright');

async function testEventCreationSimple() {
  console.log('🔬 SIMPLE EVENT CREATION TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[EventSourced]') || 
          text.includes('[OnboardingOrchestrator]') ||
          text.includes('EVENT') ||
          text.includes('event')) {
        console.log('  🔍', text.substring(0, 200));
      }
    });
    
    console.log('📍 STEP 1: LOAD APP AND MONITOR FOR EVENT ACTIVITY');
    console.log('-' .repeat(40));
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(10000);
    
    // Try to trigger something
    console.log('\n📍 STEP 2: TRY TO TRIGGER ACTIVITY');
    console.log('-' .repeat(40));
    
    // Look for any buttons that might create tasks
    const buttons = await page.$$('button');
    console.log(`  Found ${buttons.length} buttons`);
    
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && (text.includes('Add') || text.includes('New') || text.includes('Create'))) {
        console.log(`  Clicking: "${text}"`);
        await button.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    console.log('\n📍 STEP 3: CHECK DEV TOOLKIT');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    
    devPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RealTimeVisualizer]') && text.includes('events')) {
        console.log('  🔍 DevToolkit:', text.substring(0, 150));
      }
    });
    
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(5000);
    
    // Click Task History
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task History')) {
          btn.click();
          break;
        }
      }
    });
    
    await devPage.waitForTimeout(3000);
    
    // Check what's visible
    const taskHistoryText = await devPage.evaluate(() => document.body.innerText);
    
    console.log('\n📊 RESULTS:');
    console.log('  • Has tasks:', taskHistoryText.includes('Business Profile') || taskHistoryText.includes('Onboarding') ? '✅' : '❌');
    console.log('  • Dev Toolkit loaded:', taskHistoryText.includes('Task History') ? '✅' : '❌');
    
    // Try to select a task
    const taskSelected = await devPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"]');
      if (cards.length > 0) {
        cards[0].click();
        return true;
      }
      return false;
    });
    
    if (taskSelected) {
      console.log('  • Selected a task: ✅');
      await devPage.waitForTimeout(2000);
      
      // Switch to Agent Visualizer
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Agent Visualizer')) {
            btn.click();
            break;
          }
        }
      });
      
      await devPage.waitForTimeout(3000);
      
      const visualizerText = await devPage.evaluate(() => document.body.innerText);
      console.log('  • Agent Visualizer has events:', 
        visualizerText.includes('No events') || visualizerText.includes('No agent activity') ? '❌' : '✅');
    }
    
    console.log('\n🔍 Keep browser open to inspect');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEventCreationSimple().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
