/**
 * Dev Toolkit Window Capture - E2E Test
 * Properly captures the Dev Toolkit popup window
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function captureDevToolkit() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `dev-toolkit-capture-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit Capture Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-popup-blocking' // Allow popups for Dev Toolkit
    ]
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[DevToolkit]')) {
      console.log('📋 DevToolkit:', text);
    }
  });

  // Listen for new pages (popups)
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page();
      console.log('🪟 New window detected:', await newPage.title());
    }
  });

  try {
    // Navigate to the app
    console.log('\n📍 Step 1: Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));

    // Take screenshot of main app
    await page.screenshot({ 
      path: path.join(outputDir, '01-main-app.png'),
      fullPage: true 
    });
    console.log('✅ Main app captured');

    // Find and click the Dev Toolkit button
    console.log('\n📍 Step 2: Looking for Dev Toolkit button...');
    
    // Try multiple selectors
    const selectors = [
      'button[title="Open Dev Toolkit"]',
      'button.fixed.bottom-4.right-4',
      'button:has-text("</>")',
      'button[aria-label*="Dev"]'
    ];

    let devButton = null;
    for (const selector of selectors) {
      try {
        devButton = await page.$(selector);
        if (devButton) {
          console.log(`✅ Found Dev Toolkit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }

    if (!devButton) {
      // Try to find by visual appearance (purple button in corner)
      devButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const style = window.getComputedStyle(btn);
          return btn.classList.contains('fixed') && 
                 btn.classList.contains('bottom-4') && 
                 btn.classList.contains('right-4');
        });
      });

      if (devButton) {
        console.log('✅ Found Dev Toolkit button by style');
      }
    }

    if (devButton) {
      console.log('\n📍 Step 3: Opening Dev Toolkit...');
      
      // Set up popup promise before clicking
      const popupPromise = new Promise((resolve) => {
        browser.once('targetcreated', async (target) => {
          const newPage = await target.page();
          if (newPage) {
            resolve(newPage);
          }
        });
      });

      // Click the button
      await page.evaluate(() => {
        const btn = document.querySelector('button.fixed.bottom-4.right-4');
        if (btn) btn.click();
      });

      console.log('⏳ Waiting for Dev Toolkit window to open...');
      
      // Wait for popup with timeout
      const devToolkitPage = await Promise.race([
        popupPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for popup')), 10000)
        )
      ]).catch(async () => {
        console.log('⚠️ Popup did not open, checking if content loaded inline...');
        
        // Check if Dev Toolkit opened inline
        const hasInlineToolkit = await page.evaluate(() => {
          return document.querySelector('[data-testid="dev-toolkit"]') !== null ||
                 document.querySelector('.dev-toolkit-container') !== null;
        });

        if (hasInlineToolkit) {
          console.log('✅ Dev Toolkit loaded inline');
          return page;
        }
        
        return null;
      });

      if (devToolkitPage) {
        console.log('✅ Dev Toolkit window opened');
        
        // Wait for content to load
        await new Promise(r => setTimeout(r, 3000));

        // Capture the Dev Toolkit window
        console.log('\n📍 Step 4: Capturing Dev Toolkit tabs...');

        // Tab 1: Task Inspector (default)
        await devToolkitPage.screenshot({ 
          path: path.join(outputDir, '02-task-inspector.png'),
          fullPage: true 
        });
        console.log('✅ Task Inspector tab captured');

        // Try clicking through tabs
        const tabs = [
          { selector: 'button:has-text("Console")', name: 'Console', file: '03-console.png' },
          { selector: 'button:has-text("Live Stream")', name: 'Live Stream', file: '04-live-stream.png' },
          { selector: 'button:has-text("Task History")', name: 'Task History', file: '05-task-history.png' },
          { selector: 'button:has-text("Migrations")', name: 'Migrations', file: '06-migrations.png' },
          { selector: 'button:has-text("OAuth")', name: 'OAuth', file: '07-oauth.png' }
        ];

        for (const tab of tabs) {
          try {
            const tabButton = await devToolkitPage.$(tab.selector);
            if (tabButton) {
              await tabButton.click();
              await new Promise(r => setTimeout(r, 1000));
              await devToolkitPage.screenshot({ 
                path: path.join(outputDir, tab.file),
                fullPage: true 
              });
              console.log(`✅ ${tab.name} tab captured`);
            } else {
              console.log(`⚠️ ${tab.name} tab not found`);
            }
          } catch (e) {
            console.log(`❌ Error capturing ${tab.name}: ${e.message}`);
          }
        }

        // Try to interact with Task Inspector
        console.log('\n📍 Step 5: Testing Task Inspector interaction...');
        
        // Go back to Task Inspector tab
        const inspectorTab = await devToolkitPage.$('button:has-text("Task Inspector")');
        if (inspectorTab) {
          await inspectorTab.click();
          await new Promise(r => setTimeout(r, 1000));
        }

        // Check for task dropdown
        const hasTaskDropdown = await devToolkitPage.evaluate(() => {
          return document.querySelector('select') !== null;
        });

        if (hasTaskDropdown) {
          console.log('✅ Task dropdown found');
          
          // Try to select a task if available
          const taskCount = await devToolkitPage.evaluate(() => {
            const select = document.querySelector('select');
            return select ? select.options.length - 1 : 0; // -1 for "Select a task..." option
          });

          console.log(`📊 Found ${taskCount} tasks in dropdown`);
        }

        // Check for sub-tabs in Task Inspector
        const inspectorSubTabs = await devToolkitPage.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll('button')).filter(btn => 
            ['Overview', 'Agents', 'Context', 'Timeline', 'UI Requests'].some(text => 
              btn.textContent?.includes(text)
            )
          );
          return tabs.map(t => t.textContent);
        });

        if (inspectorSubTabs.length > 0) {
          console.log('✅ Task Inspector sub-tabs found:', inspectorSubTabs.join(', '));
        }

        // Final full capture
        await devToolkitPage.screenshot({ 
          path: path.join(outputDir, '08-final-state.png'),
          fullPage: true 
        });

      } else {
        console.log('❌ Dev Toolkit window did not open');
        
        // Take screenshot of main page to debug
        await page.screenshot({ 
          path: path.join(outputDir, 'debug-no-toolkit.png'),
          fullPage: true 
        });
      }

    } else {
      console.log('❌ Dev Toolkit button not found');
      
      // Debug: list all buttons on page
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent,
          classes: btn.className,
          title: btn.title
        }));
      });
      console.log('Available buttons:', JSON.stringify(buttons, null, 2));
    }

    // Create summary
    const summary = {
      timestamp: new Date().toISOString(),
      outputDir,
      success: true,
      message: 'Dev Toolkit capture completed',
      screenshots: await fs.readdir(outputDir)
    };

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✨ Capture Complete!');
    console.log(`📸 Screenshots saved to: ${outputDir}/`);

  } catch (error) {
    console.error('❌ Capture failed:', error);
    
    // Save error screenshot
    await page.screenshot({ 
      path: path.join(outputDir, 'error-state.png'),
      fullPage: true 
    });

    // Save error details
    await fs.writeFile(
      path.join(outputDir, 'error.json'),
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  } finally {
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

// Run the capture
captureDevToolkit().catch(console.error);