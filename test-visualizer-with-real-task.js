#!/usr/bin/env node

/**
 * Test Real-Time Agent Visualizer with Actual Task Creation
 * 
 * This script:
 * 1. Opens the Dev Toolkit standalone page
 * 2. Navigates to Agent Visualizer
 * 3. Creates a real onboarding task
 * 4. Observes actual orchestration and agent collaboration
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const DEV_TOOLKIT_URL = `${APP_URL}/dev-toolkit-standalone`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRealTimeVisualizer() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = `test-visualizer-real-${timestamp}`;
  await fs.mkdir(testDir, { recursive: true });
  
  console.log('🚀 Testing Real-Time Agent Visualizer with Actual Data');
  console.log('=' .repeat(60));
  console.log(`📁 Test artifacts: ${testDir}/`);
  console.log(`🌐 Dev Toolkit URL: ${DEV_TOOLKIT_URL}`);
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  // Enable detailed console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[RealTimeVisualizer]') || 
        text.includes('[DevToolkit]') ||
        text.includes('[TaskOrchestration]') ||
        text.includes('Task') ||
        text.includes('Agent')) {
      console.log(`  📝 ${text}`);
    }
  });
  
  page.on('error', err => {
    console.error('  ❌ Page error:', err.message);
  });
  
  try {
    // Step 1: Navigate directly to Dev Toolkit standalone
    console.log('\n1️⃣  Opening Dev Toolkit standalone...');
    await page.goto(DEV_TOOLKIT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    
    await page.screenshot({ 
      path: path.join(testDir, '01-dev-toolkit-standalone.png'),
      fullPage: true 
    });
    console.log('   📸 Screenshot: Dev Toolkit loaded');
    
    // Step 2: Click on Agent Visualizer tab
    console.log('\n2️⃣  Opening Agent Visualizer tab...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const vizTab = buttons.find(b => 
        b.textContent?.includes('Agent Visualizer') ||
        b.querySelector('.lucide-bot')?.parentElement?.textContent?.includes('Agent')
      );
      if (vizTab) {
        console.log('[Test] Found Agent Visualizer tab, clicking...');
        vizTab.click();
      } else {
        console.log('[Test] Agent Visualizer tab not found, available buttons:', 
          buttons.map(b => b.textContent).filter(t => t));
      }
    });
    
    await sleep(2000);
    await page.screenshot({ 
      path: path.join(testDir, '02-agent-visualizer-tab.png'),
      fullPage: true 
    });
    console.log('   📸 Screenshot: Agent Visualizer tab active');
    
    // Step 3: Look for Start New Onboarding button
    console.log('\n3️⃣  Looking for Start New Onboarding button...');
    
    const hasStartButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent?.includes('Start New Onboarding'));
    });
    
    if (hasStartButton) {
      console.log('   ✅ Found Start New Onboarding button');
      
      // Click the button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const startBtn = buttons.find(b => b.textContent?.includes('Start New Onboarding'));
        if (startBtn) {
          console.log('[Test] Clicking Start New Onboarding...');
          startBtn.click();
        }
      });
      
      await sleep(3000);
      await page.screenshot({ 
        path: path.join(testDir, '03-onboarding-started.png'),
        fullPage: true 
      });
      console.log('   📸 Screenshot: Onboarding task created');
      
      // Wait for orchestration to begin
      console.log('\n4️⃣  Waiting for orchestration to analyze task...');
      await sleep(5000);
      
      await page.screenshot({ 
        path: path.join(testDir, '04-orchestration-active.png'),
        fullPage: true 
      });
      console.log('   📸 Screenshot: Orchestration in progress');
      
    } else {
      console.log('   ⚠️  No Start button found, checking if task already exists...');
      
      // Check if a task is already loaded
      const hasTask = await page.evaluate(() => {
        const text = document.body.textContent;
        return text?.includes('Current Task:') || text?.includes('Task ID:');
      });
      
      if (hasTask) {
        console.log('   ✅ Task already loaded');
        await page.screenshot({ 
          path: path.join(testDir, '03-existing-task.png'),
          fullPage: true 
        });
      }
    }
    
    // Step 4: Explore different tabs
    console.log('\n5️⃣  Exploring visualization tabs...');
    
    // Timeline tab
    const hasTimelineTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], button'));
      const timelineTab = tabs.find(b => b.textContent?.includes('Timeline'));
      if (timelineTab) {
        timelineTab.click();
        return true;
      }
      return false;
    });
    
    if (hasTimelineTab) {
      await sleep(2000);
      await page.screenshot({ 
        path: path.join(testDir, '05-timeline-tab.png'),
        fullPage: true 
      });
      console.log('   📸 Screenshot: Timeline view');
    }
    
    // Context tab
    const hasContextTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], button'));
      const contextTab = tabs.find(b => b.textContent?.includes('Context'));
      if (contextTab) {
        contextTab.click();
        return true;
      }
      return false;
    });
    
    if (hasContextTab) {
      await sleep(2000);
      await page.screenshot({ 
        path: path.join(testDir, '06-context-tab.png'),
        fullPage: true 
      });
      console.log('   📸 Screenshot: Context evolution');
    }
    
    // Reasoning tab
    const hasReasoningTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], button'));
      const reasoningTab = tabs.find(b => b.textContent?.includes('Reasoning'));
      if (reasoningTab) {
        reasoningTab.click();
        return true;
      }
      return false;
    });
    
    if (hasReasoningTab) {
      await sleep(2000);
      await page.screenshot({ 
        path: path.join(testDir, '07-reasoning-tab.png'),
        fullPage: true 
      });
      console.log('   📸 Screenshot: Agent reasoning');
    }
    
    // Orchestration tab
    const hasOrchestrationTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], button'));
      const orchTab = tabs.find(b => b.textContent?.includes('Orchestration'));
      if (orchTab) {
        orchTab.click();
        return true;
      }
      return false;
    });
    
    if (hasOrchestrationTab) {
      await sleep(2000);
      await page.screenshot({ 
        path: path.join(testDir, '08-orchestration-tab.png'),
        fullPage: true 
      });
      console.log('   📸 Screenshot: Orchestration details');
    }
    
    // Step 6: Check for real data
    console.log('\n6️⃣  Analyzing data source...');
    
    const dataAnalysis = await page.evaluate(() => {
      const text = document.body.textContent || '';
      
      return {
        hasRealTask: text.includes('task_id') || text.includes('Task ID:'),
        hasTimestamps: text.includes(new Date().getFullYear().toString()),
        hasAgentNames: text.includes('Orchestrator') || text.includes('DataCollectionAgent'),
        hasDatabase: text.includes('supabase') || text.includes('task_contexts'),
        hasEvents: text.includes('event') || text.includes('Event'),
        hasReasoning: text.includes('reasoning') || text.includes('Reasoning'),
        taskTitle: text.match(/Current Task: ([^|]+)/)?.[1]?.trim(),
        eventCount: (text.match(/event/gi) || []).length
      };
    });
    
    console.log('\n📊 Data Analysis Results:');
    console.log(`   - Real Task ID: ${dataAnalysis.hasRealTask ? '✅' : '❌'}`);
    console.log(`   - Live Timestamps: ${dataAnalysis.hasTimestamps ? '✅' : '❌'}`);
    console.log(`   - Agent Names: ${dataAnalysis.hasAgentNames ? '✅' : '❌'}`);
    console.log(`   - Database References: ${dataAnalysis.hasDatabase ? '✅' : '❌'}`);
    console.log(`   - Events Present: ${dataAnalysis.hasEvents ? '✅' : '❌'}`);
    console.log(`   - Reasoning Data: ${dataAnalysis.hasReasoning ? '✅' : '❌'}`);
    if (dataAnalysis.taskTitle) {
      console.log(`   - Task Title: "${dataAnalysis.taskTitle}"`);
    }
    console.log(`   - Event References: ${dataAnalysis.eventCount}`);
    
    // Step 7: Capture final state
    console.log('\n7️⃣  Capturing final state...');
    
    const finalState = await page.evaluate(() => {
      // Get all visible text content
      const visibleText = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (parent && getComputedStyle(parent).display !== 'none') {
              const text = node.textContent?.trim();
              if (text && text.length > 0) {
                return NodeFilter.FILTER_ACCEPT;
              }
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 2) {
          visibleText.push(text);
        }
      }
      
      return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title,
        activeTab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
        hasRealTimeData: visibleText.some(t => 
          t.includes('Real-Time') || 
          t.includes('real-time') || 
          t.includes('Live')
        ),
        dataIndicators: {
          taskPresent: visibleText.some(t => t.includes('Task')),
          eventsPresent: visibleText.some(t => t.includes('event')),
          agentsPresent: visibleText.some(t => 
            t.includes('Agent') || 
            t.includes('Orchestrator')
          ),
          contextPresent: visibleText.some(t => t.includes('context')),
          reasoningPresent: visibleText.some(t => t.includes('reasoning'))
        },
        textSnippets: visibleText.filter(t => 
          t.includes('Task') || 
          t.includes('Agent') || 
          t.includes('Orchestrator') ||
          t.includes('Real')
        ).slice(0, 10)
      };
    });
    
    await fs.writeFile(
      path.join(testDir, 'final-state.json'),
      JSON.stringify(finalState, null, 2)
    );
    
    await page.screenshot({ 
      path: path.join(testDir, '09-final-state.png'),
      fullPage: true 
    });
    console.log('   📸 Screenshot: Final state captured');
    
    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('✅ TEST COMPLETE: Real-Time Agent Visualizer');
    console.log('=' .repeat(60));
    
    console.log('\n🎯 Key Findings:');
    console.log(`   📍 URL: ${finalState.url}`);
    console.log(`   📑 Active Tab: ${finalState.activeTab || 'Unknown'}`);
    console.log(`   🔴 Real-Time Data: ${finalState.hasRealTimeData ? 'YES' : 'NO'}`);
    
    console.log('\n📊 Data Indicators:');
    Object.entries(finalState.dataIndicators).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
    });
    
    if (finalState.textSnippets.length > 0) {
      console.log('\n📝 Relevant Text Found:');
      finalState.textSnippets.forEach(text => {
        console.log(`   - "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
      });
    }
    
    console.log('\n📁 Artifacts saved to:', testDir);
    console.log('   - Screenshots: 9 files');
    console.log('   - State JSON: final-state.json');
    
    // Determine if using real or mock data
    const isRealData = dataAnalysis.hasRealTask && 
                       dataAnalysis.hasTimestamps && 
                       dataAnalysis.hasDatabase;
    
    console.log('\n🔍 DATA SOURCE VERDICT:');
    if (isRealData) {
      console.log('   ✅ USING REAL DATA - Connected to actual database');
      console.log('   ✅ Live task orchestration visible');
      console.log('   ✅ Real-time updates configured');
    } else {
      console.log('   ⚠️  MIXED DATA SOURCE');
      console.log('   - Some real-time components detected');
      console.log('   - May need to create task first');
      console.log('   - Check "Start New Onboarding" button');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ 
      path: path.join(testDir, 'error-state.png'),
      fullPage: true 
    });
    
    // Get page content for debugging
    const pageContent = await page.evaluate(() => document.body.innerText);
    await fs.writeFile(
      path.join(testDir, 'error-content.txt'),
      pageContent
    );
  } finally {
    await sleep(3000); // Keep browser open briefly to observe
    await browser.close();
    console.log('\n🏁 Browser closed');
  }
}

// Run the test
testRealTimeVisualizer().catch(console.error);