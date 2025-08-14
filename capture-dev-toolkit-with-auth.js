const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureDevToolkitScreenshots() {
  console.log('📸 Capturing Dev Toolkit screenshots with proper E2E auth...');
  
  // Create screenshots directory if it doesn't exist
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
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
    console.log('⚠️ No auth file found - you may need to run the auth setup first');
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
    await page.waitForTimeout(3000);
    
    // Check if Dev Toolkit loaded
    const devToolkitTitle = await page.locator('text=/Dev Toolkit/i').first();
    if (await devToolkitTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Dev Toolkit loaded successfully!');
    } else {
      console.log('⚠️ Dev Toolkit may not have loaded properly');
    }
    
    // Take screenshot of the full Dev Toolkit
    console.log('Taking screenshot of improved Dev Toolkit (standalone page)...');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'dev-toolkit-improved-standalone.png'),
      fullPage: false 
    });
    
    // Look for Migration Runner section or tab
    const migrationSection = await page.locator('text=/Migration/i').first();
    if (await migrationSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found Migration section...');
      
      // Click on Migration Runner tab if it's a tab
      const migrationTab = await page.locator('button[role="tab"]:has-text("Migration")').first();
      if (await migrationTab.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Clicking Migration Runner tab...');
        await migrationTab.click();
        await page.waitForTimeout(2000);
      }
      
      // Take screenshot of Migration Runner
      console.log('Taking screenshot of Migration Runner with improved viewport (min-h-[400px] max-h-[70vh])...');
      await page.screenshot({ 
        path: path.join(screenshotDir, 'migration-runner-improved-viewport.png'),
        fullPage: false 
      });
      
      // Scroll to show the full migration list if needed
      const migrationList = await page.locator('.min-h-\\[400px\\]').first();
      if (await migrationList.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Found migration list with improved sizing...');
        await migrationList.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: path.join(screenshotDir, 'migration-list-expanded.png'),
          fullPage: false 
        });
      }
    }
    
    // Take a full page screenshot to show everything
    console.log('Taking full page screenshot to show complete Dev Toolkit...');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'dev-toolkit-full-page.png'),
      fullPage: true 
    });
    
    // Now also try the modal version from the main app
    console.log('\nNow capturing modal version from main app...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Open Dev Toolkit modal with Cmd+K
    console.log('Opening Dev Toolkit modal with Cmd+K...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('K');
    await page.keyboard.up('Meta');
    
    // Check if modal opened
    const modal = await page.locator('[role="dialog"]').first();
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Dev Toolkit modal opened (1600px width, 90vh height)!');
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'dev-toolkit-modal-improved.png'),
        fullPage: false 
      });
    }
    
    console.log('\n✅ Screenshots captured successfully!');
    console.log('📁 Screenshots saved to:', screenshotDir);
    
    // List captured screenshots
    const files = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
    console.log('\nCaptured screenshots:');
    files.forEach(file => {
      const stats = fs.statSync(path.join(screenshotDir, file));
      console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });
    
  } catch (error) {
    console.error('Error capturing screenshots:', error.message);
    
    // Take a screenshot of whatever state we're in
    await page.screenshot({ 
      path: path.join(screenshotDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await page.waitForTimeout(2000); // Keep open briefly to see result
    await browser.close();
  }
}

captureDevToolkitScreenshots().catch(console.error);