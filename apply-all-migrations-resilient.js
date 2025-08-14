/**
 * Resilient E2E Migration Application
 * 
 * This script uses E2E automation to apply ALL pending migrations until zero remain.
 * Features:
 * - Automatic authentication detection and refresh
 * - Retry logic for failed migrations  
 * - Self-healing migration fallbacks
 * - Progress tracking and reporting
 * - Screenshot capture for debugging
 */

const { chromium } = require('playwright');
const { AuthResilience } = require('./auth-resilience');
const fs = require('fs');
const path = require('path');

class ResilientMigrationRunner {
  constructor() {
    this.authResilience = new AuthResilience();
    this.maxRetries = 3;
    this.screenshotDir = 'test-screenshots/migration-runs';
    this.sessionId = `run-${Date.now()}`;
  }

  async run() {
    console.log('🚀 Starting Resilient Migration Application Process');
    console.log('=' .repeat(70));
    console.log('🎯 GOAL: Apply ALL pending migrations until zero remain');
    console.log('💪 WITH: Automatic auth recovery and retry logic');
    console.log('=' .repeat(70));

    const browser = await chromium.launch({
      headless: false,
      slowMo: 300
    });

    let context;
    let page;
    let finalResult = { success: false, migrationsApplied: 0, finalPendingCount: null };

    try {
      // Step 1: Ensure authentication is valid
      console.log('\n📍 Step 1: Ensuring authentication is valid...');
      await this.authResilience.ensureValidAuth();

      // Step 2: Create resilient browser context
      console.log('\n📍 Step 2: Creating authenticated browser context...');
      context = await this.authResilience.createResilientContext(browser);
      page = await context.newPage();

      // Step 3: Navigate and verify authentication
      console.log('\n📍 Step 3: Navigating to Dev Toolkit...');
      const authResult = await this.navigateAndVerifyAuth(page);
      if (!authResult.authenticated) {
        throw new Error('Failed to establish authentication');
      }

      // Step 4: Apply migrations in loop until zero remain
      console.log('\n📍 Step 4: Applying migrations until zero remain...');
      let attempt = 0;
      let pendingCount = null;
      let totalApplied = 0;

      while (attempt < 10) { // Safety limit
        attempt++;
        console.log(`\n🔄 Migration Attempt ${attempt}:`);
        
        // Check current pending count
        const status = await this.checkMigrationStatus(page);
        pendingCount = status.pendingCount;
        
        console.log(`   📊 Current status: ${pendingCount} pending migrations`);

        if (pendingCount === 0) {
          console.log('🎉 SUCCESS! Zero pending migrations achieved!');
          finalResult = { success: true, migrationsApplied: totalApplied, finalPendingCount: 0 };
          break;
        }

        // Apply migrations
        console.log(`   🎯 Applying ${pendingCount} migrations...`);
        const applyResult = await this.applyMigrations(page, attempt);
        
        if (applyResult.applied > 0) {
          totalApplied += applyResult.applied;
          console.log(`   ✅ Applied ${applyResult.applied} migrations this round`);
        } else if (applyResult.error) {
          console.log(`   ⚠️ Migration attempt failed: ${applyResult.error}`);
          
          // Try self-healing approach
          if (applyResult.error.includes('already exists') || applyResult.error.includes('duplicate')) {
            console.log('   🔧 Attempting self-healing for existing objects...');
            // The self-healing is already built into the system, so just continue
          }
        }

        // Take screenshot for progress tracking
        await this.captureProgressScreenshot(page, attempt, pendingCount);
        
        // Small delay between attempts
        await page.waitForTimeout(3000);
      }

      if (pendingCount > 0) {
        console.log(`⚠️ Process completed with ${pendingCount} migrations still pending`);
        finalResult = { 
          success: false, 
          migrationsApplied: totalApplied, 
          finalPendingCount: pendingCount,
          reason: 'max_attempts_reached'
        };
      }

    } catch (error) {
      console.error('\n❌ Error during migration process:', error.message);
      finalResult = { 
        success: false, 
        migrationsApplied: 0, 
        finalPendingCount: null, 
        error: error.message 
      };
      
      // Capture error screenshot
      if (page) {
        await this.captureErrorScreenshot(page, error.message);
      }
    } finally {
      console.log('\n' + '=' .repeat(70));
      console.log('📊 FINAL RESULTS:');
      console.log('   Success:', finalResult.success ? '✅' : '❌');
      console.log('   Migrations Applied:', finalResult.migrationsApplied);
      console.log('   Final Pending Count:', finalResult.finalPendingCount);
      if (finalResult.error) {
        console.log('   Error:', finalResult.error);
      }
      if (finalResult.reason) {
        console.log('   Reason:', finalResult.reason);
      }
      console.log('=' .repeat(70));
      
      if (page) await page.waitForTimeout(3000);
      await browser.close();
    }

    return finalResult;
  }

