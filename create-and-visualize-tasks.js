#!/usr/bin/env node

/**
 * CREATE AND VISUALIZE TASKS
 * 
 * Creates tasks through the UI and then visualizes them in Dev Toolkit
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function createAndVisualizeTasks() {
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/create-visualize-${Date.now()}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🎯 CREATE AND VISUALIZE TASKS TEST');
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
    // Step 1: Open main app and create tasks
    console.log('📍 STEP 1: CREATE TASKS IN MAIN APP');
    console.log('-' .repeat(40));
    
    const mainPage = await context.newPage();
    await mainPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await mainPage.waitForTimeout(3000);
    
    // Look for any input field where we can add tasks
    console.log('Looking for task input field...');
    
    // Try different selectors for task input
    const selectors = [
      'input[placeholder*="task" i]',
      'input[placeholder*="add" i]',
      'input[placeholder*="create" i]',
      'textarea[placeholder*="task" i]',
      'input[type="text"]'
    ];
    
    let taskInput = null;
    for (const selector of selectors) {
      taskInput = await mainPage.$(selector);
      if (taskInput) {
        const placeholder = await taskInput.getAttribute('placeholder');
        console.log(`  Found input with placeholder: "${placeholder || 'none'}"`);
        break;
      }
    }
    
    if (taskInput) {
      // Create 3 test tasks
      const tasks = [
        'Review Q4 financial reports',
        'Update business license for 2025',
        'Schedule team meeting for project kickoff'
      ];
      
      for (const taskText of tasks) {
        await taskInput.fill(taskText);
        await mainPage.keyboard.press('Enter');
        await mainPage.waitForTimeout(1500);
        console.log(`  ✅ Created task: ${taskText}`);
      }
      
      await mainPage.screenshot({
        path: path.join(outputDir, 'screenshots', '01-tasks-created.png'),
        fullPage: true
      });
    } else {
      console.log('  ⚠️ No task input field found');
      
      // Take screenshot to see what's on the page
      await mainPage.screenshot({
        path: path.join(outputDir, 'screenshots', '01-main-page.png'),
        fullPage: true
      });
      
      // Check what's actually on the page
      const pageText = await mainPage.evaluate(() => document.body.innerText);
      console.log('\nPage content preview:');
      console.log(pageText.substring(0, 500));
    }
    
    // Step 2: Open Dev Toolkit
    console.log('\n📍 STEP 2: OPEN DEV TOOLKIT STANDALONE');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(3000);
    
    await devPage.screenshot({
      path: path.join(outputDir, 'screenshots', '02-dev-toolkit.png'),
      fullPage: true
    });
    
    // Step 3: Go to Task History
    console.log('\n📍 STEP 3: VIEW TASK HISTORY');
    console.log('-' .repeat(40));
    
    // Click Task History tab
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task History')) {
          btn.click();
          console.log('Clicked Task History');
          break;
        }
      }
    });
    
    await devPage.waitForTimeout(2000);
    
    // Refresh to get latest
    console.log('  Refreshing task history...');
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const svgs = btn.querySelectorAll('svg');
        for (const svg of svgs) {
          if (svg.getAttribute('class')?.includes('refresh')) {
            btn.click();
            console.log('Clicked refresh');
            return;
          }
        }
      }
    });
    
    await devPage.waitForTimeout(3000);
    
    await devPage.screenshot({
      path: path.join(outputDir, 'screenshots', '03-task-history.png'),
      fullPage: true
    });
    
    // Check what's in the history
    const historyContent = await devPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card" i], [class*="cursor-pointer"]');
      const tasks = [];
      for (const card of cards) {
        const text = card.textContent;
        if (text && (text.includes('Task') || text.includes('User') || text.includes('ms'))) {
          tasks.push(text.substring(0, 200));
        }
      }
      return tasks;
    });
    
    console.log(`\n  Found ${historyContent.length} items in task history:`);
    historyContent.forEach((task, i) => {
      console.log(`    ${i + 1}. ${task.substring(0, 100)}...`);
    });
    
    // Step 4: Select a task if any exist
    if (historyContent.length > 0) {
      console.log('\n📍 STEP 4: SELECT AND VISUALIZE A TASK');
      console.log('-' .repeat(40));
      
      // Click the first task
      await devPage.evaluate(() => {
        const cards = document.querySelectorAll('[class*="card" i], [class*="cursor-pointer"]');
        for (const card of cards) {
          const text = card.textContent;
          if (text && (text.includes('Task') || text.includes('User') || text.includes('ms'))) {
            card.click();
            console.log('Clicked task card');
            return true;
          }
        }
        return false;
      });
      
      await devPage.waitForTimeout(2000);
      
      // Switch to Agent Visualizer
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Agent Visualizer')) {
            btn.click();
            console.log('Clicked Agent Visualizer');
            break;
          }
        }
      });
      
      await devPage.waitForTimeout(2000);
      
      await devPage.screenshot({
        path: path.join(outputDir, 'screenshots', '04-agent-visualizer.png'),
        fullPage: true
      });
      
      console.log('  ✅ Task selected and visualizer opened');
    }
    
    // Step 5: Check database directly
    console.log('\n📍 STEP 5: CHECK DATABASE FOR TASKS');
    console.log('-' .repeat(40));
    
    // Execute query in console to check tasks
    const dbCheck = await devPage.evaluate(async () => {
      // This runs in the browser context
      if (window.supabase) {
        try {
          const { data: { user } } = await window.supabase.auth.getUser();
          if (user) {
            const { data: tasks, error } = await window.supabase
              .from('tasks')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(10);
            
            if (error) {
              return { error: error.message };
            }
            return { 
              userId: user.id,
              userEmail: user.email,
              taskCount: tasks?.length || 0,
              tasks: tasks?.map(t => ({
                id: t.id,
                title: t.title,
                status: t.status,
                created: t.created_at
              }))
            };
          }
          return { error: 'No user logged in' };
        } catch (e) {
          return { error: e.message };
        }
      }
      return { error: 'Supabase not available' };
    });
    
    console.log('\nDatabase check result:');
    console.log(JSON.stringify(dbCheck, null, 2));
    
    // Final summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`\n📁 Screenshots saved to: ${outputDir}`);
    console.log('\nKey findings:');
    console.log(`  • Tasks in UI: ${historyContent.length}`);
    if (dbCheck.taskCount !== undefined) {
      console.log(`  • Tasks in DB: ${dbCheck.taskCount}`);
    }
    
    // Open the report
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Task Creation and Visualization Report</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
    .screenshot { background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    img { width: 100%; border-radius: 4px; }
    .data { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    pre { background: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Task Creation and Visualization Test</h1>
    <div class="data">
      <h2>Database Check Result</h2>
      <pre>${JSON.stringify(dbCheck, null, 2)}</pre>
    </div>
    <div class="data">
      <h2>Tasks Found in UI</h2>
      <pre>${JSON.stringify(historyContent, null, 2)}</pre>
    </div>
    <h2>Screenshots</h2>
    <div class="screenshots">
      ${['01-tasks-created', '02-dev-toolkit', '03-task-history', '04-agent-visualizer']
        .map(name => `
          <div class="screenshot">
            <h3>${name.replace(/-/g, ' ').replace(/^\d+\s/, '')}</h3>
            <img src="screenshots/${name}.png" alt="${name}">
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
createAndVisualizeTasks().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});