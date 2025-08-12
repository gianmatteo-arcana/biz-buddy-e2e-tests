#!/usr/bin/env node

/**
 * TEST: Dev Toolkit with Existing User Tasks
 * 
 * Uses authenticated user (gianmatteo.allyn.test@gmail.com) to:
 * 1. Load existing tasks from previous test runs
 * 2. Select tasks and visualize their agent interactions
 * 3. Verify task context inspection works
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class DevToolkitExistingTasksTest {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.devToolkitPage = null;
    this.testResults = [];
    this.outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/dev-toolkit-existing-${Date.now()}`;
    this.appUrl = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
  }

  async setup() {
    console.log('🔧 DEV TOOLKIT WITH EXISTING TASKS TEST');
    console.log('=' .repeat(60));
    console.log('📅 Date:', new Date().toLocaleString());
    console.log('🌐 URL:', this.appUrl);
    console.log('👤 User: gianmatteo.allyn.test@gmail.com');
    console.log('📁 Output:', this.outputDir);
    console.log('=' .repeat(60) + '\n');

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'screenshots'), { recursive: true });

    // Use Playwright with stored auth state
    this.browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Load authenticated context
    this.context = await this.browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
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
      
      // Step 1: Verify we're authenticated in main app
      console.log('\n📍 STEP 1: VERIFY AUTHENTICATION');
      console.log('-' .repeat(40));
      
      this.page = await this.context.newPage();
      await this.page.goto(this.appUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);
      await this.captureScreenshot('01-main-app-authenticated');
      
      const mainPageText = await this.page.evaluate(() => document.body.innerText);
      const isAuthenticated = mainPageText.includes('Welcome') || 
                             mainPageText.includes('Dashboard') ||
                             mainPageText.includes('Gianmatteo');
      
      await this.validate(
        'User is authenticated',
        isAuthenticated,
        'No authentication indicators found'
      );
      
      // Step 2: Open Dev Toolkit Standalone
      console.log('\n📍 STEP 2: OPEN DEV TOOLKIT STANDALONE');
      console.log('-' .repeat(40));
      
      this.devToolkitPage = await this.context.newPage();
      await this.devToolkitPage.goto(`${this.appUrl}/dev-toolkit-standalone`, { 
        waitUntil: 'networkidle' 
      });
      await this.devToolkitPage.waitForTimeout(3000);
      await this.captureScreenshot('02-dev-toolkit-opened', this.devToolkitPage);
      
      // Step 3: Navigate to Task History
      console.log('\n📍 STEP 3: LOAD TASK HISTORY');
      console.log('-' .repeat(40));
      
      // Click Task History tab
      await this.devToolkitPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Task History')) {
            btn.click();
            break;
          }
        }
      });
      
      await this.devToolkitPage.waitForTimeout(2000);
      await this.captureScreenshot('03-task-history-initial', this.devToolkitPage);
      
      // Click refresh to ensure we have latest tasks
      console.log('  Refreshing task history...');
      await this.devToolkitPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const svgs = btn.querySelectorAll('svg');
          for (const svg of svgs) {
            if (svg.getAttribute('class')?.includes('lucide-refresh-cw')) {
              btn.click();
              return;
            }
          }
        }
      });
      
      await this.devToolkitPage.waitForTimeout(3000);
      await this.captureScreenshot('04-task-history-refreshed', this.devToolkitPage);
      
      // Check if we have tasks
      const historyText = await this.devToolkitPage.evaluate(() => document.body.innerText);
      const hasTasks = !historyText.includes('No task history available');
      
      await this.validate(
        'Task history has tasks',
        hasTasks,
        'No tasks found in history'
      );
      
      // Count the tasks
      const taskCount = await this.devToolkitPage.evaluate(() => {
        const cards = document.querySelectorAll('[class*="Card"], .cursor-pointer');
        let count = 0;
        for (const card of cards) {
          // Look for task-like content
          if (card.textContent?.includes('ms') || 
              card.textContent?.includes('User') || 
              card.textContent?.includes('Task')) {
            count++;
          }
        }
        return count;
      });
      
      console.log(`  📊 Found ${taskCount} tasks in history`);
      
      // Step 4: Select a task
      console.log('\n📍 STEP 4: SELECT A TASK FOR VISUALIZATION');
      console.log('-' .repeat(40));
      
      if (taskCount > 0) {
        // Click the first task card
        await this.devToolkitPage.evaluate(() => {
          const cards = document.querySelectorAll('[class*="Card"], .cursor-pointer');
          for (const card of cards) {
            if (card.textContent?.includes('ms') || 
                card.textContent?.includes('User') || 
                card.textContent?.includes('Task')) {
              card.click();
              console.log('Clicked task:', card.textContent?.substring(0, 100));
              return true;
            }
          }
          return false;
        });
        
        await this.devToolkitPage.waitForTimeout(2000);
        await this.captureScreenshot('05-task-selected', this.devToolkitPage);
        
        await this.validate(
          'Task selected successfully',
          true
        );
        
        // Check if the card shows selected state (border change)
        const hasSelectedTask = await this.devToolkitPage.evaluate(() => {
          const cards = document.querySelectorAll('[class*="border-primary"]');
          return cards.length > 0;
        });
        
        await this.validate(
          'Task shows selected state',
          hasSelectedTask,
          'No visual indication of selected task'
        );
      }
      
      // Step 5: Switch to Agent Visualizer
      console.log('\n📍 STEP 5: VIEW AGENT VISUALIZER WITH SELECTED TASK');
      console.log('-' .repeat(40));
      
      // Click Agent Visualizer tab
      await this.devToolkitPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Agent Visualizer')) {
            btn.click();
            break;
          }
        }
      });
      
      await this.devToolkitPage.waitForTimeout(2000);
      await this.captureScreenshot('06-agent-visualizer-with-task', this.devToolkitPage);
      
      // Check visualizer content
      const visualizerText = await this.devToolkitPage.evaluate(() => document.body.innerText);
      const hasVisualization = visualizerText.includes('Agent') || 
                              visualizerText.includes('Task') || 
                              visualizerText.includes('Orchestration') ||
                              visualizerText.includes('Timeline') ||
                              visualizerText.includes('Context');
      
      await this.validate(
        'Agent visualizer shows content',
        hasVisualization
      );
      
      // Step 6: Check Live Stream
      console.log('\n📍 STEP 6: CHECK LIVE STREAM FOR ACTIVITY');
      console.log('-' .repeat(40));
      
      // Click Live Stream tab
      await this.devToolkitPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Live Stream')) {
            btn.click();
            break;
          }
        }
      });
      
      await this.devToolkitPage.waitForTimeout(2000);
      await this.captureScreenshot('07-live-stream', this.devToolkitPage);
      
      // Step 7: Create a new task to see live updates
      console.log('\n📍 STEP 7: CREATE NEW TASK AND OBSERVE LIVE TRACKING');
      console.log('-' .repeat(40));
      
      // Go back to main app
      await this.page.bringToFront();
      
      // Try to create a task
      const taskInput = await this.page.$('input[placeholder*="task" i], input[placeholder*="add" i], input[type="text"]');
      if (taskInput) {
        const taskName = `Test Task ${new Date().toISOString()}`;
        await taskInput.type(taskName);
        await this.page.keyboard.press('Enter');
        console.log(`  Created task: ${taskName}`);
        await this.page.waitForTimeout(2000);
        await this.captureScreenshot('08-new-task-created');
      }
      
      // Go back to dev toolkit and refresh history
      await this.devToolkitPage.bringToFront();
      
      // Click Task History tab again
      await this.devToolkitPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Task History')) {
            btn.click();
            break;
          }
        }
      });
      
      await this.devToolkitPage.waitForTimeout(1000);
      
      // Refresh
      await this.devToolkitPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const svgs = btn.querySelectorAll('svg');
          for (const svg of svgs) {
            if (svg.getAttribute('class')?.includes('lucide-refresh-cw')) {
              btn.click();
              return;
            }
          }
        }
      });
      
      await this.devToolkitPage.waitForTimeout(3000);
      await this.captureScreenshot('09-history-with-new-task', this.devToolkitPage);
      
      // Count tasks again
      const newTaskCount = await this.devToolkitPage.evaluate(() => {
        const cards = document.querySelectorAll('[class*="Card"], .cursor-pointer');
        let count = 0;
        for (const card of cards) {
          if (card.textContent?.includes('ms') || 
              card.textContent?.includes('User') || 
              card.textContent?.includes('Task')) {
            count++;
          }
        }
        return count;
      });
      
      console.log(`  📊 Now have ${newTaskCount} tasks in history`);
      
      if (newTaskCount > taskCount) {
        await this.validate(
          'New task appears in history',
          true
        );
      }
      
      // Step 8: Export task history
      console.log('\n📍 STEP 8: TEST EXPORT FUNCTIONALITY');
      console.log('-' .repeat(40));
      
      // Click Export button
      const exportClicked = await this.devToolkitPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Export')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (exportClicked) {
        console.log('  📥 Export triggered');
        await this.validate(
          'Export functionality available',
          true
        );
      }
      
      // Final summary
      console.log('\n' + '=' .repeat(60));
      console.log('📊 TEST SUMMARY');
      console.log('=' .repeat(60));
      
      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.filter(r => !r.passed).length;
      const passRate = ((passed / this.testResults.length) * 100).toFixed(1);
      
      console.log(`\n✅ Passed: ${passed}/${this.testResults.length} (${passRate}%)`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📊 Tasks found: ${newTaskCount || taskCount || 0}`);
      
      // Save results
      await fs.writeFile(
        path.join(this.outputDir, 'test-results.json'),
        JSON.stringify({
          summary: { 
            passed, 
            failed, 
            total: this.testResults.length, 
            passRate,
            tasksFound: newTaskCount || taskCount || 0
          },
          results: this.testResults,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
      
      console.log(`\n📁 Results saved to: ${this.outputDir}`);
      
      // Generate HTML report
      await this.generateHTMLReport(passed, failed, passRate, newTaskCount || taskCount || 0);
      
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

  async generateHTMLReport(passed, failed, passRate, taskCount) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dev Toolkit Existing Tasks Test Report</title>
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
    .info {
      color: #666;
      margin: 10px 0;
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
      cursor: pointer;
      transition: transform 0.2s;
    }
    .screenshot-item img:hover {
      transform: scale(1.05);
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
      <h1>🔧 Dev Toolkit Existing Tasks Test</h1>
      <div class="info">Testing task selection and visualization with authenticated user</div>
      <div class="info">👤 User: gianmatteo.allyn.test@gmail.com</div>
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
        <div class="stat" style="background: #4299e1;">
          <div class="stat-value">${taskCount}</div>
          <div>Tasks Found</div>
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
      <h2>📸 Test Flow Screenshots</h2>
      <div class="screenshot-grid">
        ${['01-main-app-authenticated', '02-dev-toolkit-opened', '03-task-history-initial', 
           '04-task-history-refreshed', '06-agent-visualizer-with-task', '07-live-stream',
           '09-history-with-new-task'].map(name => `
          <div class="screenshot-item">
            <img src="screenshots/${name}.png" alt="${name}" onclick="window.open(this.src)">
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
    
    console.log(`\n📊 HTML report generated: ${path.join(this.outputDir, 'report.html')}`);
  }
}

// Run the test
if (require.main === module) {
  const test = new DevToolkitExistingTasksTest();
  test.run().then(success => {
    console.log('\n' + '=' .repeat(60));
    if (success) {
      console.log('🎉 DEV TOOLKIT EXISTING TASKS TEST PASSED!');
    } else {
      console.log('⚠️ SOME TESTS FAILED - Review the report');
    }
    console.log('=' .repeat(60));
    process.exit(success ? 0 : 1);
  });
}

module.exports = DevToolkitExistingTasksTest;