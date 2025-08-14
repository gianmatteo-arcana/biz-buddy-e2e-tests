const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureMigrationUIScreenshots() {
  console.log('📸 Capturing Migration UI improvements with Playwright...');
  
  // Create proper test sub-folder structure with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotDir = path.join(__dirname, 'test-screenshots', 'ui-improvements', timestamp);
  
  // Ensure directory exists
  fs.mkdirSync(screenshotDir, { recursive: true });
  console.log(`📁 Screenshots will be saved to: ${screenshotDir}`);
  
  const browser = await chromium.launch({
    headless: false
  });
  
  // Use standard auth from E2E guidelines
  const authFile = path.join(__dirname, 'playwright-auth.json');
  let context;
  
  if (fs.existsSync(authFile)) {
    console.log('✅ Using existing authentication from playwright-auth.json');
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: authFile
    });
  } else {
    console.log('⚠️ No auth file found - proceeding without auth');
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
  }
  
  const page = await context.newPage();
  
  try {
    // Navigate directly to Dev Toolkit standalone page
    console.log('Navigating to Dev Toolkit standalone at /dev-toolkit-standalone...');
    await page.goto('http://localhost:8081/dev-toolkit-standalone', { 
      waitUntil: 'networkidle' 
    });
    
    // Wait for Dev Toolkit to load
    await page.waitForSelector('[data-testid="dev-toolkit"]', { timeout: 10000 }).catch(() => {
      console.log('Dev Toolkit testid not found, waiting for any Dev Toolkit text...');
    });
    
    await page.waitForTimeout(2000); // Let it fully render
    
    // Check if Dev Toolkit loaded
    const devToolkitTitle = await page.locator('h1:has-text("Dev Toolkit"), h2:has-text("Dev Toolkit")').first();
    if (await devToolkitTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Dev Toolkit loaded successfully!');
    }
    
    // IMPORTANT: Click on the Migrations tab
    console.log('\n🎯 Looking for Migrations tab...');
    
    // Try multiple selectors for the Migrations tab
    const migrationSelectors = [
      'button[role="tab"]:has-text("Migrations")',
      'button:has-text("Migrations")',
      '[data-testid="migrations-tab"]',
      'button[role="tab"] >> text=/Migration/i',
      'div[role="tablist"] button >> text=/Migration/i'
    ];
    
    let migrationTabClicked = false;
    for (const selector of migrationSelectors) {
      try {
        const tab = await page.locator(selector).first();
        if (await tab.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found Migrations tab with selector: ${selector}`);
          await tab.click();
          migrationTabClicked = true;
          await page.waitForTimeout(2000); // Wait for panel to load
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!migrationTabClicked) {
      console.log('⚠️ Could not find Migrations tab, checking if Migration Runner is already visible...');
      
      // Check if Migration Runner content is already visible (might be default view)
      const migrationContent = await page.locator('text=/Migration Runner|Database Migration Manager/i').first();
      if (await migrationContent.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('✅ Migration Runner is already visible!');
      }
    }
    
    // Take screenshot of the Migration Runner with improved viewport
    console.log('\n📸 Taking screenshot of Migration Runner with improved UI...');
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-migration-runner-improved.png'),
      fullPage: false 
    });
    
    // Look for the improved viewport element (min-h-[400px] max-h-[70vh])
    const improvedViewport = await page.locator('.min-h-\\[400px\\]').first();
    if (await improvedViewport.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('✅ Found improved viewport with min-h-[400px] max-h-[70vh]');
      
      // Scroll to show it fully
      await improvedViewport.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      // Take focused screenshot
      await page.screenshot({ 
        path: path.join(screenshotDir, '02-migration-list-expanded.png'),
        fullPage: false 
      });
    }
    
    // Take full page screenshot
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-dev-toolkit-full-page.png'),
      fullPage: true 
    });
    
    // Now test the modal version
    console.log('\n🔄 Testing modal version from main app...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Open Dev Toolkit modal with Cmd+K
    console.log('Opening Dev Toolkit modal with Cmd+K...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('K');
    await page.keyboard.up('Meta');
    
    // Wait for modal
    const modal = await page.locator('[role="dialog"]').first();
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Dev Toolkit modal opened (1600px width, 90vh height)!');
      await page.waitForTimeout(2000);
      
      // Click Migrations tab in modal
      const modalMigrationTab = await modal.locator('button[role="tab"]:has-text("Migration")').first();
      if (await modalMigrationTab.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Clicking Migrations tab in modal...');
        await modalMigrationTab.click();
        await page.waitForTimeout(2000);
      }
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '04-dev-toolkit-modal-migrations.png'),
        fullPage: false 
      });
    }
    
    console.log('\n✅ Screenshots captured successfully!');
    
    // List captured screenshots with sizes
    const files = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
    console.log('\n📸 Captured screenshots:');
    files.forEach(file => {
      const stats = fs.statSync(path.join(screenshotDir, file));
      console.log(`  ✓ ${file} (${Math.round(stats.size / 1024)}KB)`);
    });
    
    console.log(`\n📁 All screenshots saved to:\n   ${screenshotDir}`);
    
    // Create a manifest file for the screenshots
    const manifest = {
      timestamp,
      issue: 19,
      description: 'Dev Toolkit UI improvements - larger viewport and Migration Runner enhancements',
      screenshots: files.map(file => ({
        filename: file,
        path: path.join(screenshotDir, file),
        size: fs.statSync(path.join(screenshotDir, file)).size
      }))
    };
    
    fs.writeFileSync(
      path.join(screenshotDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log('📝 Manifest file created');
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await page.waitForTimeout(2000); // Keep open briefly to verify
    await browser.close();
  }
}

captureMigrationUIScreenshots().catch(console.error);