  async navigateAndVerifyAuth(page) {
    try {
      // Get the correct URL from auth validation
      const authValidation = await this.authResilience.validateStoredAuth();
      const targetUrl = authValidation.domain || 'http://localhost:8081';
      const fullUrl = `${targetUrl}/dev-toolkit-standalone`;
      
      console.log(`   🌐 Navigating to: ${fullUrl}`);
      
      // Navigate to Dev Toolkit standalone
      await page.goto(fullUrl, {
        waitUntil: 'networkidle',
        timeout: 45000
      });

      await page.waitForTimeout(2000);

      // Check for authentication indicators
      const demoMode = await page.locator('text=/Demo Mode/i').first();
      const authenticated = await page.locator('text=/Authenticated/i').first();

      const isDemoMode = await demoMode.isVisible({ timeout: 2000 }).catch(() => false);
      const isAuthenticated = await authenticated.isVisible({ timeout: 2000 }).catch(() => false);

      console.log('   🔍 Authentication status:');
      console.log('     Demo Mode visible:', isDemoMode);
      console.log('     Authenticated visible:', isAuthenticated);

      if (isDemoMode) {
        console.log('   ❌ App is in Demo Mode - authentication failed');
        return { authenticated: false, reason: 'demo_mode' };
      }

      if (isAuthenticated) {
        console.log('   ✅ App is authenticated - ready for migrations');
        return { authenticated: true };
      }

      console.log('   ⚠️ Authentication status unclear');
      return { authenticated: false, reason: 'unclear' };

    } catch (error) {
      console.log('   ❌ Navigation error:', error.message);
      return { authenticated: false, reason: 'navigation_error', error: error.message };
    }
  }

  async checkMigrationStatus(page) {
    try {
      // Click on Migrations tab if not already selected
      const migrationTab = await page.locator('button:has-text("Migrations")').first();
      if (await migrationTab.isVisible({ timeout: 2000 })) {
        await migrationTab.click();
        await page.waitForTimeout(2000);
      }

      // Look for pending migrations count
      const pendingSection = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/i').first();
      
      if (await pendingSection.isVisible({ timeout: 5000 })) {
        const pendingText = await pendingSection.textContent();
        const match = pendingText.match(/\\((\\d+)\\)/);
        const pendingCount = match ? parseInt(match[1]) : 0;
        
        return { pendingCount, found: true };
      }

      // Alternative: look for "No pending migrations" message
      const noPendingMsg = await page.locator('text=/no.*pending.*migration/i').first();
      if (await noPendingMsg.isVisible({ timeout: 2000 })) {
        return { pendingCount: 0, found: true };
      }

      console.log('   ⚠️ Could not determine migration status from UI');
      return { pendingCount: null, found: false };

    } catch (error) {
      console.log('   ❌ Error checking migration status:', error.message);
      return { pendingCount: null, found: false, error: error.message };
    }
  }

  async applyMigrations(page, attempt) {
    try {
      // Select all checkboxes
      console.log('     🎯 Selecting all migration checkboxes...');
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      console.log(`     Found ${checkboxes.length} checkboxes`);

      let checkedCount = 0;
      for (const checkbox of checkboxes) {
        if (!(await checkbox.isChecked())) {
          await checkbox.check();
          checkedCount++;
        }
      }
      console.log(`     ✅ Checked ${checkedCount} migrations`);

      // Click Apply Selected button
      const applyButton = await page.locator('button:has-text("Apply Selected")').first();
      
      if (!(await applyButton.isVisible({ timeout: 2000 }))) {
        return { applied: 0, error: 'Apply button not found' };
      }

      console.log('     🚀 Clicking Apply Selected...');
      await applyButton.click();

      // Wait for results with longer timeout for self-healing
      console.log('     ⏳ Waiting for migration results (15 seconds for self-healing)...');
      await page.waitForTimeout(15000);

      // Check for success/error messages
      const successSelectors = [
        'text=/success|applied|complete|healed/i',
        'text=/🔧.*Healed/i',
        'text=/Migration.*Applied/i'
      ];

      const errorSelectors = [
        'text=/error|failed/i',
        'text=/Edge Function.*non-2xx/i'
      ];

      let successFound = false;
      let errorFound = false;
      let errorMessage = '';

      // Check for success messages
      for (const selector of successSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          const text = await element.textContent();
          console.log(`     ✅ Success message: ${text}`);
          successFound = true;
          break;
        }
      }

      // Check for error messages
      for (const selector of errorSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          const text = await element.textContent();
          console.log(`     ❌ Error message: ${text}`);
          errorFound = true;
          errorMessage = text;
          break;
        }
      }

      if (successFound) {
        return { applied: checkedCount, success: true };
      } else if (errorFound) {
        return { applied: 0, error: errorMessage };
      } else {
        console.log('     ⚠️ No clear success or error message found');
        return { applied: 0, error: 'unclear_result' };
      }

    } catch (error) {
      console.log('     ❌ Error during migration application:', error.message);
      return { applied: 0, error: error.message };
    }
  }

  async captureProgressScreenshot(page, attempt, pendingCount) {
    try {
      const dir = path.join(this.screenshotDir, this.sessionId);
      fs.mkdirSync(dir, { recursive: true });
      
      const filename = `attempt-${attempt.toString().padStart(2, '0')}-pending-${pendingCount}.png`;
      await page.screenshot({
        path: path.join(dir, filename),
        fullPage: false
      });
      
      console.log(`     📸 Screenshot: ${filename}`);
    } catch (error) {
      console.log('     ⚠️ Could not capture screenshot:', error.message);
    }
  }

  async captureErrorScreenshot(page, errorMessage) {
    try {
      const dir = path.join(this.screenshotDir, this.sessionId);
      fs.mkdirSync(dir, { recursive: true });
      
      const filename = `error-${Date.now()}.png`;
      await page.screenshot({
        path: path.join(dir, filename),
        fullPage: true
      });
      
      console.log(`📸 Error screenshot saved: ${filename}`);
    } catch (error) {
      console.log('⚠️ Could not capture error screenshot:', error.message);
    }
  }
}

// Run the migration process
async function main() {
  const runner = new ResilientMigrationRunner();
  const result = await runner.run();
  
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ResilientMigrationRunner };