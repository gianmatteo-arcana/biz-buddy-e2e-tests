const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.APP_URL || 'http://localhost:8081';

async function captureScreenshots() {
  const screenshotDir = path.join(__dirname, 'uploaded-screenshots/issue-20');
  
  console.log('🚀 Capturing Dev Toolkit Screenshots');
  console.log('📁 Screenshots:', screenshotDir);

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    // Dev Toolkit Main View
    console.log('📸 Capturing Dev Toolkit main view...');
    await page.goto(`${BASE_URL}/dev-toolkit-standalone`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-dev-toolkit-main.png'),
      fullPage: true 
    });

    // Try to click on Timeline tab
    console.log('📸 Capturing Timeline tab...');
    const timelineTab = page.locator('button:has-text("Timeline")').first();
    if (await timelineTab.isVisible()) {
      await timelineTab.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ 
      path: path.join(screenshotDir, '04-timeline-view.png'),
      fullPage: true 
    });

    // Try Orchestration tab
    console.log('📸 Capturing Orchestration tab...');
    const orchTab = page.locator('button:has-text("Orchestration")').first();
    if (await orchTab.isVisible()) {
      await orchTab.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-orchestration-view.png'),
      fullPage: true 
    });

    console.log('✅ Screenshots captured!');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots();