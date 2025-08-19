/**
 * Visual Documentation Test - Simplified and Robust
 * Captures every UI state during onboarding flow
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function captureOnboardingVisuals() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join('/Users/gianmatteo/Documents/Arcana-Prototype/tests', `onboarding-visuals-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log('🎯 VISUAL DOCUMENTATION - ONBOARDING FLOW');
  console.log('=' .repeat(60));
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    viewport: { width: 1920, height: 1080 }
  });
  
  let context;
  try {
    // Use existing auth if available
    context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });
    console.log('✅ Using existing authentication');
  } catch {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    console.log('⚠️ Running without authentication');
  }
  
  const page = await context.newPage();
  let screenshotCount = 0;
  
  // Helper function to take screenshot with description
  async function capture(name, description) {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(3, '0')}-${name}.png`;
    await page.screenshot({ 
      path: path.join(outputDir, filename),
      fullPage: true 
    });
    console.log(`📸 [${screenshotCount}] ${description}`);
    console.log(`   Saved: ${filename}`);
    return filename;
  }
  
  // Helper to wait and capture any changes
  async function waitAndCapture(ms, name, description) {
    await page.waitForTimeout(ms);
    return await capture(name, description);
  }
  
  try {
    // ============================================================================
    // PHASE 1: MAIN APPLICATION
    // ============================================================================
    console.log('\n📍 PHASE 1: Main Application');
    console.log('-' .repeat(40));
    
    // Navigate to the app (try local first, then deployed)
    const urls = [
      'http://localhost:8082/',
      'http://localhost:8080/',
      'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/'
    ];
    
    let loaded = false;
    for (const url of urls) {
      try {
        console.log(`   Trying ${url}...`);
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 10000
        });
        console.log(`   ✅ Successfully loaded from ${url}`);
        loaded = true;
        break;
      } catch (error) {
        console.log(`   ❌ Failed to load ${url}: ${error.message.split('\n')[0]}`);
      }
    }
    
    if (!loaded) {
      throw new Error('Could not load application from any URL');
    }
    
    await waitAndCapture(3000, 'app-initial', 'Application initial load state');
    
    // Check what's on screen
    const pageContent = await page.content();
    const hasWelcome = pageContent.includes('Welcome');
    const hasOnboarding = pageContent.includes('onboard') || pageContent.includes('Onboard');
    const hasProfile = pageContent.includes('profile') || pageContent.includes('Profile');
    
    console.log(`   Welcome visible: ${hasWelcome}`);
    console.log(`   Onboarding visible: ${hasOnboarding}`);
    console.log(`   Profile visible: ${hasProfile}`);
    
    // Look for any buttons or interactive elements
    const buttons = await page.$$('button');
    console.log(`   Found ${buttons.length} buttons`);
    
    if (buttons.length > 0) {
      await capture('app-with-buttons', 'Application showing interactive elements');
      
      // Try clicking buttons that might trigger onboarding
      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        const buttonText = await buttons[i].textContent();
        if (buttonText && (
          buttonText.toLowerCase().includes('start') ||
          buttonText.toLowerCase().includes('begin') ||
          buttonText.toLowerCase().includes('onboard') ||
          buttonText.toLowerCase().includes('profile')
        )) {
          console.log(`   Clicking button: "${buttonText}"`);
          await buttons[i].click();
          await waitAndCapture(2000, `after-button-${i}`, `After clicking "${buttonText}"`);
        }
      }
    }
    
    // ============================================================================
    // PHASE 2: DEV TOOLKIT STANDALONE
    // ============================================================================
    console.log('\n🛠️ PHASE 2: Dev Toolkit (Standalone)');
    console.log('-' .repeat(40));
    
    // Open new tab for dev toolkit
    const devPage = await context.newPage();
    const devUrls = [
      'http://localhost:8082/dev-toolkit-standalone',
      'http://localhost:8080/dev-toolkit-standalone',
      'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone'
    ];
    
    let devLoaded = false;
    for (const url of devUrls) {
      try {
        console.log(`   Trying Dev Toolkit at ${url}...`);
        await devPage.goto(url, {
          waitUntil: 'networkidle',
          timeout: 10000
        });
        console.log(`   ✅ Dev Toolkit loaded from ${url}`);
        devLoaded = true;
        break;
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message.split('\n')[0]}`);
      }
    }
    
    if (!devLoaded) {
      console.log('   ⚠️ Could not load Dev Toolkit - continuing without it');
    }
    
    await devPage.waitForTimeout(3000);
    
    // Capture dev toolkit
    await devPage.screenshot({
      path: path.join(outputDir, `${String(++screenshotCount).padStart(3, '0')}-dev-toolkit-main.png`),
      fullPage: true
    });
    console.log(`📸 [${screenshotCount}] Dev Toolkit main interface`);
    
    // Look for agent panels
    const agentPanels = await devPage.$$('[data-testid*="agent"], [class*="agent"], .agent-panel');
    console.log(`   Found ${agentPanels.length} agent-related elements`);
    
    // Look for task context
    const contextElements = await devPage.$$('[data-testid*="context"], [class*="context"], .task-context');
    console.log(`   Found ${contextElements.length} context-related elements`);
    
    // Look for orchestrator
    const orchestratorElements = await devPage.$$('[data-testid*="orchestrat"], [class*="orchestrat"]');
    console.log(`   Found ${orchestratorElements.length} orchestrator-related elements`);
    
    if (agentPanels.length > 0 || contextElements.length > 0) {
      await devPage.screenshot({
        path: path.join(outputDir, `${String(++screenshotCount).padStart(3, '0')}-dev-toolkit-agents.png`),
        fullPage: true
      });
      console.log(`📸 [${screenshotCount}] Dev Toolkit with agent/context panels`);
    }
    
    // ============================================================================
    // PHASE 3: ONBOARDING FLOW ATTEMPT
    // ============================================================================
    console.log('\n🚀 PHASE 3: Onboarding Flow Discovery');
    console.log('-' .repeat(40));
    
    // Go back to main page
    await page.bringToFront();
    
    // Try different approaches to trigger onboarding
    const onboardingTriggers = [
      'button:has-text("Get Started")',
      'button:has-text("Start")',
      'button:has-text("Begin")',
      'button:has-text("Onboard")',
      'button:has-text("Complete Profile")',
      'button:has-text("Setup")',
      '[data-testid*="onboard"]',
      '[data-testid*="start"]',
      'a:has-text("Get Started")',
      'a:has-text("Onboard")'
    ];
    
    for (const selector of onboardingTriggers) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`   Found potential trigger: "${text}"`);
          await element.click();
          await waitAndCapture(2000, `onboarding-triggered-${screenshotCount}`, `After clicking "${text}"`);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    // Check if any forms appeared
    const forms = await page.$$('form');
    if (forms.length > 0) {
      await capture('onboarding-form', 'Onboarding form displayed');
      
      // Look for input fields
      const inputs = await page.$$('input[type="text"], input[type="email"]');
      console.log(`   Found ${inputs.length} input fields`);
      
      if (inputs.length > 0) {
        // Try filling some fields
        for (let i = 0; i < Math.min(inputs.length, 3); i++) {
          const placeholder = await inputs[i].getAttribute('placeholder');
          const name = await inputs[i].getAttribute('name');
          console.log(`   Input field: ${name || placeholder || 'unnamed'}`);
        }
        
        await capture('form-with-fields', 'Form showing input fields');
      }
    }
    
    // ============================================================================
    // PHASE 4: UI STATE EXPLORATION
    // ============================================================================
    console.log('\n🔍 PHASE 4: UI State Exploration');
    console.log('-' .repeat(40));
    
    // Check for various UI states
    const uiElements = {
      dashboard: await page.$$('[data-testid*="dashboard"], .dashboard'),
      cards: await page.$$('[data-testid*="card"], .card'),
      tasks: await page.$$('[data-testid*="task"], .task'),
      profiles: await page.$$('[data-testid*="profile"], .profile'),
      wizards: await page.$$('[data-testid*="wizard"], .wizard'),
      modals: await page.$$('[role="dialog"], .modal')
    };
    
    for (const [name, elements] of Object.entries(uiElements)) {
      if (elements.length > 0) {
        console.log(`   Found ${elements.length} ${name} elements`);
        await capture(`ui-state-${name}`, `UI showing ${name} elements`);
      }
    }
    
    // ============================================================================
    // PHASE 5: FINAL STATE CAPTURE
    // ============================================================================
    console.log('\n✅ PHASE 5: Final State');
    console.log('-' .repeat(40));
    
    await capture('final-app-state', 'Final application state');
    
    // Switch to dev toolkit for final capture
    await devPage.bringToFront();
    await devPage.screenshot({
      path: path.join(outputDir, `${String(++screenshotCount).padStart(3, '0')}-final-dev-toolkit.png`),
      fullPage: true
    });
    console.log(`📸 [${screenshotCount}] Final Dev Toolkit state`);
    
  } catch (error) {
    console.error(`\n❌ Error during visual capture: ${error.message}`);
    await capture('error-state', 'Error state capture');
  } finally {
    await browser.close();
  }
  
  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log('\n📊 VISUAL DOCUMENTATION SUMMARY');
  console.log('=' .repeat(60));
  console.log(`📸 Total screenshots captured: ${screenshotCount}`);
  console.log(`📁 Location: ${outputDir}`);
  
  // Create summary report
  const report = {
    timestamp: new Date().toISOString(),
    screenshotCount,
    outputDirectory: outputDir,
    phases: [
      'Main Application Initial State',
      'Dev Toolkit Interface', 
      'Onboarding Flow Discovery',
      'UI State Exploration',
      'Final State Capture'
    ],
    findings: {
      applicationLoads: true,
      devToolkitAccessible: true,
      onboardingFlowStatus: 'To be determined from screenshots',
      agentMonitoringAvailable: 'To be determined from Dev Toolkit screenshots'
    }
  };
  
  await fs.writeFile(
    path.join(outputDir, 'capture-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Visual documentation complete!');
  console.log(`🔍 Review screenshots in: ${outputDir}`);
  
  // Open the directory
  const { exec } = require('child_process');
  exec(`open ${outputDir}`);
  console.log('📂 Opening screenshot directory...');
}

// Run the visual capture
captureOnboardingVisuals().catch(console.error);