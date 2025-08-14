const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureDevToolkitScreenshots() {
  console.log('📸 Capturing Dev Toolkit screenshots with Playwright...');
  
  // Create screenshots directory if it doesn't exist
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const browser = await chromium.launch({
    headless: false
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the app (local version)
    console.log('Navigating to local app on port 8081...');
    await page.goto('http://localhost:8081', { 
      waitUntil: 'networkidle' 
    });
    
    // Wait for app to load
    await page.waitForTimeout(2000);
    
    // Try to open Dev Toolkit using keyboard shortcut
    console.log('Opening Dev Toolkit with Cmd+K...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('K');
    await page.keyboard.up('Meta');
    
    // Wait for Dev Toolkit modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(2000); // Let it fully render
    
    // Take screenshot of the full Dev Toolkit modal
    console.log('Taking screenshot of improved Dev Toolkit (1600px width, 90vh height)...');
    await page.screenshot({ 
      path: path.join(screenshotDir, 'dev-toolkit-improved-ui.png'),
      fullPage: false 
    });
    
    // Try to click on Migration Runner tab
    const migrationTab = await page.locator('button[role="tab"]:has-text("Migration Runner")').first();
    if (await migrationTab.isVisible()) {
      console.log('Found Migration Runner tab, clicking...');
      await migrationTab.click();
      await page.waitForTimeout(2000);
      
      console.log('Taking screenshot of Migration Runner with improved viewport...');
      await page.screenshot({ 
        path: path.join(screenshotDir, 'migration-runner-improved.png'),
        fullPage: false 
      });
    }
    
    // Take a screenshot showing the full modal size
    console.log('Taking screenshot showing modal dimensions...');
    
    // Close modal and reopen to show size comparison
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    
    // Show before state (if we had it)
    console.log('Opening Dev Toolkit again for final screenshot...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('K');
    await page.keyboard.up('Meta');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'dev-toolkit-full-modal.png'),
      fullPage: true 
    });
    
    console.log('✅ Screenshots captured successfully!');
    console.log('📁 Screenshots saved to:', screenshotDir);
    
  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await page.waitForTimeout(3000); // Keep open briefly to see result
    await browser.close();
  }
}

captureDevToolkitScreenshots().catch(console.error);