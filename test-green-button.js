#!/usr/bin/env node

/**
 * TEST: Green Test Orchestrator Button
 * 
 * Tests the green button that directly imports orchestrator
 */

const { chromium } = require('playwright');

async function testGreenButton() {
  console.log('🚀 GREEN BUTTON TEST');
  console.log('=' .repeat(60));
  console.log('Testing the Test Orchestrator Import button');
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });

  const errorLogs = [];
  const importLogs = [];

  try {
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      // Capture TestOrchestrator logs
      if (text.includes('[TestOrchestrator]')) {
        importLogs.push(text);
        console.log(`  ${text}`);
      }
      
      // Capture errors
      if (type === 'error') {
        errorLogs.push(text);
        if (!text.includes('X-Frame-Options') && !text.includes('lovable.js')) {
          console.log(`  ❌ ERROR: ${text}`);
        }
      }
    });
    
    console.log('📍 Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(5000);
    
    // Look for the green button
    const greenButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const greenButton = buttons.find(btn => btn.textContent?.includes('Test Orchestrator Import'));
      return !!greenButton;
    });
    
    if (greenButtonFound) {
      console.log('✅ Green Test Orchestrator button found!\n');
      console.log('📍 Clicking the button...\n');
      
      await page.click('button:has-text("Test Orchestrator Import")');
      
      // Wait for imports to complete
      await page.waitForTimeout(10000);
      
    } else {
      console.log('❌ Green Test Orchestrator button NOT found');
      console.log('   The button only appears in development mode when authenticated\n');
    }
    
    // Analyze results
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESULTS');
    console.log('=' .repeat(60));
    
    if (importLogs.length > 0) {
      console.log('\n✅ Import logs captured:');
      const successCount = importLogs.filter(log => log.includes('✅')).length;
      const errorCount = importLogs.filter(log => log.includes('❌')).length;
      
      console.log(`  • Success indicators: ${successCount}`);
      console.log(`  • Error indicators: ${errorCount}`);
      
      if (errorCount > 0) {
        console.log('\n❌ IMPORT FAILED - Check the browser console for details');
      } else if (successCount > 0) {
        console.log('\n✅ IMPORTS SUCCESSFUL!');
      }
    } else {
      console.log('\n⚠️ No import logs captured');
      console.log('   Button may not have been clicked or imports may have failed silently');
    }
    
    if (errorLogs.length > 0) {
      console.log('\n❌ Errors detected:');
      errorLogs.slice(0, 5).forEach(err => {
        console.log(`  • ${err.substring(0, 200)}`);
      });
    }
    
    console.log('\n🔍 Browser window remains open for inspection');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testGreenButton().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});