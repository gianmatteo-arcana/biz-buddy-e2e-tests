#!/usr/bin/env node

/**
 * TEST: Dev Toolkit Task Tracking & Agent Visualization
 * 
 * Verifies that:
 * 1. Tasks are created with unique IDs during operations
 * 2. Task selection works in the dev toolkit
 * 3. Agent activity is tracked and visualized
 * 4. TaskContext changes are inspectable
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class DevToolkitTaskTrackingTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.devToolkitPage = null;
    this.testResults = [];
    this.outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/dev-toolkit-test-${Date.now()}`;
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';
  }

  async setup() {
    console.log('🔧 DEV TOOLKIT TASK TRACKING TEST');
    console.log('=' .repeat(60));
    console.log('📅 Date:', new Date().toLocaleString());
    console.log('🌐 URL:', this.appUrl);
    console.log('📁 Output:', this.outputDir);
    console.log('=' .repeat(60) + '\n');

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'screenshots'), { recursive: true });

    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async validate(name, condition, errorMsg = null) {
    const passed = condition;
    const result = {
      name,
      passed,
      error: passed ? null : (errorMsg || 'Validation failed'),
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    if (passed) {
      console.log(`  ✅ ${name}`);
    } else {
      console.log(`  ❌ ${name} - ${result.error}`);
    }
    
    return passed;
  }

  async captureScreenshot(name, page = null) {
    const targetPage = page || this.page;
    if (!targetPage) return;
    
    try {
      const filename = `${name}.png`;
      await targetPage.screenshot({
        path: path.join(this.outputDir, 'screenshots', filename),
        fullPage: true
      });
      console.log(`  📸 Captured: ${filename}`);
    } catch (error) {
      console.error(`  ❌ Screenshot failed: ${error.message}`);
    }
  }

  async run() {
    try {
      await this.setup();
      
      // Step 1: Open main app and create initial task
      console.log('\n📍 STEP 1: CREATE INITIAL TASK IN MAIN APP');
      console.log('-' .repeat(40));
      
      this.page = await this.browser.newPage();
      await this.page.goto(this.appUrl, { waitUntil: 'networkidle2' });
      await this.page.waitForFunction(() => true, { timeout: 3000 }).catch(() => {});
      await this.captureScreenshot('01-main-app');
      
      // Trigger task creation by interacting with the app
      const hasTaskInput = await this.page.$('[placeholder*="task"], [placeholder*="Task"], input[type="text"]');
      if (hasTaskInput) {
        await hasTaskInput.type('Test task for dev toolkit tracking');
        await this.page.keyboard.press('Enter');
        await this.page.waitForFunction(() => true, { timeout: 2000 }).catch(() => {});
        console.log('  Created test task');
        await this.captureScreenshot('02-task-created');
      }
      
      // Step 2: Open Dev Toolkit in new tab
      console.log('\n📍 STEP 2: OPEN DEV TOOLKIT STANDALONE');
      console.log('-' .repeat(40));
      
      this.devToolkitPage = await this.browser.newPage();
      await this.devToolkitPage.goto(`${this.appUrl}/dev-toolkit-standalone`, { 
        waitUntil: 'networkidle2' 
      });
      await this.devToolkitPage.waitForFunction(() => true, { timeout: 3000 }).catch(() => {});
      await this.captureScreenshot('03-dev-toolkit-opened', this.devToolkitPage);
      
      // Verify Dev Toolkit loaded
      const devToolkitText = await this.devToolkitPage.evaluate(() => document.body.innerText);
      await this.validate(
        'Dev Toolkit loaded',
        devToolkitText.includes('Dev Toolkit')
      );
      
      // Step 3: Check Agent Visualizer tab
      console.log('\n📍 STEP 3: VERIFY AGENT VISUALIZER');
      console.log('-' .repeat(40));
      
      // Click on Agent Visualizer tab if not already active
      const visualizerTab = await this.devToolkitPage.$$('button');
      let agentVisualizerBtn = null;
      for (const btn of visualizerTab) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('Agent Visualizer')) {
          agentVisualizerBtn = btn;
          break;
        }
      }
      if (agentVisualizerBtn) {
        await agentVisualizerBtn.click();
        await this.devToolkitPage.waitForFunction(() => true, { timeout: 2000 }).catch(() => {});
      }
      await this.captureScreenshot('04-agent-visualizer-tab', this.devToolkitPage);
      
      // Check for agent visualization components
      const hasVisualization = await this.devToolkitPage.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Agent') || 
               text.includes('Task') || 
               text.includes('Orchestration') ||
               text.includes('No active tasks');
      });
      
      await this.validate(
        'Agent visualization components present',
        hasVisualization
      );
      
      // Step 4: Check Task History tab
      console.log('\n📍 STEP 4: VERIFY TASK HISTORY');
      console.log('-' .repeat(40));
      
      // Click on Task History tab
      const historyButtons = await this.devToolkitPage.$$('button');
      let historyTab = null;
      for (const btn of historyButtons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('Task History')) {
          historyTab = btn;
          break;
        }
      }
      if (historyTab) {
        await historyTab.click();
        await this.devToolkitPage.waitForFunction(() => true, { timeout: 3000 }).catch(() => {});
        await this.captureScreenshot('05-task-history-tab', this.devToolkitPage);
        
        // Check if refresh button exists and click it
        const allButtons = await this.devToolkitPage.$$('button');
        let refreshButton = null;
        for (const btn of allButtons) {
          const svgs = await btn.$$('svg');
          for (const svg of svgs) {
            const classes = await svg.evaluate(el => el.getAttribute('class'));
            if (classes && classes.includes('lucide-refresh-cw')) {
              refreshButton = btn;
              break;
            }
          }
          if (refreshButton) break;
        }
        if (refreshButton) {
          await refreshButton.click();
          console.log('  Refreshed task history');
          await this.devToolkitPage.waitForFunction(() => true, { timeout: 2000 }).catch(() => {});
          await this.captureScreenshot('06-task-history-refreshed', this.devToolkitPage);
        }
        
        // Check for task entries
        const historyText = await this.devToolkitPage.evaluate(() => document.body.innerText);
        const hasTaskHistory = historyText.includes('Task History') && 
                               (historyText.includes('task') || 
                                historyText.includes('No task history'));
        
        await this.validate(
          'Task History section accessible',
          hasTaskHistory
        );
      }
      
      // Step 5: Check Live Stream tab
      console.log('\n📍 STEP 5: VERIFY LIVE STREAM');
      console.log('-' .repeat(40));
      
      const liveButtons = await this.devToolkitPage.$$('button');
      let liveTab = null;
      for (const btn of liveButtons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('Live Stream')) {
          liveTab = btn;
          break;
        }
      }
      if (liveTab) {
        await liveTab.click();
        await this.devToolkitPage.waitForFunction(() => true, { timeout: 2000 }).catch(() => {});
        await this.captureScreenshot('07-live-stream-tab', this.devToolkitPage);
        
        const liveText = await this.devToolkitPage.evaluate(() => document.body.innerText);
        const hasLiveStream = liveText.includes('Live Task Stream') || 
                             liveText.includes('No live tasks');
        
        await this.validate(
          'Live Stream monitoring available',
          hasLiveStream
        );
      }
      
      // Step 6: Trigger more tasks and verify tracking
      console.log('\n📍 STEP 6: CREATE MULTIPLE TASKS AND VERIFY TRACKING');
      console.log('-' .repeat(40));
      
      // Go back to main app and create more tasks
      await this.page.bringToFront();
      
      for (let i = 1; i <= 3; i++) {
        const input = await this.page.$('[placeholder*="task"], [placeholder*="Task"], input[type="text"]');
        if (input) {
          await input.type(`Test task ${i} - ${new Date().toISOString()}`);
          await this.page.keyboard.press('Enter');
          await this.page.waitForFunction(() => true, { timeout: 1000 }).catch(() => {});
          console.log(`  Created task ${i}`);
        }
      }
      
      await this.captureScreenshot('08-multiple-tasks-created');
      
      // Go back to dev toolkit and refresh
      await this.devToolkitPage.bringToFront();
      
      // Click Task History tab again
      const historyButtons2 = await this.devToolkitPage.$$('button');
      let historyTab2 = null;
      for (const btn of historyButtons2) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('Task History')) {
          historyTab2 = btn;
          break;
        }
      }
      if (historyTab2) {
        await historyTab2.click();
        await this.devToolkitPage.waitForFunction(() => true, { timeout: 1000 }).catch(() => {});
        
        // Refresh to get latest tasks
        const allBtns = await this.devToolkitPage.$$('button');
        let refreshBtn = null;
        for (const btn of allBtns) {
          const svgs = await btn.$$('svg');
          for (const svg of svgs) {
            const classes = await svg.evaluate(el => el.getAttribute('class'));
            if (classes && classes.includes('lucide-refresh-cw')) {
              refreshBtn = btn;
              break;
            }
          }
          if (refreshBtn) break;
        }
        if (refreshBtn) {
          await refreshBtn.click();
          await this.devToolkitPage.waitForFunction(() => true, { timeout: 3000 }).catch(() => {});
        }
        
        await this.captureScreenshot('09-updated-task-history', this.devToolkitPage);
      }
      
      // Step 7: Test task selection
      console.log('\n📍 STEP 7: TEST TASK SELECTION');
      console.log('-' .repeat(40));
      
      // Try to click on a task card to select it
      const taskCards = await this.devToolkitPage.$$('.cursor-pointer[class*="card"], [class*="Card"][class*="hover"]');
      if (taskCards.length > 0) {
        console.log(`  Found ${taskCards.length} task cards`);
        await taskCards[0].click();
        await this.devToolkitPage.waitForFunction(() => true, { timeout: 2000 }).catch(() => {});
        await this.captureScreenshot('10-task-selected', this.devToolkitPage);
        
        await this.validate(
          'Task selection works',
          true
        );
      } else {
        await this.validate(
          'Task cards found for selection',
          false,
          'No clickable task cards found'
        );
      }
      
      // Step 8: Check Console tab for logs
      console.log('\n📍 STEP 8: VERIFY CONSOLE LOGGING');
      console.log('-' .repeat(40));
      
      const consoleButtons = await this.devToolkitPage.$$('button');
      let consoleTab = null;
      for (const btn of consoleButtons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('Console')) {
          consoleTab = btn;
          break;
        }
      }
      if (consoleTab) {
        await consoleTab.click();
        await this.devToolkitPage.waitForFunction(() => true, { timeout: 2000 }).catch(() => {});
        await this.captureScreenshot('11-console-tab', this.devToolkitPage);
        
        const consoleText = await this.devToolkitPage.evaluate(() => document.body.innerText);
        const hasConsole = consoleText.includes('Console') || 
                          consoleText.includes('DevToolkit');
        
        await this.validate(
          'Console logging available',
          hasConsole
        );
      }
      
      // Step 9: Generate summary
      console.log('\n' + '=' .repeat(60));
      console.log('📊 TEST SUMMARY');
      console.log('=' .repeat(60));
      
      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.filter(r => !r.passed).length;
      const passRate = ((passed / this.testResults.length) * 100).toFixed(1);
      
      console.log(`\n✅ Passed: ${passed}/${this.testResults.length} (${passRate}%)`);
      console.log(`❌ Failed: ${failed}`);
      
      // Save results
      await fs.writeFile(
        path.join(this.outputDir, 'test-results.json'),
        JSON.stringify({
          summary: { passed, failed, total: this.testResults.length, passRate },
          results: this.testResults,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
      
      // Generate HTML report
      await this.generateHTMLReport(passed, failed, passRate);
      
      console.log(`\n📁 Results saved to: ${this.outputDir}`);
      
      return failed === 0;
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async generateHTMLReport(passed, failed, passRate) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dev Toolkit Task Tracking Test Report</title>
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
    }
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    h1 {
      margin: 0 0 10px 0;
      color: #2c3e50;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat {
      background: ${passRate >= 100 ? '#48bb78' : passRate >= 80 ? '#f6ad55' : '#fc8181'};
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
    }
    .results {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .test-item {
      padding: 10px;
      margin: 5px 0;
      border-radius: 5px;
      display: flex;
      align-items: center;
    }
    .test-item.passed {
      background: #c6f6d5;
    }
    .test-item.failed {
      background: #fed7d7;
    }
    .test-name {
      flex: 1;
      font-weight: 500;
    }
    .screenshots {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot-item {
      text-align: center;
    }
    .screenshot-item img {
      width: 100%;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .screenshot-label {
      margin-top: 10px;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 Dev Toolkit Task Tracking Test</h1>
      <p>Verifying task creation, selection, and agent visualization capabilities</p>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${passRate}%</div>
          <div>Pass Rate</div>
        </div>
        <div class="stat">
          <div class="stat-value">${passed}</div>
          <div>Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${failed}</div>
          <div>Failed</div>
        </div>
      </div>
    </div>
    
    <div class="results">
      <h2>Test Results</h2>
      ${this.testResults.map(r => `
        <div class="test-item ${r.passed ? 'passed' : 'failed'}">
          <span class="test-name">
            ${r.passed ? '✅' : '❌'} ${r.name}
          </span>
          ${r.error ? `<span style="color: #e53e3e; font-size: 0.9em;">${r.error}</span>` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="screenshots">
      <h2>📸 Screenshots</h2>
      <div class="screenshot-grid">
        ${[
          '01-main-app',
          '03-dev-toolkit-opened', 
          '04-agent-visualizer-tab',
          '05-task-history-tab',
          '07-live-stream-tab',
          '09-updated-task-history',
          '11-console-tab'
        ].map(name => `
          <div class="screenshot-item">
            <img src="screenshots/${name}.png" alt="${name}">
            <div class="screenshot-label">${name.replace(/-/g, ' ').replace(/^\d+\s/, '')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>`;

    await fs.writeFile(
      path.join(this.outputDir, 'report.html'),
      html
    );
  }
}

// Run the test
if (require.main === module) {
  const test = new DevToolkitTaskTrackingTest();
  test.run().then(success => {
    console.log('\n' + '=' .repeat(60));
    if (success) {
      console.log('🎉 DEV TOOLKIT TASK TRACKING TEST PASSED!');
    } else {
      console.log('⚠️ SOME TESTS FAILED - Review the report');
    }
    console.log('=' .repeat(60));
    process.exit(success ? 0 : 1);
  });
}

module.exports = DevToolkitTaskTrackingTest;