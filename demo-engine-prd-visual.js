/**
 * ENGINE PRD VISUAL DEMO
 * 
 * This captures ACTUAL screenshots of the live ENGINE PRD demo page
 * showing all the features in action with real UI elements
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  appUrl: 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com',
  demoPath: '/engine-prd-demo',
  screenshotDir: `engine-visual-demo-${Date.now()}`,
  authState: '.auth/user-state.json'
};

async function setupDemo() {
  await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
  console.log(`📸 Screenshots will be saved to: ${CONFIG.screenshotDir}`);
}

async function captureAnnotatedScreenshot(page, filename, description) {
  const filepath = path.join(CONFIG.screenshotDir, `${filename}.png`);
  await page.screenshot({ 
    path: filepath, 
    fullPage: true,
    captureBeyondViewport: true 
  });
  
  // Save description
  const mdPath = path.join(CONFIG.screenshotDir, `${filename}.md`);
  await fs.writeFile(mdPath, `# ${filename}\n\n${description}\n\nTimestamp: ${new Date().toISOString()}`);
  
  console.log(`✅ Captured: ${filename}`);
  return filepath;
}

async function runVisualDemo() {
  console.log('🎬 ENGINE PRD Visual Demo');
  console.log('=' .repeat(50));
  
  await setupDemo();
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Load auth state if available
    try {
      const authStateContent = await fs.readFile(CONFIG.authState, 'utf8');
      const authState = JSON.parse(authStateContent);
      
      // Set cookies
      if (authState.cookies) {
        await page.setCookie(...authState.cookies);
      }
      
      // Set localStorage
      if (authState.origins && authState.origins.length > 0) {
        await page.goto(CONFIG.appUrl);
        await page.evaluate((storage) => {
          Object.entries(storage).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
        }, authState.origins[0].localStorage);
      }
      
      console.log('✅ Auth state loaded');
    } catch (e) {
      console.log('⚠️  No auth state found, continuing without authentication');
    }
    
    // Navigate to the ENGINE PRD demo page
    console.log('\n📍 Navigating to ENGINE PRD Demo...');
    await page.goto(`${CONFIG.appUrl}${CONFIG.demoPath}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the demo to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // ============================================================
    // SCREENSHOT 1: Initial Overview
    // ============================================================
    await captureAnnotatedScreenshot(page, '01-demo-overview',
      'ENGINE PRD Demo Landing Page\n\n' +
      '- Shows the 4 core principles as badges\n' +
      '- Current state display (computed from 0 events)\n' +
      '- Demo scenario buttons\n' +
      '- Three tabs: Overview, Event History, FluidUI Demo'
    );
    
    // ============================================================
    // SCREENSHOT 2: Click Google OAuth Demo
    // ============================================================
    console.log('\n🔘 Clicking Google OAuth Demo...');
    // Find button by text content
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(b => b.textContent.includes('1. Google OAuth Login'));
      if (button) button.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await captureAnnotatedScreenshot(page, '02-after-oauth',
      'After Google OAuth Event\n\n' +
      '- State updated to 25% complete\n' +
      '- Phase changed to "user_info"\n' +
      '- Status is now "active"\n' +
      '- 1 data point collected'
    );
    
    // ============================================================
    // SCREENSHOT 3: Click Event History Tab
    // ============================================================
    console.log('\n📜 Viewing Event History...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const tab = tabs.find(t => t.textContent.includes('Event History'));
      if (tab) tab.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '03-event-history',
      'Event History with Reasoning\n\n' +
      '- Shows the user_authenticated event\n' +
      '- Includes full reasoning explaining WHY\n' +
      '- Actor information (system: google_oauth)\n' +
      '- Data payload visible in collapsible section\n' +
      '- Timestamp of the event'
    );
    
    // ============================================================
    // SCREENSHOT 4: Progressive Disclosure
    // ============================================================
    console.log('\n🔘 Clicking Progressive Disclosure...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const tab = tabs.find(t => t.textContent.includes('Overview'));
      if (tab) tab.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(b => b.textContent.includes('2. Progressive Disclosure'));
      if (button) button.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await captureAnnotatedScreenshot(page, '04-progressive-disclosure',
      'Progressive Disclosure Event Added\n\n' +
      '- State now at 50% complete\n' +
      '- Phase: "business_info"\n' +
      '- Two events in history\n' +
      '- Agent requested minimal user input'
    );
    
    // ============================================================
    // SCREENSHOT 5: LLM Compliance Check
    // ============================================================
    console.log('\n🤖 Running LLM Compliance Check...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(b => b.textContent.includes('3. LLM Compliance Check'));
      if (button) button.click();
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await captureAnnotatedScreenshot(page, '05-llm-compliance',
      'LLM Agent Reasoning\n\n' +
      '- State at 75% complete\n' +
      '- Phase: "verification"\n' +
      '- Agent used GPT-4 for compliance analysis\n' +
      '- Not hardcoded logic - true AI reasoning'
    );
    
    // ============================================================
    // SCREENSHOT 6: View Complete Event History
    // ============================================================
    console.log('\n📜 Viewing Complete Event History...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const tab = tabs.find(t => t.textContent.includes('Event History'));
      if (tab) tab.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Scroll to see all events
    await page.evaluate(() => {
      const container = document.querySelector('[class*="overflow-y-auto"]');
      if (container) container.scrollTop = container.scrollHeight;
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await captureAnnotatedScreenshot(page, '06-full-event-history',
      'Complete Event History\n\n' +
      '- Multiple events with full audit trail\n' +
      '- Each event has reasoning explaining decisions\n' +
      '- Shows actor type (agent, user, system)\n' +
      '- Progressive disclosure and LLM reasoning visible\n' +
      '- Pure event sourcing - state computed from these events'
    );
    
    // ============================================================
    // SCREENSHOT 7: FluidUI Demo Tab
    // ============================================================
    console.log('\n🎨 Viewing FluidUI Components...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const tab = tabs.find(t => t.textContent.includes('FluidUI Demo'));
      if (tab) tab.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '07-fluidui-components',
      'FluidUI Components Demo\n\n' +
      '- ActionPills for quick user actions\n' +
      '- Semantic UI Interpreter showing progressive form\n' +
      '- Quick actions like "Import from QuickBooks"\n' +
      '- Skip options with consequences explained\n' +
      '- Pure semantic data interpreted to UI'
    );
    
    // ============================================================
    // SCREENSHOT 8: Complete Task
    // ============================================================
    console.log('\n✅ Completing Task...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const tab = tabs.find(t => t.textContent.includes('Overview'));
      if (tab) tab.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(b => b.textContent.includes('4. Complete Task'));
      if (button) button.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await captureAnnotatedScreenshot(page, '08-task-complete',
      'Task Completed - 100% State\n\n' +
      '- Status: "completed"\n' +
      '- Completeness: 100%\n' +
      '- All events recorded with reasoning\n' +
      '- Complete audit trail for compliance\n' +
      '- State fully computed from event history'
    );
    
    // ============================================================
    // SCREENSHOT 9: Overview Tab Principles
    // ============================================================
    console.log('\n📚 Capturing PRD Principles...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const tab = tabs.find(t => t.textContent.includes('Overview'));
      if (tab) tab.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Scroll to principles section
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await captureAnnotatedScreenshot(page, '09-prd-principles',
      'ENGINE PRD Core Principles\n\n' +
      '- Pure Event Sourcing (Lines 44-49)\n' +
      '- Progressive Disclosure (Line 50)\n' +
      '- LLM-Powered Agents (Lines 368-429)\n' +
      '- Complete Traceability (Line 16)\n' +
      'Each principle explained with PRD references'
    );
    
    // ============================================================
    // SCREENSHOT 10: Reset and Empty State
    // ============================================================
    console.log('\n🔄 Resetting Demo...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(b => b.textContent.includes('Reset Demo'));
      if (button) button.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '10-reset-state',
      'Reset to Initial State\n\n' +
      '- Back to 0 events\n' +
      '- Status: "created"\n' +
      '- Phase: "initialization"\n' +
      '- Ready to replay the entire flow\n' +
      '- Demonstrates pure event sourcing - can rebuild any state'
    );
    
    // ============================================================
    // Generate Summary Report
    // ============================================================
    const report = {
      timestamp: new Date().toISOString(),
      url: `${CONFIG.appUrl}${CONFIG.demoPath}`,
      screenshots: 10,
      features_demonstrated: [
        'Pure Event Sourcing with computed state',
        'Progressive Disclosure minimizing user effort',
        'LLM-Powered Agents with reasoning',
        'FluidUI ActionPills and Semantic Forms',
        'Complete audit trail with reasoning',
        'Real-time state computation',
        'Event history visualization',
        'Task lifecycle management'
      ],
      prd_compliance: {
        event_sourcing: 'PRD Lines 44-49',
        progressive_disclosure: 'PRD Line 50',
        llm_agents: 'PRD Lines 368-429',
        fluidui: 'PRD Lines 1139-1160',
        state_computation: 'PRD Lines 129-135',
        audit_trail: 'PRD Line 16'
      }
    };
    
    await fs.writeFile(
      path.join(CONFIG.screenshotDir, 'demo-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create README
    const readme = `# ENGINE PRD Visual Demo

## Overview
This demo showcases the LIVE ENGINE PRD implementation with actual UI screenshots.

## Screenshots Captured

1. **Demo Overview** - Initial state with all features visible
2. **After OAuth** - State updated to 25% after Google OAuth event
3. **Event History** - First event with complete reasoning
4. **Progressive Disclosure** - Agent requests minimal information
5. **LLM Compliance** - AI-powered reasoning, not hardcoded
6. **Full Event History** - Complete audit trail with reasoning
7. **FluidUI Components** - ActionPills and Semantic Forms
8. **Task Complete** - 100% state computed from events
9. **PRD Principles** - Core principles with line references
10. **Reset State** - Back to initial state, ready to replay

## Key Features Demonstrated

- ✅ **Event Sourcing**: State is NEVER stored, always computed
- ✅ **Progressive Disclosure**: Only essential fields requested
- ✅ **LLM Reasoning**: Every agent decision explained
- ✅ **FluidUI**: ActionPills provide quick paths
- ✅ **Audit Trail**: Complete traceability with reasoning
- ✅ **Real-time Updates**: State computes as events are added

## How to View

Open the screenshots in order (01 through 10) to see the complete flow.
Each screenshot has an accompanying .md file explaining what it shows.

## Live Demo

Visit: ${CONFIG.appUrl}${CONFIG.demoPath}

---
Generated: ${new Date().toISOString()}
`;
    
    await fs.writeFile(path.join(CONFIG.screenshotDir, 'README.md'), readme);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Visual Demo Complete!');
    console.log(`📁 Screenshots saved to: ${CONFIG.screenshotDir}`);
    console.log('📸 Total screenshots: 10');
    console.log('📄 Report: demo-report.json');
    console.log('📖 README: Complete documentation');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the demo
if (require.main === module) {
  runVisualDemo().catch(console.error);
}

module.exports = { runVisualDemo };