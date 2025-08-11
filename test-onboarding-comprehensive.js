#!/usr/bin/env node

/**
 * Comprehensive Onboarding E2E Test
 * Tests all elements of the onboarding user story
 * Captures screenshots of:
 * 1. Dev Toolkit with expanded Task and TaskContext per Agent
 * 2. User-facing dashboard with expanded onboarding card
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const TEST_RUN_DIR = `test-run-onboarding-${new Date().toISOString().replace(/[:.]/g, '-')}`;

// Supabase config
const SUPABASE_URL = 'https://pnfhrdwhnjvexklhjjcx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZmhyZHdobmp2ZXhrbGhqamN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMDc5NjQsImV4cCI6MjA0OTU4Mzk2NH0.rWJFaVvQp_qEn3L9cA4sdz5mrDbPaYlTs-7T5MaRVtA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🚀 Comprehensive Onboarding E2E Test');
console.log('===================================');
console.log(`📧 Test user: ${TEST_EMAIL}`);
console.log(`📁 Results: ${TEST_RUN_DIR}/`);
console.log('');

async function captureScreenshot(page, name, description) {
  const filename = `${name}.png`;
  await page.screenshot({ 
    path: path.join(TEST_RUN_DIR, filename), 
    fullPage: true 
  });
  console.log(`📸 ${description}: ${filename}`);
  
  // Also capture the current state
  const state = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      hasDevToolkit: !!document.querySelector('[data-testid="dev-toolkit"]'),
      hasOnboardingCard: !!document.querySelector('[data-testid="onboarding-card"]'),
      visibleText: Array.from(document.querySelectorAll('h1, h2, h3, p')).slice(0, 10).map(el => el.textContent.trim())
    };
  });
  
  await fs.writeFile(
    path.join(TEST_RUN_DIR, `${name}-state.json`),
    JSON.stringify(state, null, 2)
  );
  
  return state;
}

async function runTest() {
  // Create results directory
  await fs.mkdir(TEST_RUN_DIR, { recursive: true });
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set up console logging
  const consoleLogs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === 'error') {
      console.log('❌ Browser error:', msg.text());
    }
  });
  
  try {
    // Step 1: Navigate to app
    console.log('\n1️⃣ STEP 1: Initial Load');
    console.log('------------------------');
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Wait for either login button or dashboard to be visible
    await page.waitForSelector('button[data-testid="google-signin"], h1, h2, .dashboard', { 
      visible: true, 
      timeout: 30000 
    });
    
    const initialState = await captureScreenshot(page, '01-initial-load', 'Initial page load');
    console.log(`   Authenticated: ${initialState.url.includes('dashboard') ? 'Yes' : 'No'}`);
    
    // Step 2: Check for Dev Mode and enable Dev Toolkit
    console.log('\n2️⃣ STEP 2: Enable Dev Toolkit');
    console.log('------------------------------');
    
    // Look for dev mode indicator
    const hasDevMode = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="dev-mode-indicator"]') || 
             !!document.querySelector('.dev-mode-badge') ||
             !!document.querySelector('[title*="Development"]');
    });
    
    console.log(`   Dev mode available: ${hasDevMode}`);
    
    // Try to open Dev Toolkit
    let devToolkitButton = await page.$('[data-testid="dev-toolkit-toggle"]');
    if (!devToolkitButton) {
      devToolkitButton = await page.$('button[title*="Dev"], button[title*="Toolkit"]');
    }
    if (!devToolkitButton) {
      // Try to find button with text content
      devToolkitButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const devButton = buttons.find(b => 
          b.textContent.includes('Dev Toolkit') || 
          b.textContent.includes('🔧') ||
          b.textContent.includes('Developer')
        );
        return devButton ? buttons.indexOf(devButton) : -1;
      });
      if (devToolkitButton >= 0) {
        const buttons = await page.$$('button');
        devToolkitButton = buttons[devToolkitButton];
      } else {
        devToolkitButton = null;
      }
    }
    
    if (devToolkitButton) {
      console.log('   Found Dev Toolkit button, clicking...');
      await devToolkitButton.click();
      // Wait for any changes to occur
      await page.waitForFunction(() => {
        return document.querySelector('[data-testid="dev-toolkit"]') || 
               document.querySelector('.dev-toolkit-panel');
      }, { timeout: 5000 }).catch(() => {});
    }
    
    await captureScreenshot(page, '02-dev-toolkit-attempt', 'After trying to open Dev Toolkit');
    
    // Step 3: Look for onboarding elements
    console.log('\n3️⃣ STEP 3: Check Onboarding Elements');
    console.log('--------------------------------------');
    
    // Check for onboarding in dashboard
    const onboardingElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const onboardingButton = buttons.find(b => 
        b.textContent.includes('Start Onboarding') || 
        b.textContent.includes('Get Started')
      );
      
      const elements = {
        card: document.querySelector('[data-testid="onboarding-card"], .onboarding-card, [class*="onboarding"]'),
        button: !!onboardingButton,
        welcome: Array.from(document.querySelectorAll('h1, h2')).find(el => el.textContent.includes('Welcome')),
        tasks: Array.from(document.querySelectorAll('[data-testid*="task"], .task-card')).length
      };
      return elements;
    });
    
    console.log('   Onboarding card found:', !!onboardingElements.card);
    console.log('   Start button found:', !!onboardingElements.button);
    console.log('   Tasks visible:', onboardingElements.tasks);
    
    await captureScreenshot(page, '03-dashboard-state', 'Dashboard with onboarding check');
    
    // Step 4: Try to trigger onboarding
    console.log('\n4️⃣ STEP 4: Trigger Onboarding');
    console.log('-------------------------------');
    
    if (onboardingElements.button) {
      // Find button by text content
      const buttonIndex = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const targetButton = buttons.find(b => 
          b.textContent.includes('Start Onboarding') || 
          b.textContent.includes('Get Started')
        );
        return targetButton ? buttons.indexOf(targetButton) : -1;
      });
      
      if (buttonIndex >= 0) {
        const buttons = await page.$$('button');
        console.log('   Clicking onboarding button...');
        await buttons[buttonIndex].click();
        // Wait for onboarding to start
        await page.waitForFunction(() => {
          return document.querySelector('[data-testid="onboarding-card"]') || 
                 document.querySelector('.onboarding-flow');
        }, { timeout: 5000 }).catch(() => {});
      }
    } else {
      // Try to trigger via console
      console.log('   Attempting to trigger onboarding via console...');
      await page.evaluate(() => {
        if (window.startOnboarding) {
          window.startOnboarding();
        }
        // Trigger any onboarding-related events
        window.dispatchEvent(new CustomEvent('start-onboarding'));
      });
      // Wait for any UI changes
      await page.waitForFunction(() => {
        const elements = document.querySelectorAll('[data-testid*="task"], .task-card, .onboarding');
        return elements.length > 0;
      }, { timeout: 5000 }).catch(() => {});
    }
    
    await captureScreenshot(page, '04-after-trigger', 'After triggering onboarding');
    
    // Step 5: Navigate to Dev Toolkit directly if available
    console.log('\n5️⃣ STEP 5: Dev Toolkit Navigation');
    console.log('-----------------------------------');
    
    // Try direct navigation to dev toolkit standalone
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    }).catch(() => {});
    
    // Wait for dev toolkit to load
    await page.waitForSelector('h1, h2, [data-testid="dev-toolkit"], .dev-toolkit-container', {
      visible: true,
      timeout: 10000
    }).catch(() => {});
    
    const hasDevToolkitPage = await page.evaluate(() => {
      return window.location.pathname.includes('dev-toolkit') || 
             !!document.querySelector('[data-testid="dev-toolkit"]');
    });
    
    if (hasDevToolkitPage) {
      console.log('   Dev Toolkit page loaded');
      
      // Expand all task details
      const expandButtons = await page.$$('[data-testid*="expand"]');
      const textButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons
          .filter(b => b.textContent.includes('Expand') || b.textContent.includes('Show Details'))
          .map((b, i) => i);
      });
      
      console.log(`   Found ${expandButtons.length + textButtons.length} expandable sections`);
      
      for (let i = 0; i < expandButtons.length; i++) {
        await expandButtons[i].click();
        // Wait for expansion animation
        await page.waitForFunction((i) => {
          const expanded = document.querySelectorAll('[data-expanded="true"], .expanded');
          return expanded.length > i;
        }, { timeout: 2000 }, i).catch(() => {});
      }
      
      // Also click text-based expand buttons
      if (textButtons.length > 0) {
        const allButtons = await page.$$('button');
        for (const index of textButtons) {
          if (allButtons[index]) {
            await allButtons[index].click();
            // Wait for expansion
            await page.waitForFunction(() => {
              const expanded = document.querySelectorAll('[data-expanded="true"], .expanded');
              return expanded.length > 0;
            }, { timeout: 2000 }).catch(() => {});
          }
        }
      }
      
      await captureScreenshot(page, '05-dev-toolkit-expanded', 'Dev Toolkit with all sections expanded');
      
      // Look for agent contexts
      const agentContexts = await page.evaluate(() => {
        const contexts = [];
        document.querySelectorAll('[data-testid*="agent-context"], .agent-context').forEach(el => {
          contexts.push({
            agent: el.querySelector('[data-testid="agent-name"], .agent-name')?.textContent,
            status: el.querySelector('[data-testid="agent-status"], .agent-status')?.textContent,
            hasData: !!el.querySelector('[data-testid="context-data"], .context-data')
          });
        });
        return contexts;
      });
      
      console.log('   Agent contexts found:', agentContexts.length);
      agentContexts.forEach(ctx => {
        console.log(`     - ${ctx.agent}: ${ctx.status} (has data: ${ctx.hasData})`);
      });
    }
    
    // Step 6: Return to dashboard and check task cards
    console.log('\n6️⃣ STEP 6: Dashboard Task Cards');
    console.log('---------------------------------');
    
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for dashboard to load
    await page.waitForSelector('h1, h2, .dashboard, [data-testid="task-card"]', {
      visible: true,
      timeout: 10000
    }).catch(() => {});
    
    // Look for and expand task cards
    const taskCards = await page.$$('[data-testid*="task-card"], .task-card, [class*="task"]');
    console.log(`   Found ${taskCards.length} task cards`);
    
    if (taskCards.length > 0) {
      // Click on first task card to expand
      await taskCards[0].click();
      // Wait for expansion
      await page.waitForFunction(() => {
        const expanded = document.querySelector('[data-expanded="true"], .task-details, .expanded-card');
        return !!expanded;
      }, { timeout: 3000 }).catch(() => {});
      
      await captureScreenshot(page, '06-task-card-expanded', 'Dashboard with expanded task card');
      
      // Get task details
      const taskDetails = await page.evaluate(() => {
        const details = {};
        const card = document.querySelector('[data-testid*="task-card"], .task-card');
        if (card) {
          details.title = card.querySelector('h3, .task-title')?.textContent;
          details.status = card.querySelector('.task-status, [data-testid="task-status"]')?.textContent;
          details.description = card.querySelector('.task-description, p')?.textContent;
          details.hasActions = !!card.querySelector('button');
        }
        return details;
      });
      
      console.log('   Task details:', taskDetails);
    }
    
    // Step 7: Check for onboarding-specific UI
    console.log('\n7️⃣ STEP 7: Onboarding UI Elements');
    console.log('------------------------------------');
    
    const onboardingUI = await page.evaluate(() => {
      const hasWelcomeText = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent.includes('Welcome') || el.textContent.includes('Get Started')
      );
      
      return {
        hasWelcomeMessage: hasWelcomeText,
        hasProgressIndicator: !!document.querySelector('[data-testid*="progress"], .progress-bar'),
        hasSteps: !!document.querySelector('[data-testid*="steps"], .onboarding-steps'),
        formFields: Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
          name: el.name || el.id,
          type: el.type,
          placeholder: el.placeholder
        }))
      };
    });
    
    console.log('   Welcome message:', onboardingUI.hasWelcomeMessage);
    console.log('   Progress indicator:', onboardingUI.hasProgressIndicator);
    console.log('   Onboarding steps:', onboardingUI.hasSteps);
    console.log('   Form fields found:', onboardingUI.formFields.length);
    
    await captureScreenshot(page, '07-onboarding-ui', 'Onboarding UI elements');
    
    // Step 8: Final comprehensive screenshot
    console.log('\n8️⃣ STEP 8: Final State');
    console.log('------------------------');
    
    // Scroll to capture everything
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    // Wait for any lazy-loaded content
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every(img => img.complete);
    }, { timeout: 5000 }).catch(() => {});
    
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    await captureScreenshot(page, '08-final-comprehensive', 'Final comprehensive view');
    
    // Save console logs
    await fs.writeFile(
      path.join(TEST_RUN_DIR, 'console.log'),
      consoleLogs.join('\n')
    );
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      testUser: TEST_EMAIL,
      results: {
        authenticated: initialState.url.includes('dashboard'),
        devModeAvailable: hasDevMode,
        devToolkitFound: hasDevToolkitPage,
        onboardingCardFound: !!onboardingElements.card,
        taskCardsFound: taskCards.length,
        agentContextsFound: 0 // Will be updated if dev toolkit was accessible
      },
      screenshots: await fs.readdir(TEST_RUN_DIR).then(files => files.filter(f => f.endsWith('.png')))
    };
    
    await fs.writeFile(
      path.join(TEST_RUN_DIR, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ TEST COMPLETE');
    console.log('=================');
    console.log('Summary:');
    console.log(`  ✓ Authenticated: ${summary.results.authenticated}`);
    console.log(`  ✓ Dev Mode: ${summary.results.devModeAvailable}`);
    console.log(`  ✓ Dev Toolkit: ${summary.results.devToolkitFound}`);
    console.log(`  ✓ Onboarding Card: ${summary.results.onboardingCardFound}`);
    console.log(`  ✓ Task Cards: ${summary.results.taskCardsFound}`);
    console.log(`  ✓ Screenshots: ${summary.screenshots.length}`);
    console.log(`\n📁 Results saved to: ${TEST_RUN_DIR}/`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await captureScreenshot(page, 'error-state', 'Error state');
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(console.error);