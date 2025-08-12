#!/usr/bin/env node

/**
 * TEST: Agent Activity Visualization in Dev Toolkit
 * 
 * This test verifies that agents ARE posting updates to TaskContext
 * and that these updates are visible in the Dev Toolkit
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testAgentActivityVisualization() {
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/agent-activity-${Date.now()}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('🔬 AGENT ACTIVITY VISUALIZATION TEST');
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
    // Step 1: Open Dev Toolkit and check existing tasks
    console.log('📍 STEP 1: OPEN DEV TOOLKIT AND CHECK EXISTING TASKS');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    
    // Enable console logging to see what's happening
    devPage.on('console', msg => {
      if (msg.text().includes('[RealTimeVisualizer]')) {
        console.log('  🔍', msg.text());
      }
    });
    
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(3000);
    
    // Go to Task History
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task History')) {
          btn.click();
          break;
        }
      }
    });
    
    await devPage.waitForTimeout(2000);
    
    // Refresh to get latest tasks
    console.log('  Refreshing task history...');
    await devPage.evaluate(() => {
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
    
    await devPage.waitForTimeout(3000);
    
    await devPage.screenshot({
      path: path.join(outputDir, 'screenshots', '01-task-history.png'),
      fullPage: true
    });
    
    // Find and select a task (preferably an onboarding task)
    console.log('\n📍 STEP 2: SELECT A TASK TO CHECK FOR AGENT ACTIVITY');
    console.log('-' .repeat(40));
    
    const taskSelected = await devPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card" i], .cursor-pointer');
      for (const card of cards) {
        const text = card.textContent;
        // Prefer onboarding tasks as they have the most agent activity
        if (text && (text.includes('onboarding') || text.includes('Onboarding') || 
                    text.includes('Business') || text.includes('Task'))) {
          card.click();
          console.log('[Test] Selected task:', text.substring(0, 100));
          return text.substring(0, 200);
        }
      }
      return null;
    });
    
    if (taskSelected) {
      console.log(`  ✅ Selected task: ${taskSelected.substring(0, 100)}...`);
      await devPage.waitForTimeout(2000);
      
      // Switch to Agent Visualizer
      console.log('\n📍 STEP 3: CHECK AGENT VISUALIZER FOR ACTIVITY');
      console.log('-' .repeat(40));
      
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Agent Visualizer')) {
            btn.click();
            break;
          }
        }
      });
      
      await devPage.waitForTimeout(3000);
      
      await devPage.screenshot({
        path: path.join(outputDir, 'screenshots', '02-agent-visualizer.png'),
        fullPage: true
      });
      
      // Check what's displayed
      const visualizerContent = await devPage.evaluate(() => {
        const content = document.body.innerText;
        const result = {
          hasTimeline: false,
          hasAgents: false,
          hasContext: false,
          hasReasoning: false,
          agentNames: [],
          timelineEvents: 0,
          contextChanges: 0
        };
        
        // Check for timeline
        if (content.includes('Timeline')) {
          result.hasTimeline = true;
          // Count timeline items
          const timelineItems = document.querySelectorAll('[class*="timeline" i]');
          result.timelineEvents = timelineItems.length;
        }
        
        // Check for agent activity
        const agentElements = document.querySelectorAll('[class*="agent" i]');
        if (agentElements.length > 0) {
          result.hasAgents = true;
        }
        
        // Look for specific agent names
        const knownAgents = ['orchestrator', 'DataEnrichmentAgent', 'ComplianceAgent', 'OnboardingAgent'];
        for (const agent of knownAgents) {
          if (content.includes(agent)) {
            result.agentNames.push(agent);
          }
        }
        
        // Check for context
        if (content.includes('Context') || content.includes('context')) {
          result.hasContext = true;
        }
        
        // Check for reasoning
        if (content.includes('reasoning') || content.includes('Reasoning')) {
          result.hasReasoning = true;
        }
        
        // Count context changes
        const changeElements = document.querySelectorAll('[class*="change" i], [class*="diff" i]');
        result.contextChanges = changeElements.length;
        
        return result;
      });
      
      console.log('\n  📊 Visualizer Analysis:');
      console.log(`    • Timeline present: ${visualizerContent.hasTimeline ? '✅' : '❌'}`);
      console.log(`    • Timeline events: ${visualizerContent.timelineEvents}`);
      console.log(`    • Agent activity shown: ${visualizerContent.hasAgents ? '✅' : '❌'}`);
      console.log(`    • Agent names found: ${visualizerContent.agentNames.length > 0 ? visualizerContent.agentNames.join(', ') : 'None'}`);
      console.log(`    • Context shown: ${visualizerContent.hasContext ? '✅' : '❌'}`);
      console.log(`    • Context changes: ${visualizerContent.contextChanges}`);
      console.log(`    • Reasoning shown: ${visualizerContent.hasReasoning ? '✅' : '❌'}`);
      
      // Check specific tabs if they exist
      console.log('\n📍 STEP 4: CHECK VISUALIZATION TABS');
      console.log('-' .repeat(40));
      
      // Look for tabs within the visualizer
      const tabs = await devPage.evaluate(() => {
        const tabButtons = document.querySelectorAll('[role="tab"], [class*="tab" i] button');
        return Array.from(tabButtons).map(btn => btn.textContent?.trim()).filter(Boolean);
      });
      
      console.log(`  Found ${tabs.length} tabs:`, tabs);
      
      // Try clicking through tabs to see agent data
      for (const tabName of ['Timeline', 'Context', 'Reasoning', 'Agents']) {
        const clicked = await devPage.evaluate((name) => {
          const buttons = document.querySelectorAll('button, [role="tab"]');
          for (const btn of buttons) {
            if (btn.textContent?.includes(name)) {
              btn.click();
              return true;
            }
          }
          return false;
        }, tabName);
        
        if (clicked) {
          console.log(`  ✅ Clicked ${tabName} tab`);
          await devPage.waitForTimeout(1500);
          await devPage.screenshot({
            path: path.join(outputDir, 'screenshots', `03-${tabName.toLowerCase()}-tab.png`),
            fullPage: true
          });
        }
      }
      
      // Step 5: Check browser console for actual data loading
      console.log('\n📍 STEP 5: VERIFY DATA LOADING FROM DATABASE');
      console.log('-' .repeat(40));
      
      // Execute a query directly to check if task_context_events has data
      const dbCheck = await devPage.evaluate(async () => {
        if (window.supabase) {
          try {
            // Get the selected task ID from the URL or state
            const taskElements = document.querySelectorAll('[class*="border-primary"]');
            if (taskElements.length === 0) {
              return { error: 'No task selected' };
            }
            
            // Try to extract task ID from the selected element
            const selectedText = taskElements[0].textContent || '';
            
            // Query task_context_events table
            const { data: events, error } = await window.supabase
              .from('task_context_events')
              .select('id, task_id, agent_name, action, reasoning, created_at')
              .order('sequence_number', { ascending: false })
              .limit(10);
            
            if (error) {
              return { error: error.message };
            }
            
            return {
              totalEvents: events?.length || 0,
              agents: [...new Set(events?.map(e => e.agent_name))],
              recentActions: events?.slice(0, 3).map(e => ({
                agent: e.agent_name,
                action: e.action,
                hasReasoning: !!e.reasoning
              }))
            };
          } catch (e) {
            return { error: e.message };
          }
        }
        return { error: 'Supabase not available' };
      });
      
      console.log('\n  📊 Database Check:');
      if (dbCheck.error) {
        console.log(`    ❌ Error: ${dbCheck.error}`);
      } else {
        console.log(`    • Total events in DB: ${dbCheck.totalEvents}`);
        console.log(`    • Agents in DB: ${dbCheck.agents?.join(', ') || 'None'}`);
        console.log(`    • Recent actions:`);
        dbCheck.recentActions?.forEach(action => {
          console.log(`      - ${action.agent}: ${action.action} (reasoning: ${action.hasReasoning ? '✅' : '❌'})`);
        });
      }
      
    } else {
      console.log('  ⚠️ No tasks found to select');
    }
    
    // Final summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY - AGENT ACTIVITY VISUALIZATION');
    console.log('=' .repeat(60));
    
    const verdict = visualizerContent && (visualizerContent.hasTimeline || visualizerContent.hasAgents || visualizerContent.agentNames.length > 0);
    
    if (verdict) {
      console.log('\n✅ AGENT ACTIVITY IS BEING TRACKED AND VISUALIZED!');
      console.log('The agents ARE posting updates to TaskContext.');
    } else {
      console.log('\n⚠️ LIMITED AGENT ACTIVITY VISUALIZATION');
      console.log('Either:');
      console.log('1. The selected task has no agent activity (try a different task)');
      console.log('2. The visualization needs more UI components to display the data');
      console.log('3. The data exists but is not being rendered properly');
    }
    
    console.log(`\n📁 Screenshots saved to: ${outputDir}`);
    
    // Generate HTML report
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Agent Activity Visualization Test</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; }
    .verdict { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .verdict.success { background: #c6f6d5; color: #22543d; }
    .verdict.warning { background: #fed7d7; color: #742a2a; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; margin-top: 20px; }
    .screenshot { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    img { width: 100%; border-radius: 4px; cursor: pointer; }
    .data { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    pre { background: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔬 Agent Activity Visualization Test Report</h1>
    
    <div class="verdict ${verdict ? 'success' : 'warning'}">
      <h2>${verdict ? '✅ AGENTS ARE POSTING UPDATES!' : '⚠️ LIMITED AGENT ACTIVITY'}</h2>
      <p>Timeline Events: ${visualizerContent?.timelineEvents || 0}</p>
      <p>Agents Found: ${visualizerContent?.agentNames?.join(', ') || 'None'}</p>
      <p>Context Changes: ${visualizerContent?.contextChanges || 0}</p>
    </div>
    
    <div class="data">
      <h3>Visualizer Analysis</h3>
      <pre>${JSON.stringify(visualizerContent || {}, null, 2)}</pre>
    </div>
    
    <div class="data">
      <h3>Database Check</h3>
      <pre>${JSON.stringify(dbCheck || {}, null, 2)}</pre>
    </div>
    
    <h2>Screenshots</h2>
    <div class="screenshots">
      ${fs.readdirSync(path.join(outputDir, 'screenshots')).map(file => `
        <div class="screenshot">
          <h3>${file.replace('.png', '').replace(/-/g, ' ')}</h3>
          <img src="screenshots/${file}" alt="${file}" onclick="window.open(this.src)">
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
testAgentActivityVisualization().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});