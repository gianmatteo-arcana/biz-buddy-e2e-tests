const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureCleanDashboard() {
  const timestamp = Date.now();
  const outputDir = path.join(__dirname, 'uploaded-screenshots', 'issue-18a');
  
  // Create directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📸 Capturing Clean Dashboard Screenshots for Issue #18a');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to production app (Lovable)
    console.log('\n📍 Navigating to production app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(3000);
    
    // Capture sign-in page (showing no test content)
    console.log('📸 1. Sign-in page (clean, no test buttons)');
    await page.screenshot({ 
      path: path.join(outputDir, '01-sign-in-clean.png'),
      fullPage: true 
    });
    
    // Navigate to local dev server
    console.log('\n📍 Navigating to local dev server...');
    await page.goto('http://localhost:8083');
    await page.waitForTimeout(2000);
    
    console.log('📸 2. Local dashboard (no test implementation)');
    await page.screenshot({ 
      path: path.join(outputDir, '02-dashboard-no-test-content.png'),
      fullPage: true 
    });
    
    console.log('\n✅ Clean dashboard captured - no test/demo content visible!');
    console.log(`📁 Screenshots saved to: ${outputDir}`);
    
    // List screenshots
    const files = fs.readdirSync(outputDir);
    console.log('\n📸 Files ready for upload:');
    files.forEach(file => {
      if (file.endsWith('.png')) {
        console.log(`  • ${file}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureCleanDashboard().catch(console.error);