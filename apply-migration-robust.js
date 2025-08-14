const { chromium } = require('playwright');

async function applyMigrationRobust() {
  console.log('🚀 Robust E2E Migration Application');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Navigate and authenticate
    console.log('📱 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForLoadState('networkidle');
    
    // Click Sign in with Google
    console.log('🔐 Starting authentication...');
    await page.click('button:has-text("Sign in with Google")');
    
    // Wait for Google OAuth
    await page.waitForURL('**/accounts.google.com/**', { timeout: 10000 });
    console.log('  ✅ On Google OAuth page');
    
    // Enter credentials
    await page.fill('input[type="email"]', 'gianmatteo.allyn.test@gmail.com');
    await page.click('button:has-text("Next"), div[role="button"]:has-text("Next")');
    
    await page.waitForTimeout(2000);
    
    const passwordVisible = await page.locator('input[type="password"]').isVisible();
    if (passwordVisible) {
      await page.fill('input[type="password"]', 'myO329Vfi9j5kcRE7TKyYyXZ8Yq3');
      await page.click('button:has-text("Next"), div[role="button"]:has-text("Next")');
    }
    
    // Handle consent
    await page.waitForTimeout(2000);
    const continueBtn = await page.locator('button:has-text("Continue"), div[role="button"]:has-text("Continue")').first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }
    
    // Wait for redirect back
    console.log('⏳ Waiting for authentication to complete...');
    await page.waitForFunction(
      () => !window.location.href.includes('accounts.google.com'),
      { timeout: 30000 }
    ).catch(() => {});
    
    // Critical: Wait for the app to actually load
    console.log('⏳ Waiting for app to load...');
    await page.waitForTimeout(8000); // Give it more time
    
    // Wait for any visible element that indicates the app loaded
    await page.waitForSelector('div, button, main', { 
      state: 'visible',
      timeout: 30000 
    });
    
    // Take screenshot with retry
    console.log('📸 Taking authenticated screenshot...');
    for (let i = 0; i < 3; i++) {
      await page.screenshot({
        path: `demo-screenshots/issue-19/authenticated-attempt-${i}.png`,
        fullPage: true
      });
      await page.waitForTimeout(2000);
    }
    
    // Check what's visible on the page
    const pageState = await page.evaluate(() => {
      const bodyText = document.body?.textContent || '';
      const hasContent = document.body?.children.length > 0;
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent);
      const devElements = Array.from(document.querySelectorAll('[class*="dev"], [id*="dev"], [data-testid*="dev"]'));
      
      return {
        hasContent,
        bodyLength: bodyText.length,
        hasUserName: bodyText.includes('Gianmatteo'),
        hasDashboard: bodyText.includes('Dashboard') || bodyText.includes('Task'),
        buttons: buttons.slice(0, 10),
        devElementsCount: devElements.length,
        url: window.location.href
      };
    });
    
    console.log('📊 Page state:', pageState);
    
    // Look for Dev Toolkit more aggressively
    console.log('\n🔍 Looking for Dev Toolkit...');
    
    // Try multiple selectors
    const devSelectors = [
      '[data-testid="dev-toolkit"]',
      '.dev-toolkit',
      '#dev-toolkit',
      'button:has-text("Dev")',
      'div:has-text("Dev Toolkit")',
      '[class*="dev-toolkit"]',
      '[class*="devtoolkit"]',
      '[class*="dev_toolkit"]'
    ];
    
    let devToolkitFound = false;
    for (const selector of devSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`  ✅ Found Dev Toolkit with selector: ${selector}`);
          devToolkitFound = true;
          await element.click();
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    if (!devToolkitFound) {
      console.log('  ⚠️ Dev Toolkit not found with standard selectors');
      
      // Look for any floating buttons or badges
      const floatingElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
              style.position === 'fixed' &&
              rect.width > 20 && rect.height > 20 &&
              rect.width < 200 && rect.height < 200
            );
          })
          .map(el => ({
            tag: el.tagName,
            class: el.className,
            text: el.textContent?.substring(0, 50),
            position: {
              x: el.getBoundingClientRect().x,
              y: el.getBoundingClientRect().y
            }
          }));
      });
      
      console.log(`  Found ${floatingElements.length} floating elements`);
      floatingElements.forEach(el => {
        console.log(`    - ${el.tag} at (${el.position.x}, ${el.position.y}): ${el.text}`);
      });
      
      // Click on floating elements that might be Dev Toolkit
      for (const el of floatingElements) {
        if (el.text?.includes('dev') || el.text?.includes('Dev') || 
            el.text?.includes('migration') || el.text?.includes('pending')) {
          console.log(`  🎯 Clicking potential Dev element: ${el.text}`);
          await page.click(`${el.tag}:has-text("${el.text.substring(0, 10)}")`).catch(() => {});
          await page.waitForTimeout(2000);
        }
      }
    }
    
    // Take screenshot after Dev Toolkit search
    await page.screenshot({
      path: 'demo-screenshots/issue-19/after-dev-search.png',
      fullPage: true
    });
    
    // Look for migration UI
    console.log('\n📋 Looking for migration UI...');
    const migrationVisible = await page.evaluate(() => {
      const text = document.body?.textContent || '';
      return {
        hasMigration: text.includes('migration') || text.includes('Migration'),
        hasPending: text.includes('pending') || text.includes('Pending'),
        hasTargetMigration: text.includes('20250813151513')
      };
    });
    
    console.log('  Migration UI visible:', migrationVisible);
    
    if (migrationVisible.hasMigration || migrationVisible.hasPending) {
      console.log('  ✅ Migration-related content found!');
      
      // Try to find and click Apply button
      const applyButton = await page.locator('button:has-text("Apply"), button:has-text("Run")').first();
      if (await applyButton.isVisible()) {
        console.log('  🎯 Clicking Apply button...');
        await applyButton.click();
        await page.waitForTimeout(5000);
        
        // Check result
        const result = await page.evaluate(() => document.body?.textContent || '');
        const success = result.includes('Success') || result.includes('Applied');
        const error = result.includes('Error') || result.includes('Failed');
        
        console.log(`  Result: ${success ? '✅ Success' : error ? '❌ Error' : '⚠️ Unknown'}`);
      }
    }
    
    // Save auth state
    await context.storageState({ path: '.auth/user-state.json' });
    console.log('💾 Auth state saved');
    
    // Final screenshot
    await page.screenshot({
      path: 'demo-screenshots/issue-19/final-robust.png',
      fullPage: true
    });
    
    console.log('\n✅ Process complete - check screenshots');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

applyMigrationRobust().catch(console.error);