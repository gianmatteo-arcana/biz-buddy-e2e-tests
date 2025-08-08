/**
 * Dev Toolkit Debug Test
 * Captures console errors and React rendering issues
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testDevToolkitDebug() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `dev-toolkit-debug-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit Debug Test Starting...');
  console.log(`📁 Debug info will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    console.log('  Browser console:', logEntry);
  });
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.toString());
    console.log('  ❌ Page error:', error.toString());
  });

  try {
    // Navigate directly to Dev Toolkit standalone
    console.log('\n📍 Navigating to Dev Toolkit standalone...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for React to potentially render
    await new Promise(r => setTimeout(r, 5000));

    // Check React rendering
    const reactInfo = await page.evaluate(() => {
      const root = document.getElementById('root');
      const hasReact = !!window.React || !!document.querySelector('[data-reactroot]');
      const reactDevTools = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Check for React fiber nodes
      const hasFiber = root && root._reactRootContainer;
      
      // Get all elements that look like React components
      const componentElements = Array.from(document.querySelectorAll('[class*="card"], [class*="button"], [class*="tab"]'));
      
      return {
        hasRoot: !!root,
        rootHTML: root ? root.innerHTML.substring(0, 500) : 'No root element',
        rootChildren: root ? root.children.length : 0,
        hasReact,
        reactDevTools,
        hasFiber,
        bodyText: document.body.textContent?.trim().substring(0, 200),
        componentCount: componentElements.length,
        documentTitle: document.title,
        scripts: Array.from(document.scripts).map(s => s.src || 'inline').filter(s => s.includes('assets')),
        hasDevToolkitComponent: document.body.innerHTML.includes('DevToolkit')
      };
    });
    
    console.log('\n📊 React Rendering Analysis:');
    console.log(JSON.stringify(reactInfo, null, 2));

    // Check for specific Dev Toolkit elements
    const devToolkitElements = await page.evaluate(() => {
      const searchTerms = ['Dev Toolkit', 'Agent Visualizer', 'Console', 'Migrations', 'OAuth'];
      const found = {};
      
      searchTerms.forEach(term => {
        const element = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent?.includes(term)
        );
        found[term] = !!element;
      });
      
      // Check for specific class names
      const hasToolkitClasses = !!document.querySelector('[class*="toolkit"]');
      const hasCardClasses = !!document.querySelector('[class*="card"]');
      
      return {
        elementsFound: found,
        hasToolkitClasses,
        hasCardClasses,
        allClassNames: Array.from(new Set(
          Array.from(document.querySelectorAll('*'))
            .flatMap(el => Array.from(el.classList))
            .filter(c => c.includes('toolkit') || c.includes('dev'))
        ))
      };
    });
    
    console.log('\n📊 Dev Toolkit Elements:');
    console.log(JSON.stringify(devToolkitElements, null, 2));

    // Take screenshot
    await page.screenshot({ 
      path: path.join(outputDir, 'dev-toolkit-state.png'),
      fullPage: true 
    });

    // Save debug info
    await fs.writeFile(
      path.join(outputDir, 'debug-info.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        consoleLogs,
        pageErrors,
        reactInfo,
        devToolkitElements,
        url: page.url()
      }, null, 2)
    );

    console.log('\n✨ Debug Complete!');
    console.log(`📸 Screenshot saved to: ${outputDir}/`);
    console.log(`📝 Debug info saved to: ${outputDir}/debug-info.json`);
    
    if (pageErrors.length > 0) {
      console.log('\n⚠️ Page errors detected:');
      pageErrors.forEach(err => console.log(`  - ${err}`));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    
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
testDevToolkitDebug().catch(console.error);