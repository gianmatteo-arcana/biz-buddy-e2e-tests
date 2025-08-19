/**
 * Dev Toolkit Inline Test
 * Tests the Dev Toolkit when it opens inline (for debugging render issues)
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testDevToolkitInline() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `dev-toolkit-inline-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit Inline Test Starting...');
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
      path: path.join(outputDir, '01-initial-state.png'),
      fullPage: true 
    });
    console.log('✅ Initial state captured');

    // Try to find the Dev Toolkit button and click it
    console.log('\n📍 Step 2: Looking for Dev Toolkit button...');
    
    // Use evaluate to find and click the button
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
      
      // Wait for potential popup or inline content
      await new Promise(r => setTimeout(r, 3000));
      
      // Check if a new window opened
      const pages = await browser.pages();
      console.log(`📊 Total browser windows: ${pages.length}`);
      
      if (pages.length > 2) {
        // Dev Toolkit opened in new window
        const devToolkitPage = pages[pages.length - 1];
        console.log('🪟 Dev Toolkit opened in new window');
        
        // Wait longer for React to mount
        await new Promise(r => setTimeout(r, 5000));
        
        // Try to get page content
        const pageContent = await devToolkitPage.content();
        console.log(`📄 Page content length: ${pageContent.length} chars`);
        
        // Check if React mounted
        const hasContent = await devToolkitPage.evaluate(() => {
          const root = document.getElementById('dev-toolkit-root');
          return root ? root.innerHTML.length : 0;
        });
        console.log(`📊 Root element content: ${hasContent} chars`);
        
        // Take screenshot
        await devToolkitPage.screenshot({ 
          path: path.join(outputDir, '02-dev-toolkit-window.png'),
          fullPage: true 
        });
        console.log('✅ Dev Toolkit window captured');
        
        // Try to interact with the page using evaluate
        const tabsInfo = await devToolkitPage.evaluate(() => {
          // Look for any buttons or tabs
          const buttons = Array.from(document.querySelectorAll('button'));
          return {
            buttonCount: buttons.length,
            buttonTexts: buttons.map(b => b.textContent?.trim()).filter(Boolean),
            hasTabsList: !!document.querySelector('[role="tablist"]'),
            hasCards: !!document.querySelector('.card'),
            bodyClasses: document.body.className,
            rootContent: document.getElementById('dev-toolkit-root')?.textContent?.substring(0, 100)
          };
        });
        
        console.log('📊 Dev Toolkit content analysis:', JSON.stringify(tabsInfo, null, 2));
        
        // Save analysis
        await fs.writeFile(
          path.join(outputDir, 'toolkit-analysis.json'),
          JSON.stringify(tabsInfo, null, 2)
        );
        
      } else {
        console.log('⚠️ Dev Toolkit did not open in new window');
        
        // Check if it opened inline
        const hasInlineToolkit = await page.evaluate(() => {
          return document.querySelector('.dev-toolkit-container') !== null ||
                 document.querySelector('[data-testid="dev-toolkit"]') !== null;
        });
        
        if (hasInlineToolkit) {
          console.log('✅ Dev Toolkit opened inline');
          await page.screenshot({ 
            path: path.join(outputDir, '02-dev-toolkit-inline.png'),
            fullPage: true 
          });
        } else {
          console.log('❌ Dev Toolkit not found inline either');
        }
      }
      
    } else {
      console.log('❌ Dev Toolkit button not found');
      
      // List all buttons for debugging
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          classes: btn.className,
          title: btn.title,
          position: {
            bottom: window.getComputedStyle(btn).bottom,
            right: window.getComputedStyle(btn).right
          }
        }));
      });
      
      console.log('Available buttons:', JSON.stringify(buttons, null, 2));
      await fs.writeFile(
        path.join(outputDir, 'buttons.json'),
        JSON.stringify(buttons, null, 2)
      );
    }

    // Final screenshot
    await page.screenshot({ 
      path: path.join(outputDir, '03-final-state.png'),
      fullPage: true 
    });

    const summary = {
      timestamp: new Date().toISOString(),
      outputDir,
      screenshots: await fs.readdir(outputDir)
    };

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✨ Test Complete!');
    console.log(`📸 Screenshots saved to: ${outputDir}/`);

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
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

// Run the test
testDevToolkitInline().catch(console.error);