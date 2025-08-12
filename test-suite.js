#!/usr/bin/env node

/**
 * E2E TEST SUITE RUNNER
 * 
 * Runs all E2E tests in sequence and generates a comprehensive report
 */

const { ArcanaDwellE2ETest } = require('./test-arcana-dwell-user-story');
const DashboardAnalyticsStoryTest = require('./test-example-dashboard-story');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class E2ETestSuite {
  constructor() {
    this.tests = [
      {
        name: 'Arcana Dwell User Story',
        description: 'Validates ground truths and resilient architecture',
        runner: () => new ArcanaDwellE2ETest(true).run()
      },
      {
        name: 'Dashboard Analytics Story',
        description: 'Validates dashboard analytics feature with real data',
        runner: () => new DashboardAnalyticsStoryTest().run()
      },
      // TO ADD MORE TESTS:
      // 1. Create new test file extending BaseUserStoryTest
      // 2. Import it here: const MyTest = require('./test-my-story');
      // 3. Add to this array:
      // {
      //   name: 'My User Story',
      //   description: 'What it validates',
      //   runner: () => new MyTest().run()
      // },
    ];
    
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
    
    this.outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/test-suite-${Date.now()}`;
  }

  async setup() {
    console.log('🧪 E2E TEST SUITE');
    console.log('=' .repeat(60));
    console.log('📅 Date:', new Date().toLocaleString());
    console.log('📁 Output:', this.outputDir);
    console.log('🔢 Tests to run:', this.tests.length);
    console.log('=' .repeat(60) + '\n');
    
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async runTest(test) {
    console.log(`\n🏃 Running: ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log('-' .repeat(60));
    
    const startTime = Date.now();
    let success = false;
    let error = null;
    
    try {
      success = await test.runner();
    } catch (e) {
      error = e.message;
      console.error(`❌ Test crashed: ${e.message}`);
    }
    
    const duration = Date.now() - startTime;
    
    const result = {
      name: test.name,
      description: test.description,
      success,
      error,
      duration: `${(duration / 1000).toFixed(2)}s`
    };
    
    this.results.tests.push(result);
    this.results.summary.total++;
    
    if (success) {
      this.results.summary.passed++;
      console.log(`✅ ${test.name} PASSED (${result.duration})`);
    } else {
      this.results.summary.failed++;
      console.log(`❌ ${test.name} FAILED (${result.duration})`);
    }
    
    return result;
  }

  async generateReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('=' .repeat(60));
    
    const passRate = this.results.summary.total > 0 
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)
      : 0;
    
    console.log(`\n✅ Passed: ${this.results.summary.passed}/${this.results.summary.total} (${passRate}%)`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏱️ Total time: ${this.results.tests.reduce((sum, t) => sum + parseFloat(t.duration), 0).toFixed(2)}s`);
    
    // Save JSON report
    await fs.writeFile(
      path.join(this.outputDir, 'suite-results.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    // Generate HTML report
    const html = this.generateHTMLReport();
    await fs.writeFile(
      path.join(this.outputDir, 'suite-report.html'),
      html
    );
    
    console.log(`\n📁 Results saved to: ${this.outputDir}`);
    
    return this.results.summary.failed === 0;
  }

  generateHTMLReport() {
    const passRate = this.results.summary.total > 0 
      ? ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)
      : 0;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>E2E Test Suite Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f7fa;
    }
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      margin: 0 0 10px 0;
      color: #2c3e50;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat {
      background: ${passRate >= 100 ? '#48bb78' : passRate >= 80 ? '#f6ad55' : '#fc8181'};
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 1.8em;
      font-weight: bold;
    }
    .test-results {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .test {
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test.passed {
      background: #c6f6d5;
      border-left: 4px solid #48bb78;
    }
    .test.failed {
      background: #fed7d7;
      border-left: 4px solid #fc8181;
    }
    .test-name {
      font-weight: 600;
    }
    .test-description {
      color: #718096;
      font-size: 0.9em;
      margin-top: 5px;
    }
    .test-duration {
      color: #718096;
      font-size: 0.9em;
    }
    .timestamp {
      color: #718096;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 E2E Test Suite Report</h1>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${passRate}%</div>
        <div>Pass Rate</div>
      </div>
      <div class="stat">
        <div class="stat-value">${this.results.summary.passed}</div>
        <div>Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${this.results.summary.failed}</div>
        <div>Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${this.results.tests.reduce((sum, t) => sum + parseFloat(t.duration), 0).toFixed(1)}s</div>
        <div>Duration</div>
      </div>
    </div>
  </div>
  
  <div class="test-results">
    <h2>Test Results</h2>
    ${this.results.tests.map(test => `
      <div class="test ${test.success ? 'passed' : 'failed'}">
        <div>
          <div class="test-name">
            ${test.success ? '✅' : '❌'} ${test.name}
          </div>
          <div class="test-description">${test.description}</div>
          ${test.error ? `<div style="color: #e53e3e; margin-top: 5px;">Error: ${test.error}</div>` : ''}
        </div>
        <div class="test-duration">${test.duration}</div>
      </div>
    `).join('')}
  </div>
  
  <div class="timestamp">
    Generated: ${new Date(this.results.timestamp).toLocaleString()}
  </div>
</body>
</html>`;
  }

  async run() {
    try {
      await this.setup();
      
      // Run all tests
      for (const test of this.tests) {
        await this.runTest(test);
      }
      
      // Generate report
      const success = await this.generateReport();
      
      // Open report
      if (process.platform === 'darwin') {
        exec(`open ${path.join(this.outputDir, 'suite-report.html')}`);
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Suite error:', error.message);
      return false;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const suite = new E2ETestSuite();
  suite.run().then(success => {
    console.log('\n' + '=' .repeat(60));
    if (success) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log('⚠️ SOME TESTS FAILED');
    }
    console.log('=' .repeat(60));
    process.exit(success ? 0 : 1);
  });
}

module.exports = E2ETestSuite;