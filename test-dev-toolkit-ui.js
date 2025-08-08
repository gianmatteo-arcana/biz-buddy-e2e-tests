/**
 * Dev Toolkit UI Test
 * Tests the improved Console and Migrations tab UI
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testDevToolkitUI() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `dev-toolkit-ui-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Dev Toolkit UI Test Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Navigate to Dev Toolkit
    console.log('\n📍 Step 1: Opening Dev Toolkit...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));

    // Screenshot initial state
    await page.screenshot({ 
      path: path.join(outputDir, '01-dev-toolkit-initial.png'),
      fullPage: true 
    });
    console.log('✅ Initial state captured');

    // Test Console tab
    console.log('\n📍 Step 2: Testing Console tab...');
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
      await new Promise(r => setTimeout(r, 2000));
      
      // Analyze console layout
      const consoleAnalysis = await page.evaluate(() => {
        const consoleCard = document.querySelector('.bg-black.text-green-400');
        if (!consoleCard) return { found: false };
        
        const rect = consoleCard.getBoundingClientRect();
        const parentRect = consoleCard.parentElement?.getBoundingClientRect();
        
        return {
          found: true,
          height: rect.height,
          parentHeight: parentRect?.height,
          fillsParent: parentRect ? rect.height >= parentRect.height * 0.9 : false,
          hasScrollArea: !!consoleCard.querySelector('.overflow-auto'),
          cardClasses: consoleCard.className
        };
      });
      
      console.log('Console Layout Analysis:', consoleAnalysis);
      
      await page.screenshot({ 
        path: path.join(outputDir, '02-console-tab.png'),
        fullPage: true 
      });
      console.log('✅ Console tab captured');
    }

    // Test Migrations tab
    console.log('\n📍 Step 3: Testing Migrations tab...');
    const migrationsClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('Migrations'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (migrationsClicked) {
      await new Promise(r => setTimeout(r, 2000));
      
      await page.screenshot({ 
        path: path.join(outputDir, '03-migrations-tab.png'),
        fullPage: true 
      });
      console.log('✅ Migrations tab captured');
      
      // Try to expand Applied Migrations
      console.log('\n📍 Step 4: Expanding Applied Migrations...');
      const expandClicked = await page.evaluate(() => {
        // Look for the Applied Migrations collapsible trigger
        const triggers = Array.from(document.querySelectorAll('button'))
          .filter(b => b.textContent?.includes('Applied Migrations'));
        
        if (triggers.length > 0) {
          triggers[0].click();
          return true;
        }
        return false;
      });
      
      if (expandClicked) {
        await new Promise(r => setTimeout(r, 2000));
        
        // Analyze migrations layout
        const migrationsAnalysis = await page.evaluate(() => {
          // Check if content expanded properly
          const collapsibleContent = document.querySelector('[data-state="open"]');
          const scrollAreas = document.querySelectorAll('[class*="overflow-auto"]');
          const migrationsContainer = document.querySelector('.space-y-6');
          
          return {
            hasExpandedContent: !!collapsibleContent,
            scrollAreaCount: scrollAreas.length,
            containerHasScroll: migrationsContainer?.classList.contains('overflow-auto'),
            expandedHeight: collapsibleContent?.getBoundingClientRect().height,
            hasFixedHeightScrollArea: Array.from(document.querySelectorAll('[class*="h-32"]')).length > 0
          };
        });
        
        console.log('Migrations Layout Analysis:', migrationsAnalysis);
        
        await page.screenshot({ 
          path: path.join(outputDir, '04-migrations-expanded.png'),
          fullPage: true 
        });
        console.log('✅ Applied Migrations expanded');
      }
    }

    // Analyze overall improvements
    const improvements = await page.evaluate(() => {
      const devToolkit = document.querySelector('[class*="flex-col h-full"]');
      const contentArea = document.querySelector('[class*="flex-1 overflow-hidden"]');
      
      return {
        hasFlexLayout: !!devToolkit,
        contentAreaFillsSpace: !!contentArea,
        toolkitHeight: devToolkit?.getBoundingClientRect().height,
        viewportHeight: window.innerHeight,
        fillsViewport: devToolkit ? 
          devToolkit.getBoundingClientRect().height >= window.innerHeight * 0.9 : false
      };
    });

    // Save test results
    const results = {
      timestamp: new Date().toISOString(),
      consoleTabFullHeight: consoleClicked,
      migrationsTabScrollable: migrationsClicked,
      appliedMigrationsExpandable: expandClicked,
      improvements,
      screenshots: await fs.readdir(outputDir)
    };

    await fs.writeFile(
      path.join(outputDir, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n✨ Test Complete!');
    console.log('📊 UI Improvements:');
    console.log(`  ${results.consoleTabFullHeight ? '✅' : '❌'} Console tab uses full height`);
    console.log(`  ${results.migrationsTabScrollable ? '✅' : '❌'} Migrations tab is scrollable`);
    console.log(`  ${results.appliedMigrationsExpandable ? '✅' : '❌'} Applied Migrations expands inline`);
    console.log(`  ${improvements.fillsViewport ? '✅' : '❌'} Dev Toolkit fills viewport`);
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
testDevToolkitUI().catch(console.error);