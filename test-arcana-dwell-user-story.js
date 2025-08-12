#!/usr/bin/env node

/**
 * ARCANA DWELL LLC - COMPLETE USER STORY E2E TEST
 * 
 * This is the canonical E2E test for validating:
 * 1. Arcana Dwell LLC ground truths are displayed (not mock data)
 * 2. Resilient fallback pattern works when APIs are unavailable
 * 3. Dev Toolkit shows real agent activity
 * 4. All PRD requirements are met
 * 
 * User Story:
 * As a business owner (Gianmatteo Costanza) of Arcana Dwell LLC (wine bar),
 * I want to onboard to SmallBizAlly and see my real business information,
 * with the system gracefully handling unavailable APIs by requesting user input.
 * 
 * Ground Truths:
 * - Business: Arcana Dwell LLC
 * - Entity Number: 201919710409
 * - Formation Date: 07/10/2019
 * - EIN: 84-2455935
 * - Owners: Gianmatteo Costanza (50%), Farnaz (Naz) Khorram (50%)
 * - Address: 2512 Mission St, San Francisco, CA 94110
 * - Type: Wine Bar, Music & Entertainment Venue
 */

const { chromium } = require('playwright');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  localUrl: 'http://localhost:8080',
  lovableUrl: 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com',
  testUser: 'gianmatteo.allyn.test@gmail.com',
  outputDir: `/Users/gianmatteo/Documents/Arcana-Prototype/tests/arcana-dwell-${Date.now()}`,
  
  // Expected ground truths
  groundTruths: {
    businessName: 'Arcana Dwell LLC',
    entityNumber: '201919710409',
    formationDate: '07/10/2019',
    ein: '84-2455935',
    address: '2512 Mission St, San Francisco, CA 94110',
    owners: ['Gianmatteo Costanza', 'Farnaz (Naz) Khorram'],
    businessType: 'Wine Bar, Music & Entertainment Venue'
  },
  
  // Mock data that should NOT appear
  forbiddenData: ['Sarah Chen', 'TechStartup', 'mock', 'demo company']
};

class ArcanaDwellE2ETest {
  constructor(usePlaywright = true) {
    this.usePlaywright = usePlaywright;
    this.browser = null;
    this.page = null;
    this.context = null;
    this.results = {
      passed: [],
      failed: [],
      screenshots: [],
      timestamp: new Date().toISOString()
    };
  }

