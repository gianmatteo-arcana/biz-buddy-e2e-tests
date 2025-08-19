#!/usr/bin/env node

/**
 * TEST: Create Onboarding Task and Visualize
 * 
 * Uses the "Start New Onboarding" button to create a task,
 * then visualizes it in the Dev Toolkit
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testOnboardingTaskCreation() {
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/onboarding-task-${Date.now()}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🎯 ONBOARDING TASK CREATION AND VISUALIZATION TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('👤 User: gianmatteo.allyn.test@gmail.com');
  console.log('📁 Output:', outputDir);
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Step 1: Open Dev Toolkit Standalone directly
    console.log('📍 STEP 1: OPEN DEV TOOLKIT STANDALONE');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForTimeout(3000);
    
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', '01-dev-toolkit-initial.png'),
      fullPage: true
    });
    
    // Step 2: Click "Start New Onboarding" button
    console.log('\n📍 STEP 2: START NEW ONBOARDING');
    console.log('-' .repeat(40));
    
    // Look for the button
    const onboardingButton = await page.$('button:has-text("Start New Onboarding")');
    if (onboardingButton) {
      console.log('  Found "Start New Onboarding" button');
      await onboardingButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({
        path: path.join(outputDir, 'screenshots', '02-after-onboarding-click.png'),
        fullPage: true
      });
      
      console.log('  ✅ Clicked onboarding button');
    } else {
      // Try a different approach
      const clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Start New Onboarding')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (clicked) {
        console.log('  ✅ Clicked onboarding button (via evaluate)');
        await page.waitForTimeout(3000);
        
        await page.screenshot({
          path: path.join(outputDir, 'screenshots', '02-after-onboarding-click.png'),
          fullPage: true
        });
      } else {
        console.log('  ⚠️ "Start New Onboarding" button not found');
      }
    }
    
    // Step 3: Navigate to Task History
    console.log('\n📍 STEP 3: CHECK TASK HISTORY');
    console.log('-' .repeat(40));
    
    // Click Task History tab
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task History')) {
          btn.click();
          break;
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Refresh to get latest
    console.log('  Refreshing task history...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const svgs = btn.querySelectorAll('svg');
        for (const svg of svgs) {
          if (svg.getAttribute('class')?.includes('refresh') || 
              svg.getAttribute('class')?.includes('lucide-refresh')) {
            btn.click();
            return;
          }
        }
      }
    });
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', '03-task-history-after-refresh.png'),
      fullPage: true
    });
    
    // Check what's in the history
    const tasks = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card" i], .cursor-pointer');
      const taskList = [];
      for (const card of cards) {
        const text = card.textContent;
        if (text && (text.includes('Task') || text.includes('User') || 
                    text.includes('Onboarding') || text.includes('ms'))) {
          taskList.push({
            text: text.substring(0, 200),
            hasStatus: text.includes('completed') || text.includes('in_progress') || text.includes('pending')
          });
        }
      }
      return taskList;
    });
    
    console.log(`\n  Found ${tasks.length} items in task history:`);
    tasks.forEach((task, i) => {
      console.log(`    ${i + 1}. ${task.text.substring(0, 100)}...`);
    });
    
    // Step 4: Select the most recent task
    if (tasks.length > 0) {
      console.log('\n📍 STEP 4: SELECT AND VISUALIZE TASK');
      console.log('-' .repeat(40));
      
      // Click the first (most recent) task
      const selected = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="card" i], .cursor-pointer');
        for (const card of cards) {
          const text = card.textContent;
          if (text && (text.includes('Task') || text.includes('User') || 
                      text.includes('Onboarding') || text.includes('ms'))) {
            card.click();
            console.log('Selected task:', text.substring(0, 100));
            return true;
          }
        }
        return false;
      });
      
      if (selected) {
        await page.waitForTimeout(2000);
        
        // Switch to Agent Visualizer
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent?.includes('Agent Visualizer')) {
              btn.click();
              break;
            }
          }
        });
        
        await page.waitForTimeout(2000);
        
        await page.screenshot({
          path: path.join(outputDir, 'screenshots', '04-agent-visualizer-with-task.png'),
          fullPage: true
        });
        
        console.log('  ✅ Task selected and visualizer opened');
        
        // Check what's shown in the visualizer
        const visualizerContent = await page.evaluate(() => {
          const content = document.body.innerText;
          return {
            hasTask: content.includes('Task Selected') || !content.includes('No Task Selected'),
            isDemo: content.includes('Demo mode'),
            hasAgents: content.includes('Agent') && !content.includes('Agent Visualizer'),
            hasTimeline: content.includes('Timeline'),
            hasContext: content.includes('Context')
          };
        });
        
        console.log('\n  Visualizer status:');
        console.log(`    • Task selected: ${visualizerContent.hasTask ? '✅' : '❌'}`);
        console.log(`    • Demo mode: ${visualizerContent.isDemo ? '⚠️ Yes' : '✅ No'}`);
        console.log(`    • Shows agents: ${visualizerContent.hasAgents ? '✅' : '❌'}`);
        console.log(`    • Has timeline: ${visualizerContent.hasTimeline ? '✅' : '❌'}`);
        console.log(`    • Has context: ${visualizerContent.hasContext ? '✅' : '❌'}`);
      }
    } else {
      console.log('  ⚠️ No tasks found in history');
    }
    
    // Step 5: Check Live Stream
    console.log('\n📍 STEP 5: CHECK LIVE STREAM');
    console.log('-' .repeat(40));
    
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Live Stream')) {
          btn.click();
          break;
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', '05-live-stream.png'),
      fullPage: true
    });
    
    const liveContent = await page.evaluate(() => {
      const content = document.body.innerText;
      return {
        hasEvents: !content.includes('No live tasks'),
        isPaused: content.includes('paused')
      };
    });
    
    console.log(`  • Live events: ${liveContent.hasEvents ? '✅ Active' : '⚠️ None'}`);
    console.log(`  • Stream status: ${liveContent.isPaused ? '⏸️ Paused' : '▶️ Running'}`);
    
    // Final summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`\n📁 Screenshots saved to: ${outputDir}`);
    console.log(`📊 Tasks found: ${tasks.length}`);
    
    // Generate report
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Onboarding Task Creation Test</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin-top: 20px; }
    .screenshot { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .screenshot h3 { margin-top: 0; color: #555; }
    img { width: 100%; border-radius: 4px; cursor: pointer; }
    img:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .status { display: inline-block; padding: 5px 10px; border-radius: 4px; margin: 5px; }
    .success { background: #c6f6d5; color: #22543d; }
    .warning { background: #fed7d7; color: #742a2a; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Onboarding Task Creation & Visualization Test</h1>
    
    <div class="summary">
      <h2>Results Summary</h2>
      <div>
        <span class="status ${tasks.length > 0 ? 'success' : 'warning'}">
          Tasks Found: ${tasks.length}
        </span>
        <span class="status success">
          User: gianmatteo.allyn.test@gmail.com
        </span>
      </div>
    </div>
    
    <h2>Test Flow Screenshots</h2>
    <div class="screenshots">
      ${['01-dev-toolkit-initial', '02-after-onboarding-click', '03-task-history-after-refresh', 
         '04-agent-visualizer-with-task', '05-live-stream']
        .map(name => `
          <div class="screenshot">
            <h3>${name.replace(/-/g, ' ').replace(/^\d+\s/, '').toUpperCase()}</h3>
            <img src="screenshots/${name}.png" alt="${name}" onclick="window.open(this.src)">
          </div>
        `).join('')}
    </div>
  </div>
</body>
</html>`;
    
    await fs.writeFile(path.join(outputDir, 'report.html'), html);
    
    // Open report
    const { exec } = require('child_process');
    exec(`open ${path.join(outputDir, 'report.html')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testOnboardingTaskCreation().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});