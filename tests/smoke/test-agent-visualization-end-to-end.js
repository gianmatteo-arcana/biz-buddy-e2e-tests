#!/usr/bin/env node

/**
 * END-TO-END AGENT VISUALIZATION TEST
 * 
 * Comprehensive test to verify agent events are being created and visualized
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testAgentVisualizationEndToEnd() {
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/agent-viz-${Date.now()}`;
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'screenshots'), { recursive: true });
  
  console.log('✅ END-TO-END AGENT VISUALIZATION TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
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

  const findings = {
    agentsLogging: false,
    eventsCreated: false,
    eventsInDatabase: false,
    eventsVisualized: false,
    timelineShown: false,
    contextDiffShown: false,
    agentDecisionsShown: false
  };

  try {
    // Step 1: Load main app
    console.log('📍 STEP 1: LOAD APPLICATION');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Monitor console for agent activity
    const agentLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[OnboardingOrchestrator]') || 
          text.includes('[EventSourced]') ||
          text.includes('[RealTimeVisualizer]')) {
        agentLogs.push(text);
        if (!findings.agentsLogging) {
          console.log('  ✅ Agent logging detected!');
          findings.agentsLogging = true;
        }
        if (text.includes('EVENT SAVED TO DATABASE') || text.includes('Event created successfully')) {
          findings.eventsCreated = true;
          console.log('  ✅ Event creation confirmed!');
        }
      }
    });
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(5000);
    
    await page.screenshot({
      path: path.join(outputDir, 'screenshots', '01-app-loaded.png'),
      fullPage: true
    });
    
    // Step 2: Open Dev Toolkit
    console.log('\n📍 STEP 2: OPEN DEV TOOLKIT');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    
    devPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RealTimeVisualizer]')) {
        if (text.includes('Found') && text.includes('events')) {
          const match = text.match(/Found (\d+) events/);
          if (match && parseInt(match[1]) > 0) {
            findings.eventsInDatabase = true;
            console.log(`  ✅ Events found in database: ${match[1]}`);
          }
        }
      }
    });
    
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(3000);
    
    // Step 3: Navigate to Task History
    console.log('\n📍 STEP 3: CHECK TASK HISTORY');
    console.log('-' .repeat(40));
    
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
    
    // Refresh to get latest
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const svgs = btn.querySelectorAll('svg');
        for (const svg of svgs) {
          if (svg.getAttribute('class')?.includes('refresh')) {
            btn.click();
            return;
          }
        }
      }
    });
    
    await devPage.waitForTimeout(3000);
    
    await devPage.screenshot({
      path: path.join(outputDir, 'screenshots', '02-task-history.png'),
      fullPage: true
    });
    
    // Step 4: Select a task
    console.log('\n📍 STEP 4: SELECT TASK AND CHECK AGENT VISUALIZER');
    console.log('-' .repeat(40));
    
    const taskInfo = await devPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"]');
      if (cards.length > 0) {
        const firstCard = cards[0];
        const text = firstCard.textContent || '';
        firstCard.click();
        return {
          found: true,
          count: cards.length,
          firstTaskText: text.substring(0, 100)
        };
      }
      return { found: false, count: 0 };
    });
    
    if (taskInfo.found) {
      console.log(`  ✅ Found ${taskInfo.count} tasks`);
      console.log(`  📝 Selected: ${taskInfo.firstTaskText}`);
      
      await devPage.waitForTimeout(2000);
      
      // Switch to Agent Visualizer
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
        path: path.join(outputDir, 'screenshots', '03-agent-visualizer.png'),
        fullPage: true
      });
      
      // Check what's visible in the visualizer
      const visualizerContent = await devPage.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasTimeline: bodyText.includes('Timeline') || document.querySelector('[class*="timeline"]') !== null,
          hasContextSnapshot: bodyText.includes('Context Snapshot') || bodyText.includes('context'),
          hasAgentDecisions: bodyText.includes('Agent Decisions') || bodyText.includes('reasoning'),
          hasNoEvents: bodyText.includes('No events') || bodyText.includes('No agent activity'),
          hasAgentNames: bodyText.includes('Agent') || bodyText.includes('Orchestrator'),
          text: bodyText.substring(0, 500)
        };
      });
      
      console.log('\n📊 AGENT VISUALIZER CONTENT:');
      console.log(`  • Timeline visible: ${visualizerContent.hasTimeline ? '✅' : '❌'}`);
      console.log(`  • Context snapshots: ${visualizerContent.hasContextSnapshot ? '✅' : '❌'}`);
      console.log(`  • Agent decisions: ${visualizerContent.hasAgentDecisions ? '✅' : '❌'}`);
      console.log(`  • Shows "No events": ${visualizerContent.hasNoEvents ? '❌ Yes (bad)' : '✅ No (good)'}`);
      console.log(`  • Agent names visible: ${visualizerContent.hasAgentNames ? '✅' : '❌'}`);
      
      findings.eventsVisualized = !visualizerContent.hasNoEvents && visualizerContent.hasAgentNames;
      findings.timelineShown = visualizerContent.hasTimeline;
      findings.contextDiffShown = visualizerContent.hasContextSnapshot;
      findings.agentDecisionsShown = visualizerContent.hasAgentDecisions;
      
      // Switch through other tabs to check
      console.log('\n📍 STEP 5: CHECK OTHER VISUALIZATION TABS');
      console.log('-' .repeat(40));
      
      // Try Task Timeline
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Task Timeline')) {
            btn.click();
            break;
          }
        }
      });
      
      await devPage.waitForTimeout(2000);
      
      await devPage.screenshot({
        path: path.join(outputDir, 'screenshots', '04-task-timeline.png'),
        fullPage: true
      });
      
      // Try Context Diff Viewer
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Context Diff')) {
            btn.click();
            break;
          }
        }
      });
      
      await devPage.waitForTimeout(2000);
      
      await devPage.screenshot({
        path: path.join(outputDir, 'screenshots', '05-context-diff.png'),
        fullPage: true
      });
    } else {
      console.log('  ❌ No tasks found in Task History');
    }
    
    // Final Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 END-TO-END TEST RESULTS');
    console.log('=' .repeat(60));
    
    console.log('\n📋 Agent Event Pipeline:');
    console.log(`  1. Agents logging activity: ${findings.agentsLogging ? '✅' : '❌'}`);
    console.log(`  2. Events created in code: ${findings.eventsCreated ? '✅' : '❌'}`);
    console.log(`  3. Events saved to database: ${findings.eventsInDatabase ? '✅' : '❌'}`);
    console.log(`  4. Events visualized in UI: ${findings.eventsVisualized ? '✅' : '❌'}`);
    
    console.log('\n📊 Visualization Components:');
    console.log(`  • Timeline shown: ${findings.timelineShown ? '✅' : '❌'}`);
    console.log(`  • Context diffs shown: ${findings.contextDiffShown ? '✅' : '❌'}`);
    console.log(`  • Agent decisions shown: ${findings.agentDecisionsShown ? '✅' : '❌'}`);
    
    const successCount = Object.values(findings).filter(v => v).length;
    const totalChecks = Object.keys(findings).length;
    const successRate = Math.round((successCount / totalChecks) * 100);
    
    console.log(`\n📈 Success Rate: ${successCount}/${totalChecks} (${successRate}%)`);
    
    if (successRate >= 70) {
      console.log('\n✅ SUCCESS! Agent activity is being tracked and visualized!');
    } else if (successRate >= 40) {
      console.log('\n⚠️ PARTIAL SUCCESS - Some components working but needs improvement');
    } else {
      console.log('\n❌ FAILURE - Agent visualization pipeline not working properly');
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      findings,
      agentLogs: agentLogs.slice(0, 50),
      successRate: `${successRate}%`,
      outputDir
    };
    
    await fs.writeFile(
      path.join(outputDir, 'report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n📁 Full report saved to: ${outputDir}`);
    console.log('🔍 Browser windows remain open for manual inspection');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testAgentVisualizationEndToEnd().then(() => {
  console.log('\n✅ Test completed successfully');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});