  async setup() {
    console.log('🍷 ARCANA DWELL LLC - E2E TEST');
    console.log('=' .repeat(60));
    console.log('📁 Output:', CONFIG.outputDir);
    console.log('🧪 Framework:', this.usePlaywright ? 'Playwright' : 'Puppeteer');
    console.log('=' .repeat(60) + '\n');
    
    // Create output directory
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    if (this.usePlaywright) {
      // Use Playwright with auth state
      this.browser = await chromium.launch({
        headless: false,
        viewport: { width: 1920, height: 1080 }
      });
      
      try {
        // Try to use existing auth
        this.context = await this.browser.newContext({
          storageState: '.auth/user-state.json',
          viewport: { width: 1920, height: 1080 }
        });
        console.log('✅ Using existing authentication');
      } catch {
        this.context = await this.browser.newContext({
          viewport: { width: 1920, height: 1080 }
        });
        console.log('⚠️ No auth state, running in demo mode');
      }
      
      this.page = await this.context.newPage();
    } else {
      // Use Puppeteer as fallback
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 }
      });
      this.page = await this.browser.newPage();
    }
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('X-Frame-Options')) {
        console.log(`  ⚠️ Browser: ${msg.text().substring(0, 80)}`);
      }
    });
  }

  async captureScreenshot(name) {
    const filename = `${String(this.results.screenshots.length + 1).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(CONFIG.outputDir, filename);
    
    await this.page.screenshot({
      path: filepath,
      fullPage: true
    });
    
    console.log(`  📸 Screenshot: ${name}`);
    this.results.screenshots.push({ name, filename });
    return filepath;
  }

  async validate(name, condition, errorMsg = null) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      this.results.passed.push(name);
      return true;
    } else {
      console.log(`  ❌ ${name}${errorMsg ? ': ' + errorMsg : ''}`);
      this.results.failed.push({ name, error: errorMsg });
      return false;
    }
  }

  async waitFor(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async testOnboardingFlow() {
    console.log('\n📍 TEST 1: ONBOARDING FLOW');
    console.log('-' .repeat(40));
    
    // Navigate to app
    await this.page.goto(CONFIG.localUrl, { waitUntil: this.usePlaywright ? 'networkidle' : 'networkidle2' });
    await this.waitFor(3000);
    
    await this.captureScreenshot('01-initial-load');
    
    // Check for welcome screen
    const pageContent = await this.page.evaluate(() => document.body.textContent || '');
    await this.validate(
      'Welcome screen displayed',
      pageContent.includes('Welcome to SmallBizAlly')
    );
    
    // Click Get Started
    const getStartedSelector = '[data-testid="get-started"]';
    const getStartedButton = this.usePlaywright 
      ? await this.page.locator(getStartedSelector)
      : await this.page.$(getStartedSelector);
    
    if (getStartedButton) {
      if (this.usePlaywright) {
        await getStartedButton.click();
      } else {
        await getStartedButton.click();
      }
      
      console.log('  ⏳ Waiting for business discovery...');
      await this.waitFor(6000);
      
      await this.captureScreenshot('02-business-discovery');
      
      // Validate business found
      const businessContent = await this.page.evaluate(() => document.body.textContent || '');
      
      await this.validate(
        'Arcana Dwell LLC displayed',
        businessContent.includes(CONFIG.groundTruths.businessName)
      );
      
      await this.validate(
        'Correct address shown',
        businessContent.includes('2512 Mission St')
      );
      
      await this.validate(
        'No mock data present',
        !CONFIG.forbiddenData.some(forbidden => businessContent.includes(forbidden))
      );
      
      await this.validate(
        'API fallback message shown',
        businessContent.includes('API not available') || 
        businessContent.includes('Please provide')
      );
      
      // Select business
      const businessCardSelector = '.cursor-pointer';
      const businessCard = this.usePlaywright
        ? await this.page.locator(businessCardSelector).first()
        : await this.page.$(businessCardSelector);
      
      if (businessCard) {
        if (this.usePlaywright) {
          await businessCard.click();
        } else {
          await businessCard.click();
        }
        
        await this.waitFor(3000);
        await this.captureScreenshot('03-profile-collection');
        
        // Validate profile data
        const profileData = await this.page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[readonly]'));
          return inputs.map(i => i.value);
        });
        
        const profileText = profileData.join(' ');
        
        await this.validate(
          'Profile has business name',
          profileText.includes(CONFIG.groundTruths.businessName)
        );
        
        await this.validate(
          'Profile has formation date',
          profileText.includes(CONFIG.groundTruths.formationDate)
        );
        
        const pageText = await this.page.evaluate(() => document.body.textContent || '');
        await this.validate(
          'Profile has owners',
          CONFIG.groundTruths.owners.some(owner => 
            profileText.includes(owner) || pageText.includes(owner)
          )
        );
        
        // Wait for remaining steps
        await this.waitFor(4000);
        await this.captureScreenshot('04-compliance');
        
        await this.waitFor(3000);
        await this.captureScreenshot('05-optimization');
        
        await this.waitFor(3000);
        await this.captureScreenshot('06-celebration');
      }
    }
  }

  async testDevToolkit() {
    console.log('\n📍 TEST 2: DEV TOOLKIT');
    console.log('-' .repeat(40));
    
    // Check if Dev Toolkit is visible
    const devToolkitContent = await this.page.evaluate(() => document.body.textContent || '');
    const hasDevToolkit = devToolkitContent.includes('Dev Toolkit') || 
                          devToolkitContent.includes('Agent Activity');
    
    await this.validate('Dev Toolkit present', hasDevToolkit);
    
    if (hasDevToolkit) {
      await this.captureScreenshot('07-dev-toolkit');
      
      // Check for agent logs
      const agentLogs = await this.page.evaluate(() => {
        const logs = Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'));
        return logs.map(log => log.textContent || '');
      });
      
      await this.validate(
        'Agent logs captured',
        agentLogs.length > 0,
        `Found ${agentLogs.length} logs`
      );
      
      if (agentLogs.length > 0) {
        await this.validate(
          'BusinessDiscoveryAgent active',
          agentLogs.some(log => log.includes('BusinessDiscoveryAgent'))
        );
        
        await this.validate(
          'User guidance provided',
          agentLogs.some(log => log.includes('User guidance') || log.includes('Please provide'))
        );
        
        await this.validate(
          'Arcana Dwell in logs',
          agentLogs.some(log => log.includes('Arcana Dwell'))
        );
      }
    }
  }

  async testDataIntegrity() {
    console.log('\n📍 TEST 3: DATA INTEGRITY');
    console.log('-' .repeat(40));
    
    const fullPageContent = await this.page.evaluate(() => document.body.textContent || '');
    
    // Check all ground truths are present somewhere
    for (const [key, value] of Object.entries(CONFIG.groundTruths)) {
      if (Array.isArray(value)) {
        await this.validate(
          `Ground truth: ${key}`,
          value.some(v => fullPageContent.includes(v))
        );
      } else if (typeof value === 'string' && value.length > 5) {
        // Only check substantial strings
        await this.validate(
          `Ground truth: ${key}`,
          fullPageContent.includes(value) || 
          fullPageContent.includes(value.substring(0, 10)) // Partial match
        );
      }
    }
    
    // Ensure no forbidden data
    for (const forbidden of CONFIG.forbiddenData) {
      await this.validate(
        `No forbidden data: ${forbidden}`,
        !fullPageContent.includes(forbidden)
      );
    }
  }

  async generateReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('=' .repeat(60));
    
    const total = this.results.passed.length + this.results.failed.length;
    const passRate = total > 0 ? ((this.results.passed.length / total) * 100).toFixed(1) : 0;
    
    console.log(`\n✅ Passed: ${this.results.passed.length}/${total} (${passRate}%)`);
    console.log(`📸 Screenshots: ${this.results.screenshots.length}`);
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed tests:');
      this.results.failed.forEach(f => {
        console.log(`  - ${f.name}${f.error ? ': ' + f.error : ''}`);
      });
    }
    
    // Save JSON report
    const report = {
      ...this.results,
      config: CONFIG,
      summary: {
        total,
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        passRate: `${passRate}%`
      }
    };
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'test-results.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate HTML report
    const html = this.generateHTMLReport(report);
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'report.html'),
      html
    );
    
    console.log(`\n📁 Results saved to: ${CONFIG.outputDir}`);
    console.log('📄 Files: test-results.json, report.html');
    
    return this.results.failed.length === 0;
  }

  generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Arcana Dwell E2E Test Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin: 0 0 10px 0;
      font-size: 2em;
    }
    .subtitle {
      color: #666;
      margin: 0 0 30px 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
    }
    .stat-label {
      opacity: 0.9;
      margin-top: 5px;
    }
    .results {
      margin: 30px 0;
    }
    .result {
      padding: 10px 15px;
      margin: 5px 0;
      border-radius: 6px;
      display: flex;
      align-items: center;
    }
    .passed {
      background: #d4edda;
      color: #155724;
    }
    .failed {
      background: #f8d7da;
      color: #721c24;
    }
    .icon {
      margin-right: 10px;
      font-size: 1.2em;
    }
    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .screenshot {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .screenshot:hover {
      transform: scale(1.05);
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .screenshot img {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    .screenshot-name {
      padding: 10px;
      background: #f8f9fa;
      font-size: 0.9em;
    }
    .ground-truths {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .ground-truth {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .ground-truth:last-child {
      border-bottom: none;
    }
    .key {
      font-weight: 600;
      color: #495057;
    }
    .value {
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🍷 Arcana Dwell LLC - E2E Test Report</h1>
    <p class="subtitle">Complete validation of ground truths and resilient architecture</p>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${report.summary.passRate}</div>
        <div class="stat-label">Pass Rate</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.summary.passed}</div>
        <div class="stat-label">Tests Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.summary.failed}</div>
        <div class="stat-label">Tests Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.screenshots.length}</div>
        <div class="stat-label">Screenshots</div>
      </div>
    </div>
    
    <div class="ground-truths">
      <h2>📋 Ground Truths Validated</h2>
      ${Object.entries(CONFIG.groundTruths).map(([key, value]) => `
        <div class="ground-truth">
          <span class="key">${key}:</span>
          <span class="value">${Array.isArray(value) ? value.join(', ') : value}</span>
        </div>
      `).join('')}
    </div>
    
    <div class="results">
      <h2>✅ Passed Tests (${report.passed.length})</h2>
      ${report.passed.map(test => `
        <div class="result passed">
          <span class="icon">✓</span>
          ${test}
        </div>
      `).join('')}
      
      ${report.failed.length > 0 ? `
        <h2>❌ Failed Tests (${report.failed.length})</h2>
        ${report.failed.map(test => `
          <div class="result failed">
            <span class="icon">✗</span>
            ${test.name}${test.error ? ': ' + test.error : ''}
          </div>
        `).join('')}
      ` : ''}
    </div>
    
    <h2>📸 Screenshots</h2>
    <div class="screenshots">
      ${report.screenshots.map(s => `
        <div class="screenshot" onclick="window.open('${s.filename}', '_blank')">
          <img src="${s.filename}" alt="${s.name}">
          <div class="screenshot-name">${s.name}</div>
        </div>
      `).join('')}
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 0.9em;">
      <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
      <p>Test User: ${CONFIG.testUser}</p>
      <p>URL: ${CONFIG.localUrl}</p>
    </div>
  </div>
</body>
</html>`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      
      // Run all tests
      await this.testOnboardingFlow();
      await this.testDevToolkit();
      await this.testDataIntegrity();
      
      // Generate report
      const success = await this.generateReport();
      
      console.log('\n' + '=' .repeat(60));
      if (success) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ Arcana Dwell LLC ground truths validated');
        console.log('✅ Resilient architecture working correctly');
      } else {
        console.log('⚠️ SOME TESTS FAILED - Review report for details');
      }
      console.log('=' .repeat(60));
      
      // Open report
      if (process.platform === 'darwin') {
        const { exec } = require('child_process');
        exec(`open ${path.join(CONFIG.outputDir, 'report.html')}`);
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Test error:', error.message);
      await this.captureScreenshot('error-state');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use in other tests
module.exports = { ArcanaDwellE2ETest, CONFIG };

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const usePlaywright = !args.includes('--puppeteer');
  
  const test = new ArcanaDwellE2ETest(usePlaywright);
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}