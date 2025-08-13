const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * APPLY MIGRATIONS AND VERIFY VISUALLY
 * 
 * This script will:
 * 1. Navigate to Dev Toolkit
 * 2. Open Migrations tab
 * 3. Select the migrations
 * 4. Click Apply
 * 5. Handle any errors
 * 6. Take screenshots
 * 7. Analyze screenshots to verify state
 */

class MigrationApplier {
  constructor() {
    this.testRunId = `apply-migrations-visual-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.testDir = path.join(__dirname, this.testRunId);
    this.screenshots = [];
    this.visualAnalysis = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  async takeScreenshot(page, name, description) {
    const filename = `${String(this.screenshots.length + 1).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(this.testDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    this.screenshots.push({ filename, description });
    this.log(`📸 Screenshot: ${filename} - ${description}`);
    return filepath;
  }

  async analyzeScreenshot(page, name) {
    this.log(`🔍 Analyzing current page state for: ${name}`);
    
    const analysis = {
      name,
      timestamp: new Date().toISOString(),
      pendingCount: null,
      appliedCount: null,
      errorMessages: [],
      successMessages: [],
      visibleMigrations: [],
      applyButtonState: null
    };

    try {
      // Check for pending migrations count
      const pendingText = await page.locator('text=/Pending Migrations.*\\(\\d+\\)/')
        .first()
        .textContent()
        .catch(() => null);
      
      if (pendingText) {
        const match = pendingText.match(/\((\d+)\)/);
        if (match) {
          analysis.pendingCount = parseInt(match[1]);
        }
      }

      // Check for applied migrations count
      const appliedText = await page.locator('text=/Applied Migrations.*\\(\\d+\\)/')
        .first()
        .textContent()
        .catch(() => null);
      
      if (appliedText) {
        const match = appliedText.match(/\((\d+)\)/);
        if (match) {
          analysis.appliedCount = parseInt(match[1]);
        }
      }

      // Check for error messages
      const errorElements = await page.locator('text=/error|fail/i').all();
      for (const element of errorElements) {
        const text = await element.textContent();
        if (!text.includes('Failed migrations:')) { // Ignore the header
          analysis.errorMessages.push(text);
        }
      }

      // Check for success messages
      const successElements = await page.locator('text=/success|complete/i').all();
      for (const element of successElements) {
        const text = await element.textContent();
        analysis.successMessages.push(text);
      }

      // Check visible migration files
      const migrationFiles = await page.locator('text=.sql').all();
      for (const file of migrationFiles) {
        const text = await file.textContent();
        analysis.visibleMigrations.push(text);
      }

      // Check Apply button state
      const applyButton = await page.locator('button:has-text("Apply")').first();
      if (await applyButton.isVisible()) {
        analysis.applyButtonState = {
          visible: true,
          enabled: !await applyButton.isDisabled(),
          text: await applyButton.textContent()
        };
      }

    } catch (error) {
      this.log(`Error during analysis: ${error.message}`, 'error');
    }

    this.visualAnalysis.push(analysis);
    
    // Log analysis results
    this.log(`📊 Visual Analysis Results:`);
    this.log(`  Pending Migrations: ${analysis.pendingCount}`);
    this.log(`  Applied Migrations: ${analysis.appliedCount}`);
    this.log(`  Errors Found: ${analysis.errorMessages.length}`);
    this.log(`  Success Messages: ${analysis.successMessages.length}`);
    
    return analysis;
  }

  async run() {
    this.log('🚀 Starting Migration Application with Visual Verification');
    
    fs.mkdirSync(this.testDir, { recursive: true });
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 500 
    });
    
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1600, height: 1200 }
    });
    
    const page = await context.newPage();
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('X-Frame-Options')) {
        this.log(`Browser Console Error: ${msg.text()}`, 'error');
      }
    });
    
    try {
      // Step 1: Navigate to Dev Toolkit
      this.log('📍 Step 1: Opening Dev Toolkit');
      await page.goto('http://localhost:8080/dev-toolkit-standalone', {
        waitUntil: 'networkidle'
      });
      await delay(2000);
      
      await this.takeScreenshot(page, 'dev-toolkit-initial', 'Dev Toolkit loaded');
      await this.analyzeScreenshot(page, 'initial-load');
      
      // Step 2: Open Migrations tab
      this.log('📍 Step 2: Opening Migrations tab');
      await page.click('text=Migrations');
      await delay(2000);
      
      await this.takeScreenshot(page, 'migrations-tab', 'Migrations tab opened');
      const beforeAnalysis = await this.analyzeScreenshot(page, 'before-action');
      
      // Step 3: Check current state
      this.log('📍 Step 3: Checking current migration state');
      if (beforeAnalysis.pendingCount === 0) {
        this.log('✅ No pending migrations! Already in clean state.');
        return { success: true, reason: 'Already clean' };
      }
      
      this.log(`⚠️ Found ${beforeAnalysis.pendingCount} pending migrations`);
      
      // Step 4: Select migrations if checkboxes exist
      this.log('📍 Step 4: Attempting to select migrations');
      
      try {
        // Try to find and click checkboxes
        const checkboxes = await page.locator('input[type="checkbox"]:not(:checked)').all();
        if (checkboxes.length > 0) {
          this.log(`Found ${checkboxes.length} unchecked checkboxes`);
          for (const checkbox of checkboxes) {
            await checkbox.click();
            await delay(300);
          }
        } else {
          // Try clicking on migration items directly
          this.log('No checkboxes found, trying to click migration items');
          const migrationItems = await page.locator('text=.sql').all();
          for (const item of migrationItems.slice(0, 2)) { // Just the first 2
            await item.click();
            await delay(300);
          }
        }
      } catch (e) {
        this.log(`Could not select migrations: ${e.message}`, 'warning');
      }
      
      await this.takeScreenshot(page, 'migrations-selected', 'After selection attempt');
      
      // Step 5: Click Apply button
      this.log('📍 Step 5: Clicking Apply button');
      
      const applyButton = await page.locator('button:has-text("Apply")').first();
      if (await applyButton.isVisible() && !await applyButton.isDisabled()) {
        const buttonText = await applyButton.textContent();
        this.log(`Found Apply button: "${buttonText}"`);
        
        await this.takeScreenshot(page, 'before-apply', 'Before clicking Apply');
        
        await applyButton.click();
        this.log('🔘 Clicked Apply button');
        
        // Wait for processing
        await delay(5000);
        
        await this.takeScreenshot(page, 'after-apply', 'After clicking Apply');
        const afterApplyAnalysis = await this.analyzeScreenshot(page, 'after-apply');
        
        // Check if we got an error
        if (afterApplyAnalysis.errorMessages.length > 0) {
          this.log('❌ Errors after applying:', 'error');
          afterApplyAnalysis.errorMessages.forEach(err => {
            this.log(`  - ${err}`, 'error');
          });
          
          // Try to get more debug info
          try {
            const debugButton = await page.locator('text="Show Debug Info"').first();
            if (await debugButton.isVisible()) {
              await debugButton.click();
              await delay(1000);
              await this.takeScreenshot(page, 'debug-info', 'Debug information');
            }
          } catch (e) {
            // No debug button
          }
        }
        
      } else {
        this.log('⚠️ Apply button not available or disabled', 'warning');
        await this.takeScreenshot(page, 'no-apply-button', 'Apply button not available');
      }
      
      // Step 6: Refresh and check final state
      this.log('📍 Step 6: Refreshing to check final state');
      await page.reload();
      await delay(2000);
      
      await page.click('text=Migrations');
      await delay(2000);
      
      await this.takeScreenshot(page, 'final-state', 'Final state after refresh');
      const finalAnalysis = await this.analyzeScreenshot(page, 'final-state');
      
      // Step 7: Generate report
      this.log('📍 Step 7: Generating visual verification report');
      
      const report = {
        testRunId: this.testRunId,
        timestamp: new Date().toISOString(),
        screenshots: this.screenshots,
        visualAnalysis: this.visualAnalysis,
        summary: {
          initialPendingCount: beforeAnalysis.pendingCount,
          finalPendingCount: finalAnalysis.pendingCount,
          migrationsApplied: beforeAnalysis.pendingCount - finalAnalysis.pendingCount,
          success: finalAnalysis.pendingCount === 0,
          errors: finalAnalysis.errorMessages
        }
      };
      
      fs.writeFileSync(
        path.join(this.testDir, 'visual-verification-report.json'),
        JSON.stringify(report, null, 2)
      );
      
      // Generate markdown report
      const mdReport = `# Visual Verification Report

## Test Run: ${this.testRunId}

### Summary
- **Initial Pending**: ${report.summary.initialPendingCount}
- **Final Pending**: ${report.summary.finalPendingCount}
- **Migrations Applied**: ${report.summary.migrationsApplied}
- **Success**: ${report.summary.success ? '✅ YES' : '❌ NO'}

### Visual Analysis Timeline

${this.visualAnalysis.map(a => `
#### ${a.name} (${a.timestamp})
- Pending: ${a.pendingCount}
- Applied: ${a.appliedCount}
- Errors: ${a.errorMessages.length > 0 ? a.errorMessages.join(', ') : 'None'}
- Apply Button: ${a.applyButtonState ? a.applyButtonState.text : 'Not visible'}
`).join('\n')}

### Screenshots
${this.screenshots.map(s => `- ${s.filename}: ${s.description}`).join('\n')}

### Conclusion
${report.summary.success ? 
  '✅ Migrations successfully applied - no pending migrations remain!' : 
  `❌ ${report.summary.finalPendingCount} migrations still pending. Manual intervention required.`}
`;
      
      fs.writeFileSync(path.join(this.testDir, 'README.md'), mdReport);
      
      // Final summary
      console.log('\n' + '='.repeat(60));
      console.log('VISUAL VERIFICATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`📊 Initial State: ${beforeAnalysis.pendingCount} pending`);
      console.log(`📊 Final State: ${finalAnalysis.pendingCount} pending`);
      console.log(`📊 Result: ${report.summary.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log('='.repeat(60));
      console.log(`📁 Full report: ${this.testDir}/README.md`);
      console.log(`📸 Screenshots: ${this.screenshots.length} captured`);
      console.log('='.repeat(60));
      
      return report.summary;
      
    } catch (error) {
      this.log(`💥 Fatal error: ${error.message}`, 'error');
      await this.takeScreenshot(page, 'fatal-error', 'Fatal error occurred');
      throw error;
      
    } finally {
      await browser.close();
    }
  }
}

// Execute
async function main() {
  const applier = new MigrationApplier();
  
  try {
    const result = await applier.run();
    
    if (result.success) {
      console.log('\n✅ MIGRATIONS SUCCESSFULLY APPLIED!');
      console.log('The system is now in a clean state with no pending migrations.');
      process.exit(0);
    } else {
      console.log('\n❌ MIGRATIONS STILL PENDING');
      console.log(`${result.finalPendingCount} migrations remain pending.`);
      console.log('Check the report for details and error messages.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 TEST FAILED:', error);
    process.exit(1);
  }
}

main();