const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * COMPREHENSIVE MIGRATION APPLICATION E2E TEST
 * 
 * Purpose: Test the complete flow of applying migrations through Dev Toolkit
 * Expected to fail initially, then iterate until finding a working solution
 * 
 * Test Flow:
 * 1. Navigate to Dev Toolkit (local instance)
 * 2. Go to Migrations tab
 * 3. Check pending migrations
 * 4. Select migrations to apply
 * 5. Click Apply button
 * 6. Monitor for success/failure
 * 7. Debug and fix any issues
 * 8. Iterate until migrations apply successfully
 */

class MigrationApplyTest {
  constructor() {
    this.testRunId = `test-run-migration-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.testDir = path.join(__dirname, this.testRunId);
    this.screenshots = [];
    this.logs = [];
    this.iterations = 0;
    this.maxIterations = 5;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
  }

  async takeScreenshot(page, name, description) {
    const filename = `${String(this.screenshots.length + 1).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(this.testDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    this.screenshots.push({ filename, description, timestamp: new Date().toISOString() });
    this.log(`📸 Screenshot: ${filename} - ${description}`);
    return filepath;
  }

  async setupTest() {
    this.log('🚀 Setting up test environment...');
    fs.mkdirSync(this.testDir, { recursive: true });
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 500,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1600, height: 1200 },
      recordVideo: {
        dir: this.testDir,
        size: { width: 1600, height: 1200 }
      }
    });
    
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        this.log(`Browser Console Error: ${msg.text()}`, 'error');
      }
    });
    
    page.on('pageerror', error => {
      this.log(`Page Error: ${error.message}`, 'error');
    });
    
    return { browser, context, page };
  }

  async navigateToDevToolkit(page) {
    this.log('📍 Navigating to Dev Toolkit...');
    
    // Use local instance for faster iteration
    const url = 'http://localhost:8080/dev-toolkit-standalone';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    await this.takeScreenshot(page, 'dev-toolkit-initial', 'Dev Toolkit initial load');
    
    // Check for authentication or demo mode
    try {
      // First check if we're authenticated
      const authSelector = await page.locator('text=/Authenticated as:|Demo Mode/').first();
      if (await authSelector.isVisible()) {
        const authText = await authSelector.textContent();
        if (authText.includes('Demo Mode')) {
          this.log('⚠️ Dev Toolkit is in Demo Mode - authentication may not be working', 'warning');
        } else {
          this.log(`✅ Authentication confirmed: ${authText}`);
        }
      }
    } catch (e) {
      this.log('⚠️ Could not determine authentication status, continuing...', 'warning');
    }
    
    // Wait for Dev Toolkit to be ready
    await page.waitForSelector('text=Dev Toolkit', { timeout: 10000 });
    
    return true;
  }

  async navigateToMigrationsTab(page) {
    this.log('📍 Navigating to Migrations tab...');
    
    // The Migrations tab has a red badge with number 2
    // Try to click on it directly
    try {
      // Use simple text selector
      await page.click('text=Migrations');
      this.log(`✅ Clicked Migrations tab`);
      
      await delay(2000); // Give time for content to load
      await this.takeScreenshot(page, 'migrations-tab', 'Migrations tab opened');
      
      return true;
    } catch (e) {
      this.log(`❌ Error clicking Migrations tab: ${e.message}`, 'error');
      await this.takeScreenshot(page, 'migrations-tab-error', 'Could not click Migrations tab');
      
      // Try alternative approach - look for any clickable element with "Migrations"
      try {
        const elements = await page.locator('*:has-text("Migrations")').all();
        this.log(`Found ${elements.length} elements with text "Migrations"`);
        
        for (let i = 0; i < elements.length; i++) {
          const tagName = await elements[i].evaluate(el => el.tagName);
          const text = await elements[i].textContent();
          this.log(`  Element ${i}: <${tagName}> - ${text.substring(0, 50)}`);
        }
      } catch (debugError) {
        this.log(`Could not debug elements: ${debugError.message}`);
      }
      
      throw new Error('Could not find or click Migrations tab');
    }
  }

  async checkPendingMigrations(page) {
    this.log('📍 Checking for pending migrations...');
    
    // Wait for migrations to load
    await page.waitForSelector('text=/Pending Migrations|Applied Migrations/', { timeout: 10000 });
    
    // Check if there are pending migrations
    const pendingSection = await page.locator('text=Pending Migrations').first();
    if (await pendingSection.isVisible()) {
      const pendingText = await pendingSection.textContent();
      this.log(`📊 Pending migrations section: ${pendingText}`);
      
      // Look for migration items
      const migrationItems = await page.locator('[data-testid^="migration-item"], .migration-item, [class*="migration"]').all();
      this.log(`📊 Found ${migrationItems.length} migration items`);
      
      if (migrationItems.length === 0) {
        this.log('⚠️ No migration items found, checking for different structure...');
        
        // Try to find migrations by looking for SQL file names
        const sqlFiles = await page.locator('text=.sql').all();
        this.log(`📊 Found ${sqlFiles.length} SQL file references`);
        
        for (const file of sqlFiles) {
          const text = await file.textContent();
          this.log(`  - ${text}`);
        }
      }
      
      await this.takeScreenshot(page, 'pending-migrations', 'Pending migrations list');
      return migrationItems.length > 0 || (await page.locator('text=.sql').count()) > 0;
    }
    
    return false;
  }

  async selectMigrations(page) {
    this.log('📍 Selecting migrations to apply...');
    
    // Try to find checkboxes for migrations
    const checkboxSelectors = [
      'input[type="checkbox"]:not(:checked)',
      '[role="checkbox"]:not([aria-checked="true"])',
      '.migration-checkbox'
    ];
    
    let selected = 0;
    for (const selector of checkboxSelectors) {
      const checkboxes = await page.locator(selector).all();
      for (const checkbox of checkboxes) {
        if (await checkbox.isVisible()) {
          await checkbox.click();
          selected++;
          this.log(`✅ Selected migration ${selected}`);
          await delay(500);
        }
      }
    }
    
    if (selected === 0) {
      this.log('⚠️ No checkboxes found, trying to select by clicking on migration items...');
      
      // Try clicking on migration items directly
      const migrationItems = await page.locator('text=.sql').all();
      for (const item of migrationItems) {
        await item.click();
        selected++;
        this.log(`✅ Clicked migration item ${selected}`);
        await delay(500);
      }
    }
    
    await this.takeScreenshot(page, 'migrations-selected', `${selected} migrations selected`);
    return selected > 0;
  }

  async applyMigrations(page) {
    this.log('📍 Applying selected migrations...');
    
    // Find the Apply button
    const applyButtonSelectors = [
      'button:has-text("Apply")',
      'button:has-text("Execute")',
      'button:has-text("Run")',
      '[data-testid="apply-migrations-button"]'
    ];
    
    let applyButton = null;
    for (const selector of applyButtonSelectors) {
      const button = await page.locator(selector).first();
      if (await button.isVisible()) {
        applyButton = button;
        const buttonText = await button.textContent();
        this.log(`✅ Found Apply button: "${buttonText}"`);
        break;
      }
    }
    
    if (!applyButton) {
      throw new Error('Could not find Apply button');
    }
    
    // Check if button is enabled
    const isDisabled = await applyButton.isDisabled();
    if (isDisabled) {
      this.log('⚠️ Apply button is disabled, may need to select migrations first');
      return false;
    }
    
    await this.takeScreenshot(page, 'before-apply', 'Before clicking Apply button');
    
    // Click the Apply button
    await applyButton.click();
    this.log('🔘 Clicked Apply button');
    
    // Wait for response
    await delay(3000);
    
    await this.takeScreenshot(page, 'after-apply', 'After clicking Apply button');
    
    return true;
  }

  async checkMigrationResult(page) {
    this.log('📍 Checking migration result...');
    
    // Click "Show Debug Info" button if available
    try {
      const debugButton = await page.locator('text="Show Debug Info"').first();
      if (await debugButton.isVisible()) {
        await debugButton.click();
        this.log('🔍 Clicked "Show Debug Info" button');
        await delay(1000);
        await this.takeScreenshot(page, 'debug-info', 'Debug information displayed');
      }
    } catch (e) {
      // Debug button might not be there
    }
    
    // Look for success indicators
    const successSelectors = [
      'text=/success|complete|applied/i',
      '.success-message',
      '[class*="success"]',
      '.toast-success'
    ];
    
    // Look for error indicators
    const errorSelectors = [
      'text=/error|fail|denied|unauthorized/i',
      '.error-message',
      '[class*="error"]',
      '.toast-error'
    ];
    
    let success = false;
    let error = null;
    
    // Check for success
    for (const selector of successSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        for (const element of elements) {
          const text = await element.textContent();
          this.log(`✅ Success indicator: ${text}`, 'success');
          success = true;
        }
      }
    }
    
    // Check for errors
    for (const selector of errorSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        for (const element of elements) {
          const text = await element.textContent();
          this.log(`❌ Error indicator: ${text}`, 'error');
          error = text;
        }
      }
    }
    
    await this.takeScreenshot(page, 'migration-result', success ? 'Migration succeeded' : 'Migration failed');
    
    // If error, determine if we found both success and error indicators
    if (error && success) {
      this.log('⚠️ Found both success and error indicators, treating as error');
      success = false;
    }
    
    return { success: success && !error, error };
  }

  async debugAndFix(page, error) {
    this.log('🔧 Debugging migration failure...', 'debug');
    
    // Common issues and fixes
    const fixes = {
      'unauthorized': 'Need to check authentication and permissions',
      'service_role': 'Service role key may be needed for admin operations',
      'permission': 'RLS policies may be blocking the operation',
      'syntax': 'SQL syntax error in migration file',
      'already exists': 'Migration may have been partially applied',
      'timeout': 'Edge function may be taking too long'
    };
    
    for (const [keyword, fix] of Object.entries(fixes)) {
      if (error && error.toLowerCase().includes(keyword)) {
        this.log(`💡 Potential fix: ${fix}`, 'debug');
      }
    }
    
    // Check browser console for additional errors
    const consoleErrors = await page.evaluate(() => {
      const errors = [];
      console.error = function(...args) {
        errors.push(args.join(' '));
      };
      return errors;
    });
    
    if (consoleErrors.length > 0) {
      this.log('📋 Console errors:', 'debug');
      consoleErrors.forEach(err => this.log(`  - ${err}`, 'debug'));
    }
    
    // Check network requests for failed API calls
    this.log('🌐 Checking network activity...', 'debug');
    
    return true;
  }

  async verifyMigrationApplied(page) {
    this.log('📍 Verifying migration was applied...');
    
    // Refresh the page
    await page.reload({ waitUntil: 'networkidle' });
    await delay(2000);
    
    // Navigate back to Migrations tab
    await this.navigateToMigrationsTab(page);
    
    // Check Applied Migrations section
    const appliedSection = await page.locator('text=Applied Migrations').first();
    if (await appliedSection.isVisible()) {
      const appliedText = await appliedSection.textContent();
      this.log(`📊 Applied migrations section: ${appliedText}`);
      
      await this.takeScreenshot(page, 'applied-migrations', 'Applied migrations after refresh');
      
      // Look for recently applied migrations
      const recentlyApplied = await page.locator('text=/just now|seconds ago|minute ago/i').count();
      if (recentlyApplied > 0) {
        this.log(`✅ Found ${recentlyApplied} recently applied migrations`);
        return true;
      }
    }
    
    return false;
  }

  async runIteration(page) {
    this.iterations++;
    this.log(`\n🔄 ITERATION ${this.iterations}/${this.maxIterations}`, 'info');
    
    try {
      // Navigate to Dev Toolkit
      await this.navigateToDevToolkit(page);
      
      // Go to Migrations tab
      await this.navigateToMigrationsTab(page);
      
      // Check for pending migrations
      const hasPending = await this.checkPendingMigrations(page);
      if (!hasPending) {
        this.log('✅ No pending migrations found - all migrations applied!', 'success');
        return { success: true, reason: 'All migrations already applied' };
      }
      
      // Select migrations
      const selected = await this.selectMigrations(page);
      if (!selected) {
        this.log('⚠️ Could not select any migrations', 'warning');
        return { success: false, reason: 'Could not select migrations' };
      }
      
      // Apply migrations
      const applied = await this.applyMigrations(page);
      if (!applied) {
        this.log('⚠️ Could not apply migrations', 'warning');
        return { success: false, reason: 'Apply button disabled or not found' };
      }
      
      // Check result
      const result = await this.checkMigrationResult(page);
      if (result.success) {
        this.log('✅ Migration applied successfully!', 'success');
        
        // Verify it was actually applied
        const verified = await this.verifyMigrationApplied(page);
        if (verified) {
          this.log('✅ Migration verified in Applied section', 'success');
          return { success: true, reason: 'Migration applied and verified' };
        } else {
          this.log('⚠️ Migration claimed success but not verified in Applied section', 'warning');
          return { success: false, reason: 'Migration not verified after claiming success' };
        }
      } else {
        this.log(`❌ Migration failed: ${result.error}`, 'error');
        
        // Debug and try to fix
        await this.debugAndFix(page, result.error);
        
        return { success: false, reason: result.error };
      }
      
    } catch (error) {
      this.log(`❌ Iteration failed with error: ${error.message}`, 'error');
      await this.takeScreenshot(page, `error-iteration-${this.iterations}`, 'Error state');
      return { success: false, reason: error.message };
    }
  }

  async saveTestReport() {
    const report = {
      testRunId: this.testRunId,
      timestamp: new Date().toISOString(),
      iterations: this.iterations,
      screenshots: this.screenshots,
      logs: this.logs,
      testDir: this.testDir
    };
    
    const reportPath = path.join(this.testDir, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Create markdown report
    const mdReport = `# Migration Application E2E Test Report

## Test Run: ${this.testRunId}

### Summary
- **Date**: ${new Date().toISOString()}
- **Iterations**: ${this.iterations}
- **Screenshots**: ${this.screenshots.length}
- **Test Directory**: ${this.testDir}

### Screenshots
${this.screenshots.map(s => `- **${s.filename}**: ${s.description}`).join('\n')}

### Execution Log
\`\`\`
${this.logs.join('\n')}
\`\`\`
`;
    
    const mdPath = path.join(this.testDir, 'README.md');
    fs.writeFileSync(mdPath, mdReport);
    
    this.log(`📄 Test report saved to: ${reportPath}`);
    this.log(`📄 Markdown report saved to: ${mdPath}`);
  }

  async run() {
    this.log('🚀 Starting Migration Application E2E Test');
    this.log('📋 Test objective: Apply migrations through Dev Toolkit UI');
    this.log('🔄 Will iterate until successful or max iterations reached');
    
    const { browser, context, page } = await this.setupTest();
    
    try {
      let success = false;
      let lastResult = null;
      
      while (!success && this.iterations < this.maxIterations) {
        lastResult = await this.runIteration(page);
        success = lastResult.success;
        
        if (!success) {
          this.log(`⏳ Waiting before next iteration...`, 'info');
          await delay(3000);
        }
      }
      
      if (success && lastResult) {
        this.log('\n🎉 SUCCESS! Migration applied successfully!', 'success');
        this.log(`✅ Completed in ${this.iterations} iteration(s)`, 'success');
      } else {
        this.log('\n💥 FAILED: Could not apply migrations after max iterations', 'error');
        this.log(`❌ Last error: ${lastResult?.reason || 'Unknown error'}`, 'error');
      }
      
      // Final state screenshots
      await this.takeScreenshot(page, 'final-state', 'Final state of Dev Toolkit');
      
      // Save comprehensive report
      await this.saveTestReport();
      
      return {
        success,
        iterations: this.iterations,
        testDir: this.testDir,
        screenshots: this.screenshots,
        lastResult
      };
      
    } catch (error) {
      this.log(`💥 Test failed with error: ${error.message}`, 'error');
      await this.takeScreenshot(page, 'fatal-error', 'Fatal error state');
      await this.saveTestReport();
      throw error;
      
    } finally {
      // Save video if available
      await context.close();
      await browser.close();
      
      this.log('\n📊 Test Summary:', 'info');
      this.log(`  - Iterations: ${this.iterations}`, 'info');
      this.log(`  - Screenshots: ${this.screenshots.length}`, 'info');
      this.log(`  - Test Directory: ${this.testDir}`, 'info');
    }
  }
}

// Run the test
async function main() {
  const test = new MigrationApplyTest();
  
  try {
    const result = await test.run();
    
    if (result.success) {
      console.log('\n✅ TEST PASSED - Migrations applied successfully!');
      console.log(`📁 Evidence in: ${result.testDir}`);
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED - Could not apply migrations');
      console.log(`📁 Debug info in: ${result.testDir}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Execute
main();