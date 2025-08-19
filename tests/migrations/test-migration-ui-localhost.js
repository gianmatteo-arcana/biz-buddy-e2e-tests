const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * TEST MIGRATION UI ON LOCALHOST
 * 
 * This test will:
 * 1. Sign in with OAuth (if needed)
 * 2. Navigate to Dev Toolkit
 * 3. Test the migration UI functionality
 */

async function signInWithOAuth(page) {
  console.log('🔐 Signing in with OAuth...');
  
  // Click the sign in button
  const signInButton = await page.locator('button:has-text("Sign in with Google")').first();
  if (await signInButton.isVisible()) {
    await signInButton.click();
    console.log('✅ Clicked Sign in with Google');
    
    // Wait for OAuth window
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      signInButton.click()
    ]);
    
    // Handle OAuth in popup
    if (popup) {
      console.log('📱 OAuth popup opened');
      
      // Wait for Google login page
      await popup.waitForLoadState('domcontentloaded');
      
      // Use the test credentials
      const testEmail = 'gianmatteo.allyn.test@gmail.com';
      const testPassword = process.env.GOOGLE_TEST_PASSWORD || 'myO329Vfi9j5kcRE7TKyYyXZ8Yq3';
      
      // Enter email
      await popup.fill('input[type="email"]', testEmail);
      await popup.click('button:has-text("Next")');
      await delay(2000);
      
      // Enter password
      await popup.fill('input[type="password"]', testPassword);
      await popup.click('button:has-text("Next")');
      
      // Wait for OAuth to complete
      await popup.waitForEvent('close');
      console.log('✅ OAuth completed');
    }
  }
  
  // Wait for redirect back to app
  await page.waitForTimeout(5000);
}

async function testMigrationUI() {
  console.log('🚀 Starting Migration UI Test on Localhost');
  
  const testRunId = `migration-localhost-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const testDir = path.join(__dirname, testRunId);
  fs.mkdirSync(testDir, { recursive: true });
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  try {
    // Create context (without storageState since we'll sign in fresh)
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1200 }
    });
    
    const page = await context.newPage();
    
    // Log console messages for debugging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('Error') || text.includes('Failed')) {
        console.log(`[CONSOLE ${type.toUpperCase()}]`, text);
      }
      if (text.includes('[MigrationRunner]') || text.includes('Edge function')) {
        console.log(`[CONSOLE]`, text);
      }
    });
    
    // Step 1: Navigate to localhost
    console.log('📍 Step 1: Navigating to localhost:8080');
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    await delay(2000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(testDir, '01-initial-load.png'), 
      fullPage: true 
    });
    
    // Check if we need to sign in
    const signInVisible = await page.locator('text="Please sign in to get started"').isVisible();
    if (signInVisible) {
      console.log('📱 Sign in required');
      
      // For now, we'll need manual sign in
      console.log('⚠️ Manual sign-in required:');
      console.log('1. Click "Sign in with Google" in the browser');
      console.log('2. Complete the OAuth flow');
      console.log('3. Wait for redirect back to the app');
      console.log('\nWaiting 30 seconds for manual sign-in...');
      
      await delay(30000);
      
      // Check if signed in now
      const stillSignIn = await page.locator('text="Please sign in to get started"').isVisible();
      if (stillSignIn) {
        console.log('❌ Still on sign-in page. Please complete sign-in manually.');
        throw new Error('Not signed in');
      }
    }
    
    console.log('✅ Signed in successfully');
    await page.screenshot({ 
      path: path.join(testDir, '02-signed-in.png'), 
      fullPage: true 
    });
    
    // Step 2: Open Dev Toolkit
    console.log('📍 Step 2: Opening Dev Toolkit');
    
    // Wait for dashboard to load
    await page.waitForSelector('text=/Dashboard|Dev Toolkit/', { timeout: 10000 });
    
    const devToolkitButton = await page.locator('button:has-text("Dev Toolkit")').first();
    if (await devToolkitButton.isVisible()) {
      await devToolkitButton.click();
      console.log('✅ Clicked Dev Toolkit button');
      await delay(2000);
    } else {
      console.log('⚠️ Dev Toolkit button not found, may already be open');
    }
    
    await page.screenshot({ 
      path: path.join(testDir, '03-dev-toolkit.png'), 
      fullPage: true 
    });
    
    // Step 3: Click on Migrations tab
    console.log('📍 Step 3: Opening Migrations tab');
    const migrationsTab = await page.locator('button:has-text("Migrations")').first();
    if (await migrationsTab.isVisible()) {
      await migrationsTab.click();
      console.log('✅ Clicked Migrations tab');
      await delay(5000); // Give time for migrations to load with new timeout handling
    } else {
      console.log('❌ Migrations tab not found');
      
      // Try to find it in tabs
      const allTabs = await page.locator('button[role="tab"]').all();
      console.log(`Found ${allTabs.length} tabs`);
      for (const tab of allTabs) {
        const text = await tab.textContent();
        console.log(`  - Tab: ${text}`);
      }
    }
    
    await page.screenshot({ 
      path: path.join(testDir, '04-migrations-tab.png'), 
      fullPage: true 
    });
    
    // Step 4: Check migration status
    console.log('📍 Step 4: Checking migration status');
    
    // Wait for migration content to load
    await delay(5000);
    
    // Look for any migration-related text
    const pageContent = await page.textContent('body');
    if (pageContent.includes('Pending Migrations')) {
      console.log('✅ Found "Pending Migrations" text');
      
      // Extract count
      const match = pageContent.match(/Pending Migrations.*?\((\d+)\)/);
      if (match) {
        const count = parseInt(match[1]);
        console.log(`📊 ${count} pending migrations found`);
      }
    } else if (pageContent.includes('No migrations found')) {
      console.log('✅ No pending migrations - system is up to date');
    } else if (pageContent.includes('Loading migrations')) {
      console.log('⏳ Migrations still loading...');
      await delay(5000);
      await page.screenshot({ 
        path: path.join(testDir, '05-migrations-loaded.png'), 
        fullPage: true 
      });
    } else {
      console.log('⚠️ Could not determine migration status');
      console.log('Page contains:', pageContent.substring(0, 500));
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: path.join(testDir, '06-final-state.png'), 
      fullPage: true 
    });
    
    console.log(`\n📂 Test results saved to: ${testDir}`);
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testMigrationUI().catch(console.error);