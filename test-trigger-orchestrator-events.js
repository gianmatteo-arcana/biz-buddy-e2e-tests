#!/usr/bin/env node

/**
 * TRIGGER ORCHESTRATOR EVENTS TEST
 * 
 * This test creates a new task via the UI to trigger the orchestrator
 * and verify events are created and visualized
 */

const { chromium } = require('playwright');

async function testTriggerOrchestratorEvents() {
  console.log('🚀 TRIGGER ORCHESTRATOR EVENTS TEST');
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
    // Step 1: Load app and monitor for orchestrator activity
    console.log('📍 STEP 1: LOAD APP AND CREATE NEW TASK');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Monitor console for orchestrator activity
    let orchestratorTriggered = false;
    let eventsCreated = false;
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[OnboardingOrchestrator]')) {
        console.log('  🎯 Orchestrator:', text.substring(0, 150));
        orchestratorTriggered = true;
      }
      if (text.includes('[EventSourced]') && text.includes('EVENT')) {
        console.log('  ⚡ Event:', text.substring(0, 150));
        eventsCreated = true;
      }
    });
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(5000);
    
    // Try to create a new task
    console.log('\n  Looking for task creation button...');
    
    // Look for "Add Task" or similar button
    const addTaskButton = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('add') && text.includes('task')) {
          btn.click();
          return true;
        }
      }
      // Try the + button if exists
      for (const btn of buttons) {
        if (btn.textContent?.trim() === '+' || btn.querySelector('svg')) {
          const svg = btn.querySelector('svg');
          if (svg && svg.innerHTML.includes('Plus')) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    });
    
    if (addTaskButton) {
      console.log('  ✅ Found and clicked Add Task button');
      await page.waitForTimeout(2000);
      
      // Fill in task details if form appears
      const formFilled = await page.evaluate(() => {
        // Look for input fields
        const titleInput = document.querySelector('input[placeholder*="title" i], input[placeholder*="name" i], input[type="text"]');
        const descInput = document.querySelector('textarea, input[placeholder*="description" i]');
        
        if (titleInput) {
          titleInput.value = 'Test Task for Event Creation';
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (descInput) {
          descInput.value = 'This task should trigger orchestrator events';
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Look for submit button
        const submitButtons = document.querySelectorAll('button');
        for (const btn of submitButtons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('create') || text.includes('add') || text.includes('save')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (formFilled) {
        console.log('  ✅ Filled form and submitted');
        await page.waitForTimeout(5000);
      }
    } else {
      console.log('  ⚠️ No Add Task button found - checking if onboarding is needed');
      
      // Check if user needs onboarding
      const needsOnboarding = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes('Get Started') || bodyText.includes('Welcome') || bodyText.includes('Setup');
      });
      
      if (needsOnboarding) {
        console.log('  📝 User might need onboarding setup');
      }
    }
    
    // Step 2: Check Dev Toolkit for events
    console.log('\n📍 STEP 2: CHECK DEV TOOLKIT FOR EVENTS');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    
    devPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RealTimeVisualizer]')) {
        console.log('  🔍 DevToolkit:', text.substring(0, 150));
      }
    });
    
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(3000);
    
    // Go to Task History
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task History')) {
          btn.click();
          break;
        }
      }
    });
    
    await devPage.waitForTimeout(2000);
    
    // Refresh to get latest
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const svgs = btn.querySelectorAll('svg');
        for (const svg of svgs) {
          if (svg.getAttribute('class')?.includes('refresh')) {
            btn.click();
            return;
          }
        }
      }
    });
    
    await devPage.waitForTimeout(3000);
    
    // Look for our test task or any recent task
    const taskFound = await devPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"]');
      for (const card of cards) {
        const text = card.textContent || '';
        if (text.includes('Test Task') || text.includes('Event Creation')) {
          card.click();
          return { found: true, text: text.substring(0, 100) };
        }
      }
      // Click first task if no test task found
      if (cards.length > 0) {
        cards[0].click();
        return { found: true, text: cards[0].textContent?.substring(0, 100) || 'First task' };
      }
      return { found: false };
    });
    
    if (taskFound.found) {
      console.log(`  ✅ Selected task: ${taskFound.text}`);
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
      
      // Check for events
      const hasEvents = await devPage.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasNoEvents = bodyText.includes('No events') || bodyText.includes('No agent activity');
        const hasTimeline = bodyText.includes('Timeline') || !!document.querySelector('[class*="timeline"]');
        const hasAgentInfo = bodyText.includes('Agent') || bodyText.includes('Orchestrator');
        return {
          hasEvents: !hasNoEvents && (hasTimeline || hasAgentInfo),
          text: bodyText.substring(0, 300)
        };
      });
      
      if (hasEvents.hasEvents) {
        console.log('  ✅ AGENT EVENTS ARE VISIBLE!');
      } else {
        console.log('  ❌ No agent events visible');
        console.log('  Preview:', hasEvents.text);
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n📋 Results:');
    console.log(`  • Orchestrator triggered: ${orchestratorTriggered ? '✅' : '❌'}`);
    console.log(`  • Events created in code: ${eventsCreated ? '✅' : '❌'}`);
    console.log(`  • Task found in Dev Toolkit: ${taskFound.found ? '✅' : '❌'}`);
    
    if (!orchestratorTriggered && !eventsCreated) {
      console.log('\n⚠️ DIAGNOSIS:');
      console.log('The orchestrator is not being triggered automatically.');
      console.log('This may be because:');
      console.log('  1. User already has completed onboarding');
      console.log('  2. Task creation doesn\'t trigger orchestrator');
      console.log('  3. Orchestrator is only triggered for specific task types');
      console.log('\nThe agent visualization system is ready to display events,');
      console.log('but events need to be created first by the orchestrator.');
    }
    
    console.log('\n🔍 Keep browser windows open for manual inspection');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testTriggerOrchestratorEvents().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});