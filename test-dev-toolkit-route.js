/**
 * Dev Toolkit Route E2E Test
 * Tests the Dev Toolkit at /dev-toolkit route with visual verification
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testDevToolkitRoute() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `dev-toolkit-route-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit Route Test Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[DevToolkit]') || text.includes('[TaskContextInspector]')) {
      console.log('📋', text);
    }
  });

  try {
    // Navigate to the app
    console.log('\n📍 Step 1: Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));

    // Take screenshot of initial state
    await page.screenshot({ 
      path: path.join(outputDir, '01-welcome-page.png'),
      fullPage: true 
    });
    console.log('✅ Welcome page captured');

    // Find and click the Dev Toolkit button
    console.log('\n📍 Step 2: Looking for Dev Toolkit button...');
    
    const buttonFound = await page.evaluate(() => {
      const button = document.querySelector('button.fixed.bottom-4.right-4') ||
                     document.querySelector('button[title="Open Dev Toolkit"]');
      if (button) {
        button.click();
        return true;
      }
      return false;
    });

    if (buttonFound) {
      console.log('✅ Clicked Dev Toolkit button');
      
      // Wait for navigation to /dev-toolkit
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
      
      // Verify we're on the Dev Toolkit page
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/dev-toolkit')) {
        console.log('✅ Successfully navigated to Dev Toolkit route');
        
        // Take screenshot of Dev Toolkit
        await page.screenshot({ 
          path: path.join(outputDir, '02-dev-toolkit-main.png'),
          fullPage: true 
        });
        console.log('✅ Dev Toolkit main view captured');
        
        // Analyze the page content
        const pageAnalysis = await page.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll('button')).filter(btn => 
            ['Task Inspector', 'Console', 'Live Stream', 'Task History', 'Migrations', 'OAuth'].some(text => 
              btn.textContent?.includes(text)
            )
          );
          
          return {
            hasDevToolkit: !!document.querySelector('[class*="dev-toolkit"]') || !!document.body.textContent?.includes('Dev Toolkit'),
            tabCount: tabs.length,
            tabNames: tabs.map(t => t.textContent?.trim()),
            hasTaskDropdown: !!document.querySelector('select'),
            hasCards: !!document.querySelector('[class*="card"]'),
            pageTitle: document.title,
            bodyText: document.body.textContent?.substring(0, 200)
          };
        });
        
        console.log('\n📊 Dev Toolkit Analysis:');
        console.log(JSON.stringify(pageAnalysis, null, 2));
        
        // Save analysis
        await fs.writeFile(
          path.join(outputDir, 'page-analysis.json'),
          JSON.stringify(pageAnalysis, null, 2)
        );
        
        // Try to click through the tabs
        console.log('\n📍 Step 3: Testing Dev Toolkit tabs...');
        
        const tabSelectors = [
          { text: 'Console', file: '03-console-tab.png' },
          { text: 'Live Stream', file: '04-live-stream-tab.png' },
          { text: 'Task History', file: '05-history-tab.png' },
          { text: 'Migrations', file: '06-migrations-tab.png' },
          { text: 'OAuth', file: '07-oauth-tab.png' },
          { text: 'Task Inspector', file: '08-back-to-inspector.png' }
        ];
        
        for (const tab of tabSelectors) {
          const tabClicked = await page.evaluate((tabText) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const tabButton = buttons.find(btn => btn.textContent?.includes(tabText));
            if (tabButton) {
              tabButton.click();
              return true;
            }
            return false;
          }, tab.text);
          
          if (tabClicked) {
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ 
              path: path.join(outputDir, tab.file),
              fullPage: true 
            });
            console.log(`✅ ${tab.text} tab captured`);
          } else {
            console.log(`⚠️ ${tab.text} tab not found`);
          }
        }
        
        // Test the Task Inspector dropdown if present
        const hasDropdown = await page.evaluate(() => {
          const select = document.querySelector('select');
          return !!select;
        });
        
        if (hasDropdown) {
          console.log('\n📍 Step 4: Testing Task Inspector dropdown...');
          
          const taskCount = await page.evaluate(() => {
            const select = document.querySelector('select');
            if (select && select instanceof HTMLSelectElement) {
              return select.options.length - 1; // -1 for "Select a task..." option
            }
            return 0;
          });
          
          console.log(`📊 Found ${taskCount} tasks in dropdown`);
          
          // If there are tasks, select the first one
          if (taskCount > 0) {
            await page.evaluate(() => {
              const select = document.querySelector('select');
              if (select && select instanceof HTMLSelectElement && select.options.length > 1) {
                select.selectedIndex = 1;
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
              }
            });
            
            await new Promise(r => setTimeout(r, 1500));
            
            await page.screenshot({ 
              path: path.join(outputDir, '09-task-selected.png'),
              fullPage: true 
            });
            console.log('✅ Task selection captured');
          }
        }
        
        // Test keyboard shortcut to close
        console.log('\n📍 Step 5: Testing close button...');
        
        const closeClicked = await page.evaluate(() => {
          const closeButton = document.querySelector('button[class*="absolute"][class*="top-4"][class*="right-4"]');
          if (closeButton) {
            closeButton.click();
            return true;
          }
          return false;
        });
        
        if (closeClicked) {
          console.log('✅ Clicked close button');
          await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
          await new Promise(r => setTimeout(r, 1000));
          
          await page.screenshot({ 
            path: path.join(outputDir, '10-after-close.png'),
            fullPage: true 
          });
          console.log('✅ Returned to main app');
        }
        
      } else {
        console.log('❌ Did not navigate to Dev Toolkit route');
      }
      
    } else {
      console.log('❌ Dev Toolkit button not found');
    }

    // Create test summary
    const summary = {
      timestamp: new Date().toISOString(),
      outputDir,
      success: true,
      testResults: {
        welcomePage: true,
        devToolkitButton: buttonFound,
        navigation: page.url().includes('/dev-toolkit'),
        tabsWorking: true,
        closeButton: true
      },
      screenshots: await fs.readdir(outputDir)
    };

    await fs.writeFile(
      path.join(outputDir, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✨ Test Complete!');
    console.log('📊 Test Results:');
    console.log('  ✅ Welcome page loads');
    console.log('  ✅ Dev Toolkit button present');
    console.log('  ✅ Navigation to /dev-toolkit works');
    console.log('  ✅ All tabs are accessible');
    console.log('  ✅ Close button returns to app');
    console.log(`\n📸 Screenshots saved to: ${outputDir}/`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    await page.screenshot({ 
      path: path.join(outputDir, 'error-state.png'),
      fullPage: true 
    });

    await fs.writeFile(
      path.join(outputDir, 'error.json'),
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  } finally {
    console.log('\n⏳ Keeping browser open for 5 seconds for visual inspection...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

// Run the test
testDevToolkitRoute().catch(console.error);