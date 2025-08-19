#!/usr/bin/env node

/**
 * MONITOR ONBOARDING LOGS
 * 
 * Simply opens the app and monitors console for any orchestrator activity
 */

const { chromium } = require('playwright');

async function monitorOnboardingLogs() {
  console.log('👁️ MONITOR ONBOARDING & EVENT CREATION');
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
    console.log('📍 MONITORING CONSOLE OUTPUT');
    console.log('-' .repeat(40));
    console.log('Looking for:');
    console.log('  • [OnboardingOrchestrator] - Orchestrator calls');
    console.log('  • [EventSourced] - Event creation attempts');
    console.log('  • DATABASE - Database operations');
    console.log('  • ERROR/FAILED - Any failures\n');
    
    const page = await context.newPage();
    
    // Comprehensive console monitoring
    let orchestratorCalled = false;
    let eventsAttempted = false;
    let eventsSaved = false;
    let errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      // Log everything for debugging
      if (type === 'error') {
        errors.push(text);
        console.log('  ❌ ERROR:', text);
      }
      
      // Look for our specific logs
      if (text.includes('[OnboardingOrchestrator]')) {
        orchestratorCalled = true;
        console.log('  🎯 ORCHESTRATOR:', text.substring(0, 200));
      }
      
      if (text.includes('[EventSourced]')) {
        eventsAttempted = true;
        if (text.includes('ATTEMPTING')) {
          console.log('  ⚡ EVENT ATTEMPT:', text.substring(0, 200));
        }
        if (text.includes('EVENT SAVED TO DATABASE') || text.includes('✅')) {
          eventsSaved = true;
          console.log('  ✅ EVENT SAVED:', text.substring(0, 200));
        }
        if (text.includes('FAILED') || text.includes('ERROR')) {
          console.log('  ❌ EVENT FAILED:', text.substring(0, 200));
        }
      }
      
      // Also look for task creation
      if (text.includes('task') && text.includes('created')) {
        console.log('  📝 TASK:', text.substring(0, 200));
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('  ❌ PAGE ERROR:', error.message);
    });
    
    console.log('Loading app...\n');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    console.log('Waiting 15 seconds for any background processes...\n');
    await page.waitForTimeout(15000);
    
    // Try to trigger something by navigating around
    console.log('\n📍 ATTEMPTING TO TRIGGER ACTIVITY');
    console.log('-' .repeat(40));
    
    // Look for any buttons that might trigger orchestration
    const buttons = await page.$$('button');
    console.log(`  Found ${buttons.length} buttons on page`);
    
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && (text.includes('Start') || text.includes('New') || text.includes('Create'))) {
        console.log(`  Clicking button: "${text}"`);
        await button.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    console.log('\nWaiting another 10 seconds...\n');
    await page.waitForTimeout(10000);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MONITORING SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n🔍 What was detected:');
    console.log(`  • Orchestrator called: ${orchestratorCalled ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Event creation attempted: ${eventsAttempted ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Events saved to database: ${eventsSaved ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Errors encountered: ${errors.length > 0 ? `⚠️ ${errors.length}` : '✅ None'}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors detected:');
      errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 200)}`);
      });
    }
    
    if (!orchestratorCalled && !eventsAttempted) {
      console.log('\n⚠️ NO ORCHESTRATOR ACTIVITY DETECTED');
      console.log('Possible reasons:');
      console.log('  1. User already has completed onboarding');
      console.log('  2. Orchestrator is not being triggered on page load');
      console.log('  3. Need to manually trigger a new task creation');
    } else if (eventsAttempted && !eventsSaved) {
      console.log('\n⚠️ EVENTS ATTEMPTED BUT NOT SAVED');
      console.log('Check for permission errors or database issues');
    } else if (eventsSaved) {
      console.log('\n✅ SUCCESS! EVENTS ARE BEING CREATED AND SAVED!');
    }
    
    // Now check Dev Toolkit
    console.log('\n📍 CHECKING DEV TOOLKIT');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    devPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RealTimeVisualizer]') && 
          (text.includes('Found') || text.includes('events'))) {
        console.log('  🔍', text.substring(0, 150));
      }
    });
    
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(5000);
    
    console.log('\n🔍 Keep the browser windows open to inspect manually');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
monitorOnboardingLogs().then(() => {
  console.log('\n✅ Monitoring completed');
}).catch(err => {
  console.error('❌ Monitoring failed:', err);
  process.exit(1);
});