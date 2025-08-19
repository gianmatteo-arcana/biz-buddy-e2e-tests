/**
 * E2E Demo: QA Engineer Using Enhanced Agent Visualizer
 * 
 * User Story: "As a QA Engineer, I want to investigate a stuck onboarding task
 * to understand what went wrong and create a test case for regression testing"
 * 
 * This demo showcases:
 * - Task selection and loading
 * - Timeline visualization with agent swimlanes
 * - Context evolution tracking
 * - Agent reasoning and confidence analysis
 * - Test case generation
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  appUrl: 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com',
  devToolkitPath: '/dev-toolkit-standalone',
  screenshotDir: `qa-visualizer-demo-${Date.now()}`,
  testEmail: process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com'
};

async function setupDemo() {
  await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
  console.log(`📸 Screenshots will be saved to: ${CONFIG.screenshotDir}`);
}

async function captureAnnotatedScreenshot(page, filename, description, annotations = []) {
  const filepath = path.join(CONFIG.screenshotDir, `${filename}.png`);
  
  // Add visual annotations if provided
  if (annotations.length > 0) {
    await page.evaluate((annotations) => {
      annotations.forEach(ann => {
        const element = document.querySelector(ann.selector);
        if (element) {
          element.style.border = '3px solid red';
          element.style.boxShadow = '0 0 10px rgba(255,0,0,0.5)';
          
          // Add annotation label
          const label = document.createElement('div');
          label.textContent = ann.label;
          label.style.cssText = `
            position: absolute;
            background: red;
            color: white;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 4px;
            z-index: 10000;
          `;
          element.parentElement.appendChild(label);
          const rect = element.getBoundingClientRect();
          label.style.left = rect.left + 'px';
          label.style.top = (rect.top - 30) + 'px';
        }
      });
    }, annotations);
  }
  
  await page.screenshot({ 
    path: filepath, 
    fullPage: true,
    captureBeyondViewport: true 
  });
  
  // Remove annotations
  if (annotations.length > 0) {
    await page.evaluate(() => {
      document.querySelectorAll('[style*="border: 3px solid red"]').forEach(el => {
        el.style.border = '';
        el.style.boxShadow = '';
      });
    });
  }
  
  // Save description
  const mdPath = path.join(CONFIG.screenshotDir, `${filename}.md`);
  await fs.writeFile(mdPath, `# ${filename}\n\n${description}\n\nTimestamp: ${new Date().toISOString()}`);
  
  console.log(`✅ Captured: ${filename}`);
  return filepath;
}

async function runQAVisualizerDemo() {
  console.log('🎬 QA Engineer Agent Visualizer Demo');
  console.log('=' .repeat(50));
  
  await setupDemo();
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to Dev Toolkit
    console.log('\n📍 Step 1: Navigating to Dev Toolkit...');
    await page.goto(`${CONFIG.appUrl}${CONFIG.devToolkitPath}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForSelector('[role="tab"]', { timeout: 10000 });
    
    await captureAnnotatedScreenshot(page, '01-dev-toolkit-home',
      'Dev Toolkit Home - QA Engineer View\n\n' +
      '- Multiple tabs for different debugging tools\n' +
      '- Agent Visualizer tab is selected by default\n' +
      '- Shows available tools for QA analysis'
    );
    
    // Step 2: View Agent Visualizer with Demo Data
    console.log('\n📍 Step 2: Viewing Agent Visualizer...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await captureAnnotatedScreenshot(page, '02-agent-visualizer-initial',
      'Enhanced Agent Visualizer - Initial View\n\n' +
      '- Demo task loaded automatically\n' +
      '- Timeline tab shows task lifecycle\n' +
      '- Task selector dropdown for choosing different tasks\n' +
      '- Export Test button for generating test cases',
      []
    );
    
    // Step 3: Explore Timeline View
    console.log('\n📍 Step 3: Exploring Timeline with Swimlanes...');
    
    // Look for timeline elements
    await page.waitForSelector('.space-y-4', { timeout: 5000 });
    
    await captureAnnotatedScreenshot(page, '03-timeline-swimlanes',
      'Timeline View with Agent Swimlanes\n\n' +
      '- Horizontal timeline showing task progression\n' +
      '- Separate swimlanes for each agent type\n' +
      '- User actions, Orchestrator decisions, Data Agent requests\n' +
      '- Interactive nodes show events with tooltips\n' +
      '- Replay controls for stepping through the flow\n' +
      '- Total duration: ~20 seconds for complete onboarding'
    );
    
    // Step 4: Click on a Timeline Event
    console.log('\n📍 Step 4: Investigating Compliance Check Event...');
    
    // Try to find and click a timeline node
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const complianceNode = buttons.find(b => {
        const tooltip = b.getAttribute('aria-label') || '';
        return tooltip.includes('compliance') || tooltip.includes('Compliance');
      });
      if (complianceNode) complianceNode.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '04-event-details',
      'Event Details - Compliance Check\n\n' +
      '- Shows what happened at this point\n' +
      '- Confidence score: 70% (Medium)\n' +
      '- Duration: 1500ms\n' +
      '- Status: Success with warnings\n' +
      '- QA Insight: Lower confidence indicates potential issue'
    );
    
    // Step 5: Switch to Context Tab
    console.log('\n📍 Step 5: Viewing Context Evolution...');
    
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const contextTab = tabs.find(t => t.textContent.includes('Context'));
      if (contextTab) contextTab.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '05-context-diff',
      'Context Evolution Viewer\n\n' +
      '- Shows how TaskContext grows over time\n' +
      '- Green highlights: Fields added by agents\n' +
      '- Yellow highlights: Fields modified\n' +
      '- Snapshot timeline at top for navigation\n' +
      '- Can switch between Unified/Split/JSON views\n' +
      '- Current snapshot: After compliance check\n' +
      '- Shows business info and compliance results added'
    );
    
    // Step 6: View Agent Reasoning
    console.log('\n📍 Step 6: Analyzing Agent Reasoning...');
    
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const reasoningTab = tabs.find(t => t.textContent.includes('Reasoning'));
      if (reasoningTab) reasoningTab.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '06-agent-reasoning',
      'Agent Reasoning Cards\n\n' +
      '- Orchestrator: 95% confidence - Analyzed task requirements\n' +
      '- Data Agent: 85% confidence - Progressive disclosure strategy\n' +
      '- Compliance Agent: 70% confidence - EIN verification limited\n' +
      '- Shows WHY each decision was made\n' +
      '- Alternative paths that were considered\n' +
      '- Risk factors identified\n' +
      '- QA can see decision-making process clearly'
    );
    
    // Step 7: Expand Compliance Agent Card
    console.log('\n📍 Step 7: Deep Dive into Low Confidence Decision...');
    
    // Try to expand the compliance agent card
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.space-y-4 > div'));
      const complianceCard = cards.find(card => {
        const text = card.textContent || '';
        return text.includes('Compliance') || text.includes('70%');
      });
      if (complianceCard) {
        const expandButton = complianceCard.querySelector('button');
        if (expandButton) expandButton.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '07-compliance-details',
      'Compliance Agent Detailed Analysis\n\n' +
      '- Reasoning: "Cannot verify EIN with IRS database in demo mode"\n' +
      '- Confidence: 70% (Below threshold)\n' +
      '- Risks Identified:\n' +
      '  • Cannot verify EIN (Medium risk)\n' +
      '  • State registration unknown (High risk)\n' +
      '- Decision Factors:\n' +
      '  • Format Validation: Positive\n' +
      '  • External Verification: Negative\n' +
      '- QA Finding: Need test for low confidence scenarios'
    );
    
    // Step 8: Switch to Test Builder
    console.log('\n📍 Step 8: Building Test Case...');
    
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const testTab = tabs.find(t => t.textContent.includes('Test'));
      if (testTab) testTab.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '08-test-builder',
      'Test Case Builder\n\n' +
      '- Test Scenario: "Onboarding Flow - Stuck at Compliance"\n' +
      '- Identified Issue: Compliance confidence < 0.8\n' +
      '- Assertions:\n' +
      '  ✓ User authentication successful\n' +
      '  ✓ Business info collected\n' +
      '  ⚠ Compliance confidence < 0.8\n' +
      '  ✓ Task marked with warnings\n' +
      '- Generated test code ready for export\n' +
      '- Can be added to regression test suite'
    );
    
    // Step 9: Export Test Case
    console.log('\n📍 Step 9: Exporting Test Case...');
    
    // Click Export Test button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const exportButton = buttons.find(b => 
        b.textContent.includes('Export') && b.textContent.includes('Test')
      );
      if (exportButton) exportButton.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await captureAnnotatedScreenshot(page, '09-test-exported',
      'Test Case Exported\n\n' +
      '- JSON file downloaded with complete test scenario\n' +
      '- Includes all timeline events\n' +
      '- Context snapshots at each step\n' +
      '- Agent decisions and reasoning\n' +
      '- Ready for automation framework integration\n' +
      '- QA can reproduce exact scenario'
    );
    
    // Step 10: Timeline Replay
    console.log('\n📍 Step 10: Using Timeline Replay...');
    
    // Go back to timeline tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const timelineTab = tabs.find(t => t.textContent.includes('Timeline'));
      if (timelineTab) timelineTab.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click Replay button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const replayButton = buttons.find(b => b.textContent.includes('Replay'));
      if (replayButton) replayButton.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await captureAnnotatedScreenshot(page, '10-timeline-replay',
      'Timeline Replay in Action\n\n' +
      '- Red progress indicator shows current position\n' +
      '- Step 4/11 in the replay\n' +
      '- Can pause, skip, or adjust speed\n' +
      '- Helps QA understand exact sequence of events\n' +
      '- Perfect for demonstrating issues to developers\n' +
      '- Visual representation of task flow'
    );
    
    // Generate Summary Report
    const report = {
      timestamp: new Date().toISOString(),
      demo: 'QA Engineer Agent Visualizer',
      url: `${CONFIG.appUrl}${CONFIG.devToolkitPath}`,
      screenshots: 10,
      userStory: {
        role: 'QA Engineer',
        goal: 'Investigate stuck onboarding task',
        outcome: 'Identified low confidence compliance check and created test case'
      },
      findings: [
        'Compliance check confidence at 70% (below 80% threshold)',
        'Cannot verify EIN with external service in demo',
        'State registration status unknown',
        'Task completed with warnings'
      ],
      testCaseGenerated: {
        scenario: 'Onboarding with low confidence compliance',
        assertions: 4,
        coverage: 'Authentication, Business Info, Compliance Check'
      },
      features_demonstrated: [
        'Timeline visualization with agent swimlanes',
        'Context evolution tracking',
        'Agent reasoning and confidence scores',
        'Alternative path analysis',
        'Risk identification',
        'Test case generation',
        'Timeline replay for debugging',
        'Export functionality for test automation'
      ]
    };
    
    await fs.writeFile(
      path.join(CONFIG.screenshotDir, 'demo-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create README
    const readme = `# QA Engineer Agent Visualizer Demo

## Overview
This demo shows how a QA engineer uses the Enhanced Agent Visualizer to investigate a task that completed with warnings due to low confidence in the compliance check.

## User Story
**As a** QA Engineer  
**I want to** visualize how agents collaborate on tasks  
**So I can** identify issues and create regression tests  

## Key Findings

### Issue Identified
- **Problem**: Compliance check has only 70% confidence
- **Root Cause**: Cannot verify EIN with IRS database in demo mode
- **Impact**: Task completes but with warnings
- **Risk**: High - State registration status unknown

### Test Case Created
\`\`\`javascript
describe('Onboarding Compliance Check', () => {
  it('should flag low confidence compliance checks', async () => {
    const task = await createOnboardingTask();
    await completeOAuth(task.id, userData);
    await submitBusinessInfo(task.id, businessData);
    
    const compliance = await getComplianceStatus(task.id);
    expect(compliance.confidence).toBeLessThan(0.8);
    expect(task.warnings).toContain('State registration pending');
  });
});
\`\`\`

## Features Used

1. **Timeline View** - Visualized complete task flow across agents
2. **Context Diff** - Tracked how data evolved through the process
3. **Agent Reasoning** - Understood WHY decisions were made
4. **Risk Analysis** - Identified potential issues
5. **Test Builder** - Generated regression test automatically

## Screenshots

1. Dev Toolkit Home - Entry point for QA analysis
2. Agent Visualizer - Initial view with demo data
3. Timeline Swimlanes - Task flow visualization
4. Event Details - Investigating specific events
5. Context Evolution - Data changes over time
6. Agent Reasoning - Decision-making process
7. Compliance Details - Deep dive into low confidence
8. Test Builder - Creating regression tests
9. Test Export - Downloading for automation
10. Timeline Replay - Replaying the sequence

## Benefits for QA

- **Visual Understanding**: See exactly how tasks flow through agents
- **Root Cause Analysis**: Identify where and why issues occur
- **Test Generation**: Automatically create test cases from real scenarios
- **Regression Prevention**: Export tests for CI/CD integration
- **Team Communication**: Share visual evidence with developers

## Next Steps

1. Add this test case to regression suite
2. Create additional tests for edge cases
3. Monitor confidence scores in production
4. Set up alerts for low confidence decisions

---
Generated: ${new Date().toISOString()}
`;
    
    await fs.writeFile(path.join(CONFIG.screenshotDir, 'README.md'), readme);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ QA Visualizer Demo Complete!');
    console.log(`📁 Screenshots saved to: ${CONFIG.screenshotDir}`);
    console.log('📊 Key Finding: Compliance check confidence too low (70%)');
    console.log('🧪 Test case generated for regression testing');
    console.log('📖 Full documentation in README.md');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the demo
if (require.main === module) {
  runQAVisualizerDemo().catch(console.error);
}

module.exports = { runQAVisualizerDemo };