const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

async function testDevToolkitMigration() {
  console.log('🎯 Testing Dev Toolkit Migration Application');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ 
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    // Create context with existing auth
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('X-Frame-Options')) {
        console.log(`  🔍 Browser error: ${msg.text()}`);
      }
    });

    // Go to the application
    console.log('🌐 Navigating to application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
      waitUntil: 'networkidle'
    });

    // Wait for app to load
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: 'demo-screenshots/issue-19/01-app-loaded.png',
      fullPage: true
    });

    console.log('📱 Looking for Dev Toolkit...');
    
    // Look for Dev Toolkit or migration-related indicators
    const devToolkitVisible = await page.isVisible('[data-testid="dev-toolkit"]').catch(() => false);
    const migrationBadgeVisible = await page.isVisible('[data-testid="migration-badge"]').catch(() => false);
    const devModeIndicator = await page.isVisible('.dev-mode-indicator').catch(() => false);

    console.log('🔍 Dev Toolkit visible:', devToolkitVisible);
    console.log('🔍 Migration badge visible:', migrationBadgeVisible);
    console.log('🔍 Dev mode indicator visible:', devModeIndicator);

    // Try to find any migration-related elements
    const migrationElements = await page.$$eval('*', elements => 
      elements.filter(el => 
        el.textContent?.toLowerCase().includes('migration') ||
        el.textContent?.toLowerCase().includes('pending')
      ).map(el => ({
        tagName: el.tagName,
        textContent: el.textContent?.substring(0, 100),
        className: el.className
      }))
    );

    if (migrationElements.length > 0) {
      console.log('🎯 Found migration-related elements:');
      migrationElements.forEach((el, i) => {
        console.log(`  ${i + 1}. ${el.tagName}: ${el.textContent} (class: ${el.className})`);
      });
    }

    // Take screenshot of current state
    await page.screenshot({
      path: 'demo-screenshots/issue-19/02-dev-toolkit-search.png',
      fullPage: true
    });

    // Try to click on any visible migration or dev elements
    const clickableElements = [
      '[data-testid="dev-toolkit"]',
      '[data-testid="migration-badge"]',
      '.dev-mode-indicator',
      'button:has-text("Migration")',
      'div:has-text("pending")',
      '[data-testid="migration-runner"]'
    ];

    for (const selector of clickableElements) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`🎯 Found clickable element: ${selector}`);
          await element.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot after click
          await page.screenshot({
            path: `demo-screenshots/issue-19/03-clicked-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
            fullPage: true
          });
          break;
        }
      } catch (error) {
        // Element not found, continue
      }
    }

    // Check if we're now in a migration interface
    const migrationRunnerVisible = await page.isVisible('[data-testid="migration-runner"]').catch(() => false);
    const pendingMigrationsVisible = await page.$$eval('*', elements => 
      elements.some(el => el.textContent?.includes('20250813151513_create_new_user_task_trigger.sql'))
    );

    console.log('🔍 Migration runner visible:', migrationRunnerVisible);
    console.log('🔍 Target migration visible:', pendingMigrationsVisible);

    if (pendingMigrationsVisible) {
      console.log('✅ Found the target migration in the UI!');
      
      // Try to apply the migration
      const applyButtons = await page.$$('button');
      for (const button of applyButtons) {
        const buttonText = await button.textContent();
        if (buttonText?.includes('Apply') || buttonText?.includes('Run')) {
          console.log(`🎯 Clicking apply button: "${buttonText}"`);
          await button.click();
          
          // Wait for migration to process
          await page.waitForTimeout(5000);
          
          // Take screenshot of result
          await page.screenshot({
            path: 'demo-screenshots/issue-19/04-after-apply-attempt.png',
            fullPage: true
          });
          
          break;
        }
      }
    }

    // Check for any error or success messages
    const pageText = await page.evaluate(() => document.body.textContent);
    const hasError = pageText.includes('Error') || pageText.includes('Failed');
    const hasSuccess = pageText.includes('Success') || pageText.includes('Applied');

    console.log('🔍 Has error message:', hasError);
    console.log('🔍 Has success message:', hasSuccess);

    // Take final screenshot
    await page.screenshot({
      path: 'demo-screenshots/issue-19/05-final-state.png',
      fullPage: true
    });

    console.log('\n📊 TEST RESULTS:');
    console.log('=' .repeat(40));
    console.log(`Migration UI found: ${migrationRunnerVisible || pendingMigrationsVisible}`);
    console.log(`Target migration visible: ${pendingMigrationsVisible}`);
    console.log(`Error detected: ${hasError}`);
    console.log(`Success detected: ${hasSuccess}`);
    console.log('=' .repeat(40));

    if (pendingMigrationsVisible && !hasError) {
      console.log('✅ Migration system appears to be working!');
    } else if (hasError) {
      console.log('❌ Migration system showing errors');
    } else {
      console.log('⚠️ Migration UI not found - may need to enable dev mode');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({
        path: 'demo-screenshots/issue-19/error-state.png',
        fullPage: true
      });
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
    
  } finally {
    await browser.close();
  }
}

testDevToolkitMigration().catch(console.error);