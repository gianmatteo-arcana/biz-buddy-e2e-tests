#!/usr/bin/env node

/**
 * TEST: Direct Orchestrator Check
 * 
 * Tests if orchestrator services are available in the browser
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testOrchestratorDirect() {
  const testRunId = Date.now();
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/orchestrator-${testRunId}`;
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log('🚀 DIRECT ORCHESTRATOR TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('🆔 Test Run:', testRunId);
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
    console.log('📍 STEP 1: LOAD APP');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      // Show important logs
      if (text.includes('Orchestrator') || text.includes('YAML') || text.includes('ExecutionPlan')) {
        console.log(`  [${type}] ${text.substring(0, 200)}`);
      }
      
      // Show errors
      if (type === 'error') {
        console.log(`  ❌ [ERROR] ${text.substring(0, 300)}`);
      }
    });
    
    console.log('  Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(5000);
    
    // STEP 2: Check if services exist
    console.log('\n📍 STEP 2: CHECK ORCHESTRATOR SERVICES');
    console.log('-' .repeat(40));
    
    const servicesCheck = await page.evaluate(() => {
      const results = {
        windowDefined: typeof window !== 'undefined',
        hasReact: false,
        servicesAvailable: {},
        errors: []
      };
      
      try {
        // Check if React is loaded
        results.hasReact = !!(window.React || document.querySelector('[data-reactroot]') || document.querySelector('#root'));
        
        // Try to access the services through window
        // Note: These might not be exposed globally, but worth checking
        results.servicesAvailable = {
          onboardingOrchestratorV2: typeof window.onboardingOrchestratorV2 !== 'undefined',
          yamlTemplateLoader: typeof window.yamlTemplateLoader !== 'undefined',
          executionPlanProcessor: typeof window.executionPlanProcessor !== 'undefined',
          eventSourcedOrchestrator: typeof window.eventSourcedOrchestrator !== 'undefined'
        };
        
      } catch (error) {
        results.errors.push(error.message);
      }
      
      return results;
    });
    
    console.log('  Window defined:', servicesCheck.windowDefined ? '✅' : '❌');
    console.log('  React loaded:', servicesCheck.hasReact ? '✅' : '❌');
    console.log('  Services available:');
    Object.entries(servicesCheck.servicesAvailable).forEach(([service, available]) => {
      console.log(`    • ${service}: ${available ? '✅' : '❌'}`);
    });
    
    if (servicesCheck.errors.length > 0) {
      console.log('  Errors:', servicesCheck.errors.join(', '));
    }
    
    // STEP 3: Try to trigger orchestrator directly through console
    console.log('\n📍 STEP 3: TRIGGER ORCHESTRATOR VIA CONSOLE');
    console.log('-' .repeat(40));
    
    const orchestratorResult = await page.evaluate(async () => {
      const results = {
        attempted: false,
        error: null,
        consoleOutput: []
      };
      
      try {
        // Try to trigger the orchestrator
        // This might fail if the services aren't exposed globally
        console.log('[Test] Attempting to trigger orchestrator...');
        results.attempted = true;
        
        // Check if we can find the button and get its click handler
        const button = document.querySelector('button');
        const buttons = Array.from(document.querySelectorAll('button'));
        const forceButton = buttons.find(btn => btn.textContent?.includes('Force YAML Onboarding'));
        
        if (forceButton) {
          console.log('[Test] Found Force YAML Onboarding button, clicking it...');
          forceButton.click();
          results.buttonClicked = true;
        } else {
          console.log('[Test] Force YAML Onboarding button not found');
          results.buttonClicked = false;
        }
        
      } catch (error) {
        results.error = error.message;
        console.error('[Test] Error:', error);
      }
      
      return results;
    });
    
    console.log('  Orchestrator trigger attempted:', orchestratorResult.attempted ? '✅' : '❌');
    console.log('  Button clicked:', orchestratorResult.buttonClicked ? '✅' : '❌');
    if (orchestratorResult.error) {
      console.log('  Error:', orchestratorResult.error);
    }
    
    // Wait to see if anything happens
    await page.waitForTimeout(5000);
    
    // Check for any toast messages or errors
    const toastCheck = await page.evaluate(() => {
      const toasts = document.querySelectorAll('[role="alert"], .toast, [data-sonner-toast]');
      return Array.from(toasts).map(t => t.textContent);
    });
    
    if (toastCheck.length > 0) {
      console.log('\n  Toast messages found:');
      toastCheck.forEach(msg => console.log(`    • ${msg}`));
    }
    
    // Take final screenshot
    await page.screenshot({
      path: path.join(outputDir, 'final-state.png'),
      fullPage: true
    });
    
    // FINAL SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    if (servicesCheck.hasReact && orchestratorResult.buttonClicked) {
      console.log('\n✅ App loaded and button was clicked');
      console.log('Check the browser console for any errors.');
      console.log('The orchestrator services may not be exposed globally.');
    } else {
      console.log('\n❌ Issues detected');
      if (!servicesCheck.hasReact) {
        console.log('  • React app did not load properly');
      }
      if (!orchestratorResult.buttonClicked) {
        console.log('  • Force YAML Onboarding button not found or not clickable');
      }
    }
    
    console.log(`\n📁 Screenshot: ${outputDir}/final-state.png`);
    console.log('🔍 Browser window remains open for inspection');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testOrchestratorDirect().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});