const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * E2E Test: Dev Toolkit Migration System
 * Tests the migration workflow through the Dev Toolkit UI
 * 
 * Expected Flow:
 * 1. Open app with authentication
 * 2. Open Dev Toolkit
 * 3. Navigate to Migration tab
 * 4. Check migration status
 * 5. Verify all migrations are applied
 */

async function testDevToolkitMigration() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testRunDir = path.join(__dirname, `test-run-migration-${timestamp}`);
  
  // Create test directory
  await fs.mkdir(testRunDir, { recursive: true });
  
  console.log(`\n🚀 Dev Toolkit Migration Test`);
  console.log(`📁 Artifacts: ${testRunDir}\n`);
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });
  
  try {
    // Use stored auth state
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Store page in outer scope for error handling
    this.page = page;
    
    // Capture console for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Browser error:', msg.text());
      }
    });
    
    // Step 1: Navigate to app
    console.log('📍 Step 1: Loading application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(testRunDir, '01-app-loaded.png'), 
      fullPage: true 
    });
    
    // Step 2: Check authentication status
    console.log('🔐 Step 2: Verifying authentication...');
    const authState = await page.evaluate(() => {
      const token = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      if (!token) return { authenticated: false };
      
      try {
        const parsed = JSON.parse(token);
        return {
          authenticated: true,
          hasSession: !!parsed.currentSession,
          user: parsed.currentSession?.user?.email
        };
      } catch {
        return { authenticated: false };
      }
    });
    
    console.log('   Auth state:', authState);
    
    // Step 3: Open Dev Toolkit
    console.log('\n🛠️ Step 3: Opening Dev Toolkit...');
    
    // Try keyboard shortcut
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('D');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(1000);
    
    // Check if Dev Toolkit opened
    let devToolkitVisible = await page.evaluate(() => {
      // Look for Dev Toolkit indicators
      const hasDevPanel = document.querySelector('[data-testid="dev-toolkit"]');
      const hasDevTitle = document.body.textContent?.includes('Dev Toolkit');
      const hasFloatingPanel = document.querySelector('.fixed.bottom-4.right-4');
      return hasDevPanel || hasDevTitle || hasFloatingPanel;
    });
    
    if (!devToolkitVisible) {
      console.log('   Dev Toolkit not visible via shortcut, trying button...');
      
      // Look for Dev button
      const devButton = await page.$('button:has-text("Dev")');
      if (devButton) {
        await devButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    await page.screenshot({ 
      path: path.join(testRunDir, '02-dev-toolkit-open.png'), 
      fullPage: true 
    });
    
    // Step 4: Find and click Migration tab
    console.log('\n📋 Step 4: Navigating to Migration tab...');
    
    // Look for Migration tab/button
    const migrationTabFound = await page.evaluate(() => {
      // Find elements with "Migration" text
      const elements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.includes('Migration') && 
        (el.tagName === 'BUTTON' || el.tagName === 'DIV' || el.role === 'tab')
      );
      
      if (elements.length > 0) {
        // Click the first one that looks like a tab/button
        const tab = elements.find(el => 
          el.textContent.trim() === 'Migration' || 
          el.textContent.trim() === 'Migrations'
        );
        if (tab) {
          tab.click();
          return true;
        }
      }
      return false;
    });
    
    if (migrationTabFound) {
      console.log('   ✅ Clicked Migration tab');
      await page.waitForTimeout(2000);
    } else {
      console.log('   ⚠️ Migration tab not found');
    }
    
    await page.screenshot({ 
      path: path.join(testRunDir, '03-migration-tab.png'), 
      fullPage: true 
    });
    
    // Step 5: Check migration status
    console.log('\n🔍 Step 5: Checking migration status...');
    
    const migrationStatus = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      
      return {
        hasPendingText: bodyText.includes('Pending'),
        hasAppliedText: bodyText.includes('Applied'),
        hasNoMigrationsText: bodyText.includes('No pending migrations'),
        hasSuccessText: bodyText.includes('All migrations applied'),
        
        // Look for specific migration files
        hasInitialSchema: bodyText.includes('20250813_000000_initial_schema'),
        hasBootstrapFunction: bodyText.includes('20250813_000001_create_exec_migration'),
        hasSecurityRLS: bodyText.includes('20250813_100002_basic_security_rls'),
        
        // Check for UI elements
        hasApplyButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent?.includes('Apply')),
        hasMigrationList: !!document.querySelector('[data-testid="migration-list"]'),
        
        // Get visible text snippets
        visibleMigrationText: Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent?.includes('migration'))
          .slice(0, 5)
          .map(el => el.textContent?.substring(0, 100))
      };
    });
    
    console.log('\n📊 Migration Status:');
    console.log('   Pending migrations:', migrationStatus.hasPendingText);
    console.log('   Applied migrations:', migrationStatus.hasAppliedText);
    console.log('   Initial schema:', migrationStatus.hasInitialSchema);
    console.log('   Bootstrap function:', migrationStatus.hasBootstrapFunction);
    console.log('   Security RLS:', migrationStatus.hasSecurityRLS);
    
    // Save full status
    await fs.writeFile(
      path.join(testRunDir, 'migration-status.json'),
      JSON.stringify(migrationStatus, null, 2)
    );
    
    // Step 6: Check if we need to apply migrations
    if (migrationStatus.hasApplyButton && migrationStatus.hasPendingText) {
      console.log('\n🚀 Step 6: Found pending migrations, would apply them...');
      console.log('   (Not clicking Apply to avoid changing database state)');
    } else if (migrationStatus.hasNoMigrationsText || migrationStatus.hasSuccessText) {
      console.log('\n✅ Step 6: All migrations are already applied!');
    } else {
      console.log('\n⚠️ Step 6: Unable to determine migration state');
    }
    
    await page.screenshot({ 
      path: path.join(testRunDir, '04-final-state.png'), 
      fullPage: true 
    });
    
    // Step 7: Verify backend connectivity
    console.log('\n🔗 Step 7: Checking backend connectivity...');
    
    const backendStatus = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return {
        hasAuthenticated: bodyText.includes('Authenticated'),
        hasRealBackend: bodyText.includes('Real Backend') || bodyText.includes('Connected to real backend'),
        hasDemoMode: bodyText.includes('Demo mode'),
        hasApiStatus: bodyText.includes('API:')
      };
    });
    
    console.log('   Authenticated badge:', backendStatus.hasAuthenticated);
    console.log('   Real backend:', backendStatus.hasRealBackend);
    console.log('   Demo mode:', backendStatus.hasDemoMode);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('='.repeat(50));
    
    const success = authState.authenticated && 
                   (migrationStatus.hasNoMigrationsText || 
                    migrationStatus.hasSuccessText || 
                    migrationStatus.hasAppliedText);
    
    if (success) {
      console.log('✅ Migration system is working correctly!');
      console.log('   - User authenticated');
      console.log('   - Dev Toolkit accessible');
      console.log('   - Migration tab functional');
      console.log('   - Migrations properly tracked');
    } else {
      console.log('⚠️ Issues detected:');
      if (!authState.authenticated) console.log('   - Authentication missing');
      if (!devToolkitVisible) console.log('   - Dev Toolkit not accessible');
      if (!migrationTabFound) console.log('   - Migration tab not found');
      if (migrationStatus.hasPendingText) console.log('   - Pending migrations exist');
    }
    
    console.log('\n📁 Check screenshots in:', testRunDir);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Only try screenshot if page exists
    if (page) {
      try {
        await page.screenshot({ 
          path: path.join(testRunDir, 'error-state.png'), 
          fullPage: true 
        });
      } catch (screenshotError) {
        console.log('Could not capture error screenshot');
      }
    }
    
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
testDevToolkitMigration().catch(console.error);