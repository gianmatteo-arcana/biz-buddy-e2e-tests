/**
 * Dev Toolkit Final Test
 * Verifies the Dev Toolkit opens in a new tab and renders properly
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testDevToolkitFinal() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `dev-toolkit-final-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit Final Test Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

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
      path: path.join(outputDir, '01-main-app.png'),
      fullPage: true 
    });
    console.log('✅ Main app captured');

    // Navigate directly to Dev Toolkit standalone route
    console.log('\n📍 Step 2: Navigating directly to Dev Toolkit standalone...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));

    // Take screenshot of Dev Toolkit
    await page.screenshot({ 
      path: path.join(outputDir, '02-dev-toolkit-standalone.png'),
      fullPage: true 
    });
    console.log('✅ Dev Toolkit standalone captured');

    // Analyze the page content
    const pageAnalysis = await page.evaluate(() => {
      const hasDevToolkit = document.body.textContent?.includes('Dev Toolkit');
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabs = buttons.filter(btn => 
        ['Task Inspector', 'Console', 'Live Stream', 'Task History', 'Migrations', 'OAuth'].some(text => 
          btn.textContent?.includes(text)
        )
      );
      
      return {
        title: document.title,
        hasDevToolkit,
        hasContent: document.body.textContent?.length > 100,
        tabCount: tabs.length,
        tabNames: tabs.map(t => t.textContent?.trim()),
        hasTaskDropdown: !!document.querySelector('select'),
        bodyClasses: document.body.className,
        firstHeading: document.querySelector('h1, h2, h3')?.textContent
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log(JSON.stringify(pageAnalysis, null, 2));
    
    // Save analysis
    await fs.writeFile(
      path.join(outputDir, 'page-analysis.json'),
      JSON.stringify(pageAnalysis, null, 2)
    );

    // Try clicking on different tabs if they exist
    if (pageAnalysis.tabCount > 0) {
      console.log('\n📍 Step 3: Testing tab navigation...');
      
      // Try Console tab
      const consoleClicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent?.includes('Console'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (consoleClicked) {
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ 
          path: path.join(outputDir, '03-console-tab.png'),
          fullPage: true 
        });
        console.log('✅ Console tab captured');
      }
    }

    // Test summary
    const summary = {
      timestamp: new Date().toISOString(),
      success: pageAnalysis.hasDevToolkit && pageAnalysis.hasContent,
      devToolkitFound: pageAnalysis.hasDevToolkit,
      tabsFound: pageAnalysis.tabCount,
      screenshots: await fs.readdir(outputDir)
    };

    await fs.writeFile(
      path.join(outputDir, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✨ Test Complete!');
    console.log('📊 Results:');
    console.log(`  ${pageAnalysis.hasDevToolkit ? '✅' : '❌'} Dev Toolkit text found`);
    console.log(`  ${pageAnalysis.hasContent ? '✅' : '❌'} Page has content`);
    console.log(`  📑 Found ${pageAnalysis.tabCount} tabs`);
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
    console.log('\n⏳ Keeping browser open for 5 seconds for inspection...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

// Run the test
testDevToolkitFinal().catch(console.error);