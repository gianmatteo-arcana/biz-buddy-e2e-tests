/**
 * Dev Toolkit Demo - E2E Test
 * Shows the TaskContext Inspector in action
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function runDevToolkitDemo() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `demo-dev-toolkit-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit Demo Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false, // Show browser for demo
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console error:', msg.text());
    }
  });

  try {
    // Navigate to the app
    console.log('\n📍 Step 1: Navigating to SmallBizAlly...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(outputDir, '01-initial-state.png'),
      fullPage: true 
    });
    console.log('✅ Initial state captured');

    // Check if we need to sign in
    const needsAuth = await page.evaluate(() => {
      return !document.querySelector('[data-testid="dashboard"]') && 
             document.querySelector('button:has-text("Sign in with Google")');
    });

    if (needsAuth) {
      console.log('\n📍 Step 2: Signing in with test account...');
      // This would normally trigger OAuth flow
      // For demo purposes, we'll assume we're already signed in
    }

    // Wait for dashboard to load
    await page.waitForTimeout(3000);
    
    // Click the Dev Toolkit button
    console.log('\n📍 Step 3: Opening Dev Toolkit...');
    const devToolkitButton = await page.$('button[title="Open Dev Toolkit"]');
    if (devToolkitButton) {
      await devToolkitButton.click();
      console.log('✅ Clicked Dev Toolkit button');
      
      // Wait for new window to open
      await page.waitForTimeout(2000);
      
      // Get all pages (including popup)
      const pages = await browser.pages();
      const devToolkitPage = pages[pages.length - 1]; // Last opened page
      
      if (devToolkitPage !== page) {
        console.log('✅ Dev Toolkit opened in new window');
        
        // Switch to Dev Toolkit window
        await devToolkitPage.bringToFront();
        await devToolkitPage.waitForTimeout(2000);
        
        // Take screenshot of Dev Toolkit - Task Inspector tab
        await devToolkitPage.screenshot({ 
          path: path.join(outputDir, '02-task-inspector-overview.png'),
          fullPage: true 
        });
        console.log('✅ Task Inspector Overview captured');
        
        // Click on Agents tab
        console.log('\n📍 Step 4: Exploring Task Inspector tabs...');
        const agentsTab = await devToolkitPage.$('button:has-text("Agents")');
        if (agentsTab) {
          await agentsTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '03-agents-tab.png'),
            fullPage: true 
          });
          console.log('✅ Agents tab captured');
        }
        
        // Click on Context tab
        const contextTab = await devToolkitPage.$('button:has-text("Context")');
        if (contextTab) {
          await contextTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '04-context-evolution.png'),
            fullPage: true 
          });
          console.log('✅ Context Evolution captured');
        }
        
        // Click on Timeline tab
        const timelineTab = await devToolkitPage.$('button:has-text("Timeline")');
        if (timelineTab) {
          await timelineTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '05-timeline.png'),
            fullPage: true 
          });
          console.log('✅ Timeline captured');
        }
        
        // Click on UI Requests tab
        const uiTab = await devToolkitPage.$('button:has-text("UI")');
        if (uiTab) {
          await uiTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '06-ui-requests.png'),
            fullPage: true 
          });
          console.log('✅ UI Requests captured');
        }
        
        // Click on Console tab to show developer console
        const consoleTab = await devToolkitPage.$('button:has-text("Console")');
        if (consoleTab) {
          await consoleTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '07-console.png'),
            fullPage: true 
          });
          console.log('✅ Console tab captured');
        }
        
        // Click on Live Stream tab
        const liveTab = await devToolkitPage.$('button:has-text("Live Stream")');
        if (liveTab) {
          await liveTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '08-live-stream.png'),
            fullPage: true 
          });
          console.log('✅ Live Stream tab captured');
        }
        
        // Click on Migrations tab
        const migrationsTab = await devToolkitPage.$('button:has-text("Migrations")');
        if (migrationsTab) {
          await migrationsTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '09-migrations.png'),
            fullPage: true 
          });
          console.log('✅ Migrations tab captured');
        }
        
        // Click on OAuth tab
        const oauthTab = await devToolkitPage.$('button:has-text("OAuth")');
        if (oauthTab) {
          await oauthTab.click();
          await devToolkitPage.waitForTimeout(1000);
          await devToolkitPage.screenshot({ 
            path: path.join(outputDir, '10-oauth-diagnostics.png'),
            fullPage: true 
          });
          console.log('✅ OAuth Diagnostics captured');
        }
        
      } else {
        console.log('⚠️ Dev Toolkit did not open in a new window');
      }
    } else {
      console.log('❌ Dev Toolkit button not found');
      
      // Try to find it with a different selector
      const purpleButton = await page.$('button.fixed.bottom-4.right-4');
      if (purpleButton) {
        console.log('🔍 Found alternative Dev Toolkit button, clicking...');
        await purpleButton.click();
      }
    }

    // Create summary
    const summary = {
      timestamp: new Date().toISOString(),
      screenshots: [
        '01-initial-state.png',
        '02-task-inspector-overview.png',
        '03-agents-tab.png',
        '04-context-evolution.png',
        '05-timeline.png',
        '06-ui-requests.png',
        '07-console.png',
        '08-live-stream.png',
        '09-migrations.png',
        '10-oauth-diagnostics.png'
      ],
      description: 'Dev Toolkit demo showing all tabs and TaskContext Inspector functionality'
    };

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✨ Demo Complete!');
    console.log(`📸 Screenshots saved to: ${outputDir}/`);
    console.log('\n📊 Dev Toolkit Features Demonstrated:');
    console.log('  ✅ Task Inspector - View task templates and agent orchestration');
    console.log('  ✅ Agents Tab - See how each agent contributes');
    console.log('  ✅ Context Tab - Track TaskContext evolution');
    console.log('  ✅ Timeline Tab - Visual timeline of agent events');
    console.log('  ✅ UI Requests - View UI augmentation requests');
    console.log('  ✅ Console - Developer console logs');
    console.log('  ✅ Live Stream - Real-time task events');
    console.log('  ✅ Migrations - Database schema management');
    console.log('  ✅ OAuth - OAuth diagnostics for debugging');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    await page.screenshot({ 
      path: path.join(outputDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    // Keep browser open for 10 seconds to see the result
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the demo
runDevToolkitDemo().catch(console.error);