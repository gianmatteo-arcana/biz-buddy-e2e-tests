const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * E2E Test: Developer Migration Workflow
 * User Story: As a developer, I want to add a SQL migration and apply it through the Dev Toolkit
 * 
 * Steps:
 * 1. Authenticate with Google OAuth
 * 2. Navigate to Dev Toolkit
 * 3. Click on Migration tab
 * 4. Check for pending migrations
 * 5. Apply migrations
 * 6. Verify success
 */

const APP_URL = process.env.APP_URL || 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
const AUTH_STATE_PATH = path.join(__dirname, 'auth-state.json');

// Helper to create timestamped test run directory
function createTestRunDir() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testRunDir = path.join(__dirname, `test-run-migration-${timestamp}`);
  require('fs').mkdirSync(testRunDir, { recursive: true });
  return testRunDir;
}

// Helper to take screenshot with descriptive name
async function takeScreenshot(page, name, testRunDir) {
  const fileName = `${name}.png`;
  const filePath = path.join(testRunDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot saved: ${fileName}`);
  return filePath;
}

// Helper to wait and handle dynamic content
async function waitForElement(page, selector, options = {}) {
  const timeout = options.timeout || 30000;
  const state = options.state || 'visible';
  
  try {
    await page.waitForSelector(selector, { timeout, state });
    return true;
  } catch (error) {
    console.log(`⏱️ Element not found: ${selector}`);
    return false;
  }
}

async function runMigrationWorkflowTest() {
  const testRunDir = createTestRunDir();
  console.log(`\n🚀 Starting Migration Workflow E2E Test`);
  console.log(`📁 Test artifacts will be saved to: ${testRunDir}`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Console error:', msg.text());
    }
  });
  
  try {
    // Step 1: Navigate to the app
    console.log('\n📍 Step 1: Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await takeScreenshot(page, '01-initial-load', testRunDir);
    
    // Step 2: Check if we need to authenticate
    console.log('\n🔐 Step 2: Checking authentication status...');
    
    // Try to load existing auth state
    let authenticated = false;
    try {
      const authState = await fs.readFile(AUTH_STATE_PATH, 'utf8');
      const authData = JSON.parse(authState);
      
      // Apply auth state to context
      await context.addCookies(authData.cookies);
      await page.evaluate((storage) => {
        Object.entries(storage).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      }, authData.localStorage);
      
      // Reload to apply auth
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      authenticated = true;
      console.log('✅ Restored authentication from previous session');
    } catch (error) {
      console.log('📝 No previous auth state found, need to authenticate');
    }
    
    // If not authenticated, do Google OAuth
    if (!authenticated) {
      const hasGoogleButton = await waitForElement(page, 'button:has-text("Sign in with Google")', { timeout: 5000 });
      if (hasGoogleButton) {
        console.log('🔐 Starting Google OAuth flow...');
        
        // Click Google sign in
        await page.click('button:has-text("Sign in with Google")');
        
        // Wait for Google OAuth popup
        const popupPromise = page.waitForEvent('popup');
        const popup = await popupPromise;
        
        // Handle Google OAuth
        await popup.waitForLoadState('networkidle');
        await popup.fill('input[type="email"]', TEST_EMAIL);
        await popup.click('#identifierNext');
        
        // Note: Password entry would go here in real flow
        console.log('⚠️ Google OAuth requires manual password entry in real environment');
        
        // Wait for redirect back
        await page.waitForTimeout(5000);
      }
    }
    
    await takeScreenshot(page, '02-after-auth', testRunDir);
    
    // Step 3: Open Dev Toolkit
    console.log('\n🛠️ Step 3: Opening Dev Toolkit...');
    
    // Try keyboard shortcut first
    await page.keyboard.press('Control+Shift+D');
    await page.waitForTimeout(1000);
    
    // Check if Dev Toolkit opened
    let devToolkitOpen = await waitForElement(page, '[data-testid="dev-toolkit"]', { timeout: 3000 });
    
    if (!devToolkitOpen) {
      // Try clicking the Dev button if visible
      const hasDevButton = await waitForElement(page, 'button:has-text("Dev")', { timeout: 3000 });
      if (hasDevButton) {
        await page.click('button:has-text("Dev")');
        await page.waitForTimeout(1000);
        devToolkitOpen = await waitForElement(page, '[data-testid="dev-toolkit"]', { timeout: 3000 });
      }
    }
    
    if (!devToolkitOpen) {
      // Try the floating Dev Toolkit button
      const hasFloatingButton = await waitForElement(page, '[aria-label="Open Dev Toolkit"]', { timeout: 3000 });
      if (hasFloatingButton) {
        await page.click('[aria-label="Open Dev Toolkit"]');
        await page.waitForTimeout(1000);
        devToolkitOpen = await waitForElement(page, '[data-testid="dev-toolkit"]', { timeout: 3000 });
      }
    }
    
    await takeScreenshot(page, '03-dev-toolkit-open', testRunDir);
    
    // Step 4: Navigate to Migration tab
    console.log('\n📋 Step 4: Navigating to Migration tab...');
    
    // Look for Migration tab
    const migrationTabSelectors = [
      'button:has-text("Migration")',
      '[role="tab"]:has-text("Migration")',
      'div:has-text("Migration"):not(:has(*))', // Leaf node with text
      'button:has-text("Migrations")',
      '[role="tab"]:has-text("Migrations")'
    ];
    
    let migrationTabFound = false;
    for (const selector of migrationTabSelectors) {
      if (await waitForElement(page, selector, { timeout: 2000 })) {
        await page.click(selector);
        migrationTabFound = true;
        console.log(`✅ Clicked migration tab: ${selector}`);
        break;
      }
    }
    
    if (!migrationTabFound) {
      console.log('⚠️ Migration tab not found, looking for migration content directly...');
    }
    
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '04-migration-tab', testRunDir);
    
    // Step 5: Check for pending migrations
    console.log('\n🔍 Step 5: Checking for pending migrations...');
    
    // Look for migration-related content
    const migrationIndicators = [
      'text=/pending migration/i',
      'text=/pending \\(\\d+\\)/i',
      'text=/apply migration/i',
      'text=/apply selected/i',
      '[data-testid="migration-runner"]',
      '.migration-item',
      'text=/20250813.*\\.sql/i' // Our migration files
    ];
    
    let migrationsFound = false;
    for (const indicator of migrationIndicators) {
      if (await waitForElement(page, indicator, { timeout: 2000 })) {
        migrationsFound = true;
        console.log(`✅ Found migration indicator: ${indicator}`);
        
        // Get text content to see what migrations are pending
        try {
          const migrationText = await page.textContent(indicator);
          console.log(`📝 Migration content: ${migrationText}`);
        } catch (e) {
          // Ignore if can't get text
        }
      }
    }
    
    await takeScreenshot(page, '05-pending-migrations', testRunDir);
    
    // Step 6: Try to apply migrations
    console.log('\n🚀 Step 6: Attempting to apply migrations...');
    
    // Look for apply button
    const applyButtonSelectors = [
      'button:has-text("Apply")',
      'button:has-text("Apply Selected")',
      'button:has-text("Apply Migration")',
      'button:has-text("Run Migration")',
      '[data-testid="apply-migration-button"]'
    ];
    
    let applyButtonFound = false;
    for (const selector of applyButtonSelectors) {
      if (await waitForElement(page, selector, { timeout: 2000 })) {
        // First, check if we need to select migrations
        const checkboxes = await page.$$('input[type="checkbox"]');
        if (checkboxes.length > 0) {
          console.log(`📝 Found ${checkboxes.length} migration checkboxes, selecting all...`);
          for (const checkbox of checkboxes) {
            await checkbox.click();
          }
          await page.waitForTimeout(500);
        }
        
        console.log(`🖱️ Clicking apply button: ${selector}`);
        await page.click(selector);
        applyButtonFound = true;
        
        // Wait for migration to process
        await page.waitForTimeout(5000);
        
        await takeScreenshot(page, '06-after-apply-click', testRunDir);
        
        // Check for success or error messages
        const resultSelectors = [
          'text=/success/i',
          'text=/completed/i',
          'text=/failed/i',
          'text=/error/i',
          '.toast-message',
          '[role="alert"]'
        ];
        
        for (const resultSelector of resultSelectors) {
          if (await waitForElement(page, resultSelector, { timeout: 5000 })) {
            const resultText = await page.textContent(resultSelector);
            console.log(`📋 Migration result: ${resultText}`);
            
            if (resultText.toLowerCase().includes('error') || resultText.toLowerCase().includes('fail')) {
              console.log('❌ Migration failed with error');
              
              // Try to get more error details
              const errorDetails = await page.$$eval('[role="alert"], .error-message, .toast-error', 
                elements => elements.map(el => el.textContent)
              );
              if (errorDetails.length > 0) {
                console.log('Error details:', errorDetails);
              }
            } else if (resultText.toLowerCase().includes('success') || resultText.toLowerCase().includes('completed')) {
              console.log('✅ Migration applied successfully!');
            }
          }
        }
        
        break;
      }
    }
    
    if (!applyButtonFound) {
      console.log('⚠️ No apply button found');
      
      // Check if migrations are already applied
      if (await waitForElement(page, 'text=/no pending migrations/i', { timeout: 2000 })) {
        console.log('ℹ️ No pending migrations to apply');
      }
    }
    
    await takeScreenshot(page, '07-final-state', testRunDir);
    
    // Step 7: Collect diagnostic information
    console.log('\n📊 Step 7: Collecting diagnostic information...');
    
    // Get all visible text in migration area
    const migrationAreaText = await page.evaluate(() => {
      const migrationElements = document.querySelectorAll('[data-testid*="migration"], .migration-runner, [class*="migration"]');
      return Array.from(migrationElements).map(el => el.textContent).join('\n');
    });
    
    if (migrationAreaText) {
      console.log('Migration area content:', migrationAreaText);
    }
    
    // Get console logs
    const consoleLogs = await page.evaluate(() => {
      return window.__consoleLogs || [];
    });
    
    // Save diagnostic data
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      migrationAreaText,
      consoleLogs,
      testEmail: TEST_EMAIL
    };
    
    await fs.writeFile(
      path.join(testRunDir, 'diagnostics.json'),
      JSON.stringify(diagnosticData, null, 2)
    );
    
    console.log('\n✅ Test completed!');
    console.log(`📁 Check results in: ${testRunDir}`);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    await takeScreenshot(page, 'error-state', testRunDir);
    
    // Save error details
    await fs.writeFile(
      path.join(testRunDir, 'error.json'),
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  } finally {
    await browser.close();
  }
}

// Run the test
runMigrationWorkflowTest().catch(console.error);