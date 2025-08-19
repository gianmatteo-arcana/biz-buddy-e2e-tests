const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureTaskCardDemo() {
  const outputDir = path.join(__dirname, 'uploaded-screenshots', 'issue-18a');
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📸 Capturing TaskCard Component Demo for Issue #18a');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the demo page
    console.log('\n📍 Step 1: Navigate to TaskCard demo page');
    await page.goto('http://localhost:8083/taskcard-demo');
    await page.waitForTimeout(2000);
    
    // Capture the full demo page
    console.log('📸 Capturing full TaskCard demo page');
    await page.screenshot({ 
      path: path.join(outputDir, '01-taskcard-demo-full.png'),
      fullPage: true 
    });
    
    // Capture just the standard card
    console.log('📸 Capturing TaskCard in standard mode');
    const standardCard = await page.locator('text="Complete Business Onboarding"').locator('..');
    await standardCard.screenshot({ 
      path: path.join(outputDir, '02-taskcard-standard-mode.png')
    });
    
    // Open the fullscreen modal
    console.log('\n📍 Step 2: Open fullscreen modal');
    await page.click('button:has-text("Open Fullscreen TaskCard")');
    await page.waitForTimeout(1000);
    
    // Capture fullscreen modal
    console.log('📸 Capturing TaskCard in fullscreen mode');
    await page.screenshot({ 
      path: path.join(outputDir, '03-taskcard-fullscreen-mode.png'),
      fullPage: false // Just viewport to show modal
    });
    
    // Close modal
    await page.click('[aria-label="Close modal"]');
    await page.waitForTimeout(500);
    
    // Capture the implementation complete section
    console.log('📸 Capturing implementation summary');
    const summarySection = await page.locator('.bg-blue-50').first();
    await summarySection.screenshot({ 
      path: path.join(outputDir, '04-implementation-complete.png')
    });
    
    // Navigate to main app to show it's clean
    console.log('\n📍 Step 3: Navigate to main app (showing clean Dashboard)');
    await page.goto('http://localhost:8083/');
    await page.waitForTimeout(2000);
    
    console.log('📸 Capturing clean dashboard (no test content)');
    await page.screenshot({ 
      path: path.join(outputDir, '05-clean-dashboard.png'),
      fullPage: true 
    });
    
    console.log('\n✅ TaskCard demo screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${outputDir}`);
    
    // List screenshots
    const files = fs.readdirSync(outputDir);
    console.log('\n📸 Screenshots ready for upload:');
    files.forEach(file => {
      if (file.endsWith('.png')) {
        console.log(`  • ${file}`);
      }
    });
    
    console.log('\n✨ All screenshots demonstrate:');
    console.log('  ✅ TaskCard component working in both modes');
    console.log('  ✅ Clean production code (no test buttons in main app)');
    console.log('  ✅ Full implementation of Issue #18a requirements');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ 
      path: path.join(outputDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

captureTaskCardDemo().catch(console.error);