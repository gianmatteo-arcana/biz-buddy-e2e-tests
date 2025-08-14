/**
 * BASE USER STORY TEST FRAMEWORK
 * 
 * This is the standardized base class for all E2E user story tests.
 * Extend this class to create new user story tests with consistent
 * structure, reporting, and screenshot capture.
 */

const { chromium } = require('playwright');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BaseUserStoryTest {
  constructor(config) {
    // Merge user config with defaults
    this.config = {
      name: 'Unnamed Test',
      description: 'No description provided',
      outputBaseDir: '/Users/gianmatteo/Documents/Arcana-Prototype/tests',
      usePlaywright: true,
      viewport: { width: 1920, height: 1080 },
      headless: false,
      testUrl: 'http://localhost:8080',
      ...config
    };
    
    // Initialize test state
    this.browser = null;
    this.page = null;
    this.context = null;
    this.results = {
      name: this.config.name,
      description: this.config.description,
      timestamp: new Date().toISOString(),
      passed: [],
      failed: [],
      screenshots: [],
      metrics: {
        startTime: null,
        endTime: null,
        duration: null
      }
    };
    
    // Set output directory with timestamp
    this.outputDir = path.join(
      this.config.outputBaseDir,
      `${this.config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
    );
  }

  // ==================== LIFECYCLE METHODS ====================

  async setup() {
    console.log(`🎯 ${this.config.name.toUpperCase()}`);
    console.log('=' .repeat(60));
    console.log(`📝 ${this.config.description}`);
    console.log(`📁 Output: ${this.outputDir}`);
    console.log(`🧪 Framework: ${this.config.usePlaywright ? 'Playwright' : 'Puppeteer'}`);
    console.log('=' .repeat(60) + '\n');
    
    this.results.metrics.startTime = Date.now();
    
    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });
    
    // Launch browser
    if (this.config.usePlaywright) {
      await this.setupPlaywright();
    } else {
      await this.setupPuppeteer();
    }
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('X-Frame-Options')) {
        this.logBrowserError(msg.text());
      }
    });
    
    // Call user's custom setup if provided
    if (this.onSetup) {
      await this.onSetup();
    }
  }

  async setupPlaywright() {
    this.browser = await chromium.launch({
      headless: this.config.headless,
      viewport: this.config.viewport
    });
    
    // Try to use existing auth if available
    try {
      this.context = await this.browser.newContext({
        storageState: '.auth/user-state.json',
        viewport: this.config.viewport
      });
      console.log('✅ Using existing authentication');
    } catch {
      this.context = await this.browser.newContext({
        viewport: this.config.viewport
      });
      console.log('⚠️ No auth state, running in demo mode');
    }
    
    this.page = await this.context.newPage();
  }

  async setupPuppeteer() {
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      defaultViewport: this.config.viewport
    });
    this.page = await this.browser.newPage();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // ==================== CORE TEST METHODS ====================

  async run() {
    try {
      await this.setup();
      
      // Run the user story tests
      console.log('\n🏃 RUNNING USER STORY TESTS');
      console.log('-' .repeat(40));
      
      // Call the main test method (must be implemented by subclass)
      if (!this.runUserStory) {
        throw new Error('Subclass must implement runUserStory() method');
      }
      
      await this.runUserStory();
      
      // Generate reports
      const success = await this.generateReports();
      
      this.results.metrics.endTime = Date.now();
      this.results.metrics.duration = 
        ((this.results.metrics.endTime - this.results.metrics.startTime) / 1000).toFixed(2) + 's';
      
      // Final summary
      this.printSummary(success);
      
      // Open report in browser
      await this.openReport();
      
      return success;
      
    } catch (error) {
      console.error(`❌ Test error: ${error.message}`);
      await this.captureScreenshot('error-state');
      return false;
    } finally {
      await this.cleanup();
    }
  }

  // ==================== VALIDATION METHODS ====================

  async validate(name, condition, errorMsg = null) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      this.results.passed.push({
        name,
        timestamp: new Date().toISOString()
      });
      return true;
    } else {
      console.log(`  ❌ ${name}${errorMsg ? ': ' + errorMsg : ''}`);
      this.results.failed.push({
        name,
        error: errorMsg,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async validateText(name, selector, expectedText) {
    const element = await this.page.$(selector);
    if (!element) {
      return this.validate(name, false, `Element not found: ${selector}`);
    }
    
    const text = await element.evaluate(el => el.textContent);
    return this.validate(name, text.includes(expectedText), 
      `Expected "${expectedText}", got "${text}"`);
  }

  async validateNotPresent(name, forbiddenText) {
    const pageText = await this.page.evaluate(() => document.body.textContent || '');
    return this.validate(
      name,
      !pageText.includes(forbiddenText),
      `Forbidden text "${forbiddenText}" was found`
    );
  }

  async validateMultiple(validations) {
    for (const [name, condition] of Object.entries(validations)) {
      await this.validate(name, condition);
    }
  }

  // ==================== INTERACTION METHODS ====================

  async captureScreenshot(name, options = {}) {
    const filename = `${String(this.results.screenshots.length + 1).padStart(3, '0')}-${name}.png`;
    const filepath = path.join(this.outputDir, filename);
    
    await this.page.screenshot({
      path: filepath,
      fullPage: options.fullPage !== false,
      ...options
    });
    
    console.log(`  📸 Screenshot: ${name}`);
    
    this.results.screenshots.push({
      name,
      filename,
      timestamp: new Date().toISOString()
    });
    
    return filepath;
  }

  async click(selector, options = {}) {
    const element = this.config.usePlaywright
      ? await this.page.locator(selector).first()
      : await this.page.$(selector);
    
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    if (this.config.usePlaywright) {
      await element.click(options);
    } else {
      await element.click(options);
    }
    
    console.log(`  🖱️ Clicked: ${selector}`);
  }

  async type(selector, text) {
    const element = this.config.usePlaywright
      ? await this.page.locator(selector).first()
      : await this.page.$(selector);
    
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    if (this.config.usePlaywright) {
      await element.fill(text);
    } else {
      await element.type(text);
    }
    
    console.log(`  ⌨️ Typed: "${text}" into ${selector}`);
  }

  async waitFor(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForElement(selector, timeout = 30000) {
    if (this.config.usePlaywright) {
      await this.page.locator(selector).first().waitFor({ timeout });
    } else {
      await this.page.waitForSelector(selector, { timeout });
    }
  }

  async navigate(url = null) {
    const targetUrl = url || this.config.testUrl;
    await this.page.goto(targetUrl, {
      waitUntil: this.config.usePlaywright ? 'networkidle' : 'networkidle2'
    });
    console.log(`  🌐 Navigated to: ${targetUrl}`);
  }

  // ==================== REPORTING METHODS ====================

  async generateReports() {
    console.log('\n📊 GENERATING REPORTS');
    console.log('-' .repeat(40));
    
    const total = this.results.passed.length + this.results.failed.length;
    const passRate = total > 0 ? ((this.results.passed.length / total) * 100).toFixed(1) : 0;
    
    this.results.summary = {
      total,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      passRate: `${passRate}%`,
      screenshots: this.results.screenshots.length
    };
    
    // Save JSON report
    await fs.writeFile(
      path.join(this.outputDir, 'test-results.json'),
      JSON.stringify(this.results, null, 2)
    );
    console.log('  ✅ JSON report saved');
    
    // Generate HTML report
    const html = this.generateHTMLReport();
    await fs.writeFile(
      path.join(this.outputDir, 'report.html'),
      html
    );
    console.log('  ✅ HTML report saved');
    
    return this.results.failed.length === 0;
  }

  generateHTMLReport() {
    const { summary, passed, failed, screenshots, timestamp, name, description } = this.results;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${name} - Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { opacity: 0.9; font-size: 1.1em; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .metric {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .metric-value {
      font-size: 2.5em;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .metric-label {
      color: #6c757d;
      margin-top: 5px;
      text-transform: uppercase;
      font-size: 0.8em;
      letter-spacing: 1px;
    }
    .content { padding: 30px; }
    .section { margin-bottom: 40px; }
    .section h2 {
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    .test-list { list-style: none; }
    .test-item {
      padding: 12px 20px;
      margin: 8px 0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      transition: transform 0.2s;
    }
    .test-item:hover { transform: translateX(5px); }
    .test-passed {
      background: linear-gradient(90deg, #d4edda 0%, #c3e6cb 100%);
      border-left: 4px solid #28a745;
    }
    .test-failed {
      background: linear-gradient(90deg, #f8d7da 0%, #f5c6cb 100%);
      border-left: 4px solid #dc3545;
    }
    .test-icon { margin-right: 12px; font-size: 1.2em; }
    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
      cursor: pointer;
      background: white;
    }
    .screenshot:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    }
    .screenshot img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      border-bottom: 1px solid #eee;
    }
    .screenshot-info {
      padding: 12px;
    }
    .screenshot-number {
      color: #667eea;
      font-weight: bold;
      font-size: 0.9em;
    }
    .screenshot-name {
      color: #333;
      margin-top: 4px;
      font-size: 0.95em;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-size: 0.9em;
    }
    .pass-rate-ring {
      width: 150px;
      height: 150px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      margin: 0 4px;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-info { background: #d1ecf1; color: #0c5460; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 ${name}</h1>
      <p>${description}</p>
      <div style="margin-top: 20px;">
        <span class="badge" style="background: rgba(255,255,255,0.2); color: white;">
          ${new Date(timestamp).toLocaleString()}
        </span>
        <span class="badge" style="background: rgba(255,255,255,0.2); color: white;">
          Duration: ${this.results.metrics.duration || 'N/A'}
        </span>
      </div>
    </div>
    
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${summary.passRate}</div>
        <div class="metric-label">Pass Rate</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.passed}</div>
        <div class="metric-label">Tests Passed</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.failed}</div>
        <div class="metric-label">Tests Failed</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.screenshots}</div>
        <div class="metric-label">Screenshots</div>
      </div>
    </div>
    
    <div class="content">
      ${passed.length > 0 ? `
        <div class="section">
          <h2>✅ Passed Tests (${passed.length})</h2>
          <ul class="test-list">
            ${passed.map(test => `
              <li class="test-item test-passed">
                <span class="test-icon">✓</span>
                <span>${test.name}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${failed.length > 0 ? `
        <div class="section">
          <h2>❌ Failed Tests (${failed.length})</h2>
          <ul class="test-list">
            ${failed.map(test => `
              <li class="test-item test-failed">
                <span class="test-icon">✗</span>
                <span>${test.name}${test.error ? ` - ${test.error}` : ''}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="section">
        <h2>📸 Screenshots (${screenshots.length})</h2>
        <div class="screenshots">
          ${screenshots.map((s, i) => `
            <div class="screenshot" onclick="window.open('${s.filename}', '_blank')">
              <img src="${s.filename}" alt="${s.name}" loading="lazy">
              <div class="screenshot-info">
                <div class="screenshot-number">#${i + 1}</div>
                <div class="screenshot-name">${s.name}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>Generated by E2E Test Framework</p>
      <p>${this.outputDir}</p>
    </div>
  </div>
</body>
</html>`;
  }

  printSummary(success) {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    console.log(`\n✅ Passed: ${this.results.summary.passed}/${this.results.summary.total} (${this.results.summary.passRate})`);
    console.log(`📸 Screenshots: ${this.results.summary.screenshots}`);
    console.log(`⏱️ Duration: ${this.results.metrics.duration}`);
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed tests:');
      this.results.failed.forEach(f => {
        console.log(`  - ${f.name}${f.error ? ': ' + f.error : ''}`);
      });
    }
    
    console.log(`\n📁 Results: ${this.outputDir}`);
    
    console.log('\n' + '=' .repeat(60));
    if (success) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log('⚠️ SOME TESTS FAILED - Review report for details');
    }
    console.log('=' .repeat(60));
  }

  async openReport() {
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec(`open ${path.join(this.outputDir, 'report.html')}`);
      console.log('\n🌐 Opening report in browser...');
    }
  }

  // ==================== GITHUB INTEGRATION ====================

  /**
   * Upload screenshots to GitHub issue using the operational workflow
   * This integrates with the proven screenshot system for issue updates
   */
  async uploadScreenshotsToIssue(issueNumber, options = {}) {
    if (!issueNumber) {
      console.log('⚠️ No issue number provided - skipping screenshot upload');
      return false;
    }

    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    const testName = options.testName || this.config.name || 'E2E Test Results';
    
    try {
      console.log(`\n📸 Uploading screenshots to GitHub issue #${issueNumber}...`);
      
      const command = `gh workflow run "Upload Test Screenshots" ` +
        `--repo gianmatteo-arcana/biz-buddy-e2e-tests ` +
        `-f issue_number=${issueNumber} ` +
        `-f test_name="${testName}"`;
      
      await execAsync(command);
      
      console.log(`✅ Screenshot upload workflow triggered for issue #${issueNumber}`);
      console.log(`🔗 Check issue at: https://github.com/gianmatteo-arcana/biz-buddy-ally-now/issues/${issueNumber}`);
      
      return true;
    } catch (error) {
      console.log(`❌ Failed to upload screenshots: ${error.message}`);
      return false;
    }
  }

  /**
   * Complete E2E test with GitHub issue update
   * This is the full operational procedure for issue resolution
   */
  async completeWithIssueUpdate(issueNumber, options = {}) {
    const success = await this.run();
    
    if (success && issueNumber) {
      await this.uploadScreenshotsToIssue(issueNumber, options);
      
      console.log(`\n🎯 E2E Test Complete with Issue Update:`);
      console.log(`   • Test: ${this.config.name}`);
      console.log(`   • Issue: #${issueNumber}`);
      console.log(`   • Screenshots: Uploaded to GitHub`);
      console.log(`   • Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    return success;
  }

  // ==================== HELPER METHODS ====================

  logBrowserError(message) {
    console.log(`  ⚠️ Browser: ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`);
  }

  async getPageText() {
    return await this.page.evaluate(() => document.body.textContent || '');
  }

  async elementExists(selector) {
    const element = this.config.usePlaywright
      ? await this.page.locator(selector).first()
      : await this.page.$(selector);
    return !!element;
  }
}

module.exports = BaseUserStoryTest;