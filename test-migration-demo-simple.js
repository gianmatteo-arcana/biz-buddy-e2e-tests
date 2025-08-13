const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * Simple E2E Migration Demo
 * Streamlined test to show migration application
 */

async function testMigrationDemo() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testRunDir = path.join(__dirname, `migration-demo-${timestamp}`);
  
  await fs.mkdir(testRunDir, { recursive: true });
  
  console.log(`\n🚀 Migration Demo Test`);
  console.log(`📁 Screenshots: ${testRunDir}\n`);
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json'
    });
    
    const page = await context.newPage();
    
    // Navigate with simple load
    console.log('📍 Loading Dev Toolkit...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(testRunDir, '1-loaded.png'), fullPage: true });
    
    // Click Migration tab
    console.log('📋 Opening Migration tab...');
    try {
      await page.click('text=Migration');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(testRunDir, '2-migration-tab.png'), fullPage: true });
      console.log('   ✅ Migration tab opened');
    } catch (e) {
      console.log('   ⚠️ Could not click Migration tab');
    }
    
    // Check migration content
    const content = await page.textContent('body');
    
    console.log('\n🔍 Migration Status:');
    console.log(`   Demo migration: ${content.includes('20250813010809') ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Pending: ${content.includes('Pending') ? '✅ Yes' : '❌ No'}`);
    console.log(`   Apply button: ${content.includes('Apply') ? '✅ Yes' : '❌ No'}`);
    
    // If Apply button exists, demonstrate selection
    if (content.includes('Apply')) {
      console.log('\n🎯 Demonstrating migration selection...');
      
      // Find checkboxes
      const checkboxes = await page.$$('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('   ✅ Selected migration');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(testRunDir, '3-selected.png'), fullPage: true });
        
        // Show ready to apply state
        console.log('   ℹ️ Ready to apply (stopping here to preserve state)');
        await page.screenshot({ path: path.join(testRunDir, '4-ready-to-apply.png'), fullPage: true });
      }
    }
    
    console.log('\n✅ Demo completed successfully!');
    console.log(`📁 Visual proof: ${testRunDir}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testMigrationDemo().catch(console.error);