/**
 * Dev Toolkit Restored Test
 * Verifies the restored Dev Toolkit opens properly
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testDevToolkitRestored() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `dev-toolkit-restored-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit Restored Test Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Navigate directly to the standalone page
    console.log('\n📍 Step 1: Navigating directly to Dev Toolkit standalone...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for React to render
    await new Promise(r => setTimeout(r, 5000));

    // Take screenshot
    await page.screenshot({ 
      path: path.join(outputDir, '01-dev-toolkit-standalone.png'),
      fullPage: true 
    });
    console.log('✅ Dev Toolkit standalone page captured');

    // Analyze the content
    const pageAnalysis = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const hasDevToolkit = bodyText.includes('Dev Toolkit');
      const hasAgentVisualizer = bodyText.includes('Agent Visualizer');
      const hasConsole = bodyText.includes('Console');
      const hasMigrations = bodyText.includes('Migrations');
      const hasOAuth = bodyText.includes('OAuth');
      
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabButtons = buttons.filter(btn => {
        const text = btn.textContent || '';
        return ['Agent Visualizer', 'Console', 'Live Stream', 'Task History', 'Migrations', 'OAuth'].some(t => text.includes(t));
      });
      
      return {
        title: document.title,
        hasContent: bodyText.length > 100,
        hasDevToolkit,
        hasAgentVisualizer,
        hasConsole,
        hasMigrations,
        hasOAuth,
        tabCount: tabButtons.length,
        tabNames: tabButtons.map(b => b.textContent?.trim()),
        bodyLength: bodyText.length,
        hasReactRoot: !!document.getElementById('root')
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log(JSON.stringify(pageAnalysis, null, 2));
    
    // Save analysis
    await fs.writeFile(
      path.join(outputDir, 'page-analysis.json'),
      JSON.stringify(pageAnalysis, null, 2)
    );

    // Now navigate to main app to see Dev Toolkit button
    console.log('\n📍 Step 2: Navigating to main app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));

    // Take screenshot showing Dev Toolkit button
    await page.screenshot({ 
      path: path.join(outputDir, '02-main-app-with-button.png'),
      fullPage: true 
    });
    console.log('✅ Main app with Dev Toolkit button captured');

    // Check for Dev Toolkit button
    const buttonInfo = await page.evaluate(() => {
      const button = document.querySelector('button.fixed.bottom-4.right-4');
      if (button) {
        return {
          found: true,
          title: button.getAttribute('title'),
          classes: button.className,
          visible: window.getComputedStyle(button).display !== 'none'
        };
      }
      return { found: false };
    });
    
    console.log('\n📊 Dev Toolkit Button:', JSON.stringify(buttonInfo, null, 2));

    // Summary
    const summary = {
      timestamp: new Date().toISOString(),
      standalonePageWorks: pageAnalysis.hasContent && pageAnalysis.title === 'Dev Toolkit - BizBuddy',
      devToolkitButtonPresent: buttonInfo.found,
      tabsFound: pageAnalysis.tabCount,
      restoredFeatures: {
        agentVisualizer: pageAnalysis.hasAgentVisualizer,
        console: pageAnalysis.hasConsole,
        migrations: pageAnalysis.hasMigrations,
        oauth: pageAnalysis.hasOAuth
      },
      screenshots: await fs.readdir(outputDir)
    };

    await fs.writeFile(
      path.join(outputDir, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✨ Test Complete!');
    console.log('📊 Results:');
    console.log(`  ${pageAnalysis.hasContent ? '✅' : '❌'} Page has content (${pageAnalysis.bodyLength} chars)`);
    console.log(`  ${pageAnalysis.hasAgentVisualizer ? '✅' : '❌'} Agent Visualizer restored`);
    console.log(`  ${pageAnalysis.hasConsole ? '✅' : '❌'} Console restored`);
    console.log(`  ${pageAnalysis.hasMigrations ? '✅' : '❌'} Migrations restored`);
    console.log(`  ${pageAnalysis.hasOAuth ? '✅' : '❌'} OAuth diagnostics added`);
    console.log(`  ${buttonInfo.found ? '✅' : '❌'} Dev Toolkit button present`);
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
testDevToolkitRestored().catch(console.error);