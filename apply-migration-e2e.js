const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function applyMigrationE2E() {
  console.log('🚀 E2E Migration Application Process');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'log' && !msg.text().includes('FAST')) {
        console.log(`  Browser: ${msg.text()}`);
      }
    });

    // Step 1: Navigate to the app
    console.log('\n📱 Step 1: Navigating to SmallBizAlly...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForTimeout(3000);

    // Screenshot 1: Login page
    await page.screenshot({
      path: 'demo-screenshots/issue-19/migration-01-login-page.png',
      fullPage: true
    });
    console.log('  📸 Screenshot: Login page');

    // Step 2: Click Sign in with Google
    console.log('\n🔐 Step 2: Initiating Google OAuth...');
    const signInButton = await page.locator('button:has-text("Sign in with Google")').first();
    await signInButton.click();
    console.log('  ✅ Clicked Sign in with Google');

    // Wait for Google OAuth page
    await page.waitForTimeout(2000);

    // Check if we're on Google's OAuth page
    const isGoogleOAuth = page.url().includes('accounts.google.com');
    if (isGoogleOAuth) {
      console.log('  ✅ Reached Google OAuth page');
      
      // Screenshot 2: Google OAuth page
      await page.screenshot({
        path: 'demo-screenshots/issue-19/migration-02-google-oauth.png',
        fullPage: true
      });
      console.log('  📸 Screenshot: Google OAuth page');

      // Step 3: Enter email
      console.log('\n📧 Step 3: Entering test email...');
      const emailInput = await page.locator('input[type="email"]').first();
      await emailInput.fill('gianmatteo.allyn.test@gmail.com');
      console.log('  ✅ Entered email: gianmatteo.allyn.test@gmail.com');
      
      // Click Next
      const nextButton = await page.locator('button:has-text("Next"), div[role="button"]:has-text("Next")').first();
      await nextButton.click();
      console.log('  ✅ Clicked Next');
      
      await page.waitForTimeout(3000);

      // Step 4: Enter password (if needed)
      const passwordInput = await page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        console.log('\n🔑 Step 4: Entering password...');
        await passwordInput.fill('myO329Vfi9j5kcRE7TKyYyXZ8Yq3');
        console.log('  ✅ Entered password');
        
        // Click Next again
        const passwordNext = await page.locator('button:has-text("Next"), div[role="button"]:has-text("Next")').first();
        await passwordNext.click();
        console.log('  ✅ Clicked Next');
        
        await page.waitForTimeout(3000);
      }

      // Handle consent screen if it appears
      const continueButton = await page.locator('button:has-text("Continue"), div[role="button"]:has-text("Continue")').first();
      if (await continueButton.isVisible()) {
        console.log('  📋 Handling consent screen...');
        await continueButton.click();
        console.log('  ✅ Clicked Continue');
      }
    }

    // Step 5: Wait for redirect back to app
    console.log('\n⏳ Step 5: Waiting for authentication to complete...');
    await page.waitForFunction(
      () => !window.location.href.includes('accounts.google.com'),
      { timeout: 30000 }
    ).catch(() => console.log('  ⚠️ Still on Google page, continuing...'));

    await page.waitForTimeout(5000);

    // Screenshot 3: After authentication
    await page.screenshot({
      path: 'demo-screenshots/issue-19/migration-03-authenticated.png',
      fullPage: true
    });
    console.log('  📸 Screenshot: After authentication');

    // Check if we're authenticated
    const pageContent = await page.evaluate(() => document.body.textContent);
    const isAuthenticated = pageContent.includes('Welcome') || 
                          pageContent.includes('Dashboard') || 
                          pageContent.includes('Task');
    
    console.log(`  🔍 Authentication status: ${isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);

    // Step 6: Look for Dev Toolkit
    console.log('\n🔧 Step 6: Looking for Dev Toolkit...');
    
    // First check if Dev Toolkit is visible
    const devToolkitVisible = await page.locator('[data-testid="dev-toolkit"]').isVisible().catch(() => false);
    const purpleButtonVisible = await page.locator('button.bg-purple-600').isVisible().catch(() => false);
    
    console.log(`  Dev Toolkit visible: ${devToolkitVisible}`);
    console.log(`  Purple button visible: ${purpleButtonVisible}`);

    // If not visible, try clicking the purple button
    if (!devToolkitVisible && purpleButtonVisible) {
      console.log('  🎯 Clicking purple dev button...');
      await page.locator('button.bg-purple-600').click();
      await page.waitForTimeout(2000);
      
      // Screenshot 4: After clicking dev button
      await page.screenshot({
        path: 'demo-screenshots/issue-19/migration-04-dev-button-clicked.png',
        fullPage: true
      });
      console.log('  📸 Screenshot: After clicking dev button');
    }

    // Step 7: Look for migration UI
    console.log('\n📋 Step 7: Looking for migration UI...');
    
    // Look for migration badge or text
    const migrationElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => {
          const text = (el.textContent || '').toLowerCase();
          return text.includes('migration') || text.includes('pending');
        })
        .slice(0, 5)
        .map(el => ({
          tag: el.tagName,
          text: el.textContent?.substring(0, 100),
          testId: el.getAttribute('data-testid')
        }));
    });

    if (migrationElements.length > 0) {
      console.log('  ✅ Found migration-related elements:');
      migrationElements.forEach(el => {
        console.log(`    - ${el.tag}: ${el.text}`);
      });
    }

    // Try to click on migration badge or runner
    const migrationBadge = await page.locator('[data-testid="migration-badge"], button:has-text("migration"), div:has-text("pending migration")').first();
    if (await migrationBadge.isVisible()) {
      console.log('  🎯 Clicking migration badge/button...');
      await migrationBadge.click();
      await page.waitForTimeout(2000);
      
      // Screenshot 5: Migration UI
      await page.screenshot({
        path: 'demo-screenshots/issue-19/migration-05-migration-ui.png',
        fullPage: true
      });
      console.log('  📸 Screenshot: Migration UI opened');
    }

    // Step 8: Find and apply the specific migration
    console.log('\n🚀 Step 8: Looking for target migration...');
    const targetMigration = '20250813151513_create_new_user_task_trigger.sql';
    
    const migrationFound = await page.evaluate((target) => {
      const text = document.body.textContent || '';
      return text.includes(target);
    }, targetMigration);

    if (migrationFound) {
      console.log(`  ✅ Found target migration: ${targetMigration}`);
      
      // Screenshot 6: Migration found
      await page.screenshot({
        path: 'demo-screenshots/issue-19/migration-06-target-found.png',
        fullPage: true
      });
      console.log('  📸 Screenshot: Target migration visible');

      // Look for Apply button
      const applyButtons = await page.locator('button:has-text("Apply"), button:has-text("Run"), button:has-text("Execute")').all();
      
      if (applyButtons.length > 0) {
        console.log(`  🎯 Found ${applyButtons.length} apply button(s)`);
        
        // Click the first apply button
        await applyButtons[0].click();
        console.log('  ✅ Clicked Apply button');
        
        // Wait for migration to process
        console.log('  ⏳ Waiting for migration to apply...');
        await page.waitForTimeout(5000);
        
        // Screenshot 7: After applying
        await page.screenshot({
          path: 'demo-screenshots/issue-19/migration-07-after-apply.png',
          fullPage: true
        });
        console.log('  📸 Screenshot: After applying migration');
        
        // Check for success or error messages
        const finalPageContent = await page.evaluate(() => document.body.textContent);
        const hasSuccess = finalPageContent.includes('Success') || 
                          finalPageContent.includes('Applied') || 
                          finalPageContent.includes('Complete');
        const hasError = finalPageContent.includes('Error') || 
                        finalPageContent.includes('Failed');
        
        console.log('\n📊 Migration Result:');
        console.log(`  Success indicators: ${hasSuccess ? '✅ Found' : '❌ Not found'}`);
        console.log(`  Error indicators: ${hasError ? '❌ Found' : '✅ Not found'}`);
        
        if (hasSuccess && !hasError) {
          console.log('\n🎉 MIGRATION SUCCESSFULLY APPLIED!');
        } else if (hasError) {
          console.log('\n❌ MIGRATION FAILED - Error detected');
        } else {
          console.log('\n⚠️ MIGRATION STATUS UNCLEAR - Check screenshots');
        }
      } else {
        console.log('  ❌ No Apply button found');
      }
    } else {
      console.log(`  ❌ Target migration not found: ${targetMigration}`);
    }

    // Step 9: Save authentication state for future use
    console.log('\n💾 Step 9: Saving authentication state...');
    await context.storageState({ path: '.auth/user-state.json' });
    console.log('  ✅ Authentication state saved');

    // Final screenshot
    await page.screenshot({
      path: 'demo-screenshots/issue-19/migration-08-final-state.png',
      fullPage: true
    });
    console.log('  📸 Screenshot: Final state');

    console.log('\n' + '=' .repeat(60));
    console.log('✅ E2E Migration Process Complete');
    console.log('📁 Screenshots saved to: demo-screenshots/issue-19/');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Error during migration process:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({
        path: 'demo-screenshots/issue-19/migration-error.png',
        fullPage: true
      });
      console.log('  📸 Error screenshot saved');
    } catch (screenshotError) {
      console.log('  Could not take error screenshot');
    }
  } finally {
    // Keep browser open for 5 seconds to see final state
    console.log('\n⏳ Keeping browser open for review...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// Run the migration
applyMigrationE2E().catch(console.error);