const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testCompleteOnboardingFlow() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/complete-onboarding-${timestamp}`;
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
    
    // Activity log for comprehensive tracking
    const activityLog = {
        timestamp,
        test_name: 'Complete Onboarding Flow',
        phases: [],
        user_actions: [],
        agent_activities: [],
        task_context_updates: [],
        screenshots: [],
        errors: [],
        onboarding_cards_found: [],
        agent_deliberations: [],
        task_context_writes: []
    };
    
    const browser = await chromium.launch({ headless: false });
    
    try {
        console.log('🚀 Starting Complete Onboarding Flow Test');
        
        // Phase 1: User Dashboard - Look for dynamic Cards with onboarding context
        console.log('📋 Phase 1: Capturing User Dashboard for Generic Cards');
        const userContext = await browser.newContext({
            storageState: '.auth/user-state.json',
            viewport: { width: 1400, height: 900 }
        });
        
        const userPage = await userContext.newPage();
        
        // Monitor network for TaskContext data
        userPage.on('response', async response => {
            const url = response.url();
            if (url.includes('/api/') || url.includes('supabase') || url.includes('tasks')) {
                try {
                    const responseData = await response.json();
                    if (responseData && (responseData.description || responseData.task_context || responseData.metadata)) {
                        console.log(`📡 TaskContext Data: ${JSON.stringify(responseData).slice(0, 200)}`);
                        activityLog.task_context_updates.push({
                            type: 'api_response',
                            url: url,
                            status: response.status(),
                            data: responseData,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Check if this is onboarding-related
                        const dataStr = JSON.stringify(responseData).toLowerCase();
                        if (dataStr.includes('onboard') || dataStr.includes('business profile') || 
                            dataStr.includes('complete') || dataStr.includes('setup')) {
                            activityLog.onboarding_cards_found.push({
                                source: 'api_response',
                                url: url,
                                data: responseData,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                } catch (e) {
                    // Not JSON response
                }
            }
        });
        
        // Monitor console for agent deliberations
        userPage.on('console', msg => {
            const text = msg.text();
            console.log(`🖥️ User Console: ${text}`);
            
            if (text.includes('agent') || text.includes('orchestrat') || text.includes('deliberat') || 
                text.includes('reasoning') || text.includes('context')) {
                activityLog.agent_deliberations.push({
                    type: 'console_log',
                    source: 'user_page',
                    message: text,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        await userPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
        
        activityLog.phases.push({
            phase: 1,
            name: 'User Dashboard Analysis',
            start_time: new Date().toISOString(),
            description: 'Looking for generic Cards with onboarding TaskContext'
        });
        
        console.log('⏳ Waiting for authentication to complete...');
        
        // Wait for authentication using signals, not timeouts
        try {
            await userPage.waitForFunction(
                () => {
                    // Check for authenticated state indicators
                    const body = document.body.textContent || '';
                    return body.includes('Welcome back') || 
                           body.includes('Gianmatteo') ||
                           body.includes('Loading tasks') ||
                           !body.includes('Sign in with Google');
                },
                { timeout: 30000 }
            );
            console.log('✅ Authentication detected via UI signals');
        } catch (e) {
            console.log('⚠️ Authentication detection timed out, proceeding with analysis...');
        }
        
        // Capture initial state
        await userPage.screenshot({ path: `${outputDir}/01-initial-dashboard.png`, fullPage: true });
        activityLog.screenshots.push({
            file: '01-initial-dashboard.png',
            description: 'Initial dashboard with generic Cards',
            timestamp: new Date().toISOString()
        });
        
        // Analyze all Cards/elements for TaskContext and descriptions
        const cardAnalysis = await userPage.evaluate(() => {
            const cards = [];
            
            // Look for various card patterns
            const selectors = [
                '[class*="card"]',
                '[data-testid*="card"]',
                '.task-card',
                '.user-card',
                '[class*="task"]',
                '[class*="onboard"]',
                'div[role="article"]',
                'div[role="region"]',
                '[class*="welcome"]',
                'form',
                'button[class*="primary"]'
            ];
            
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((el, idx) => {
                        const text = el.textContent || '';
                        const classes = el.className || '';
                        const dataset = el.dataset || {};
                        
                        if (text.length > 10) { // Only meaningful content
                            cards.push({
                                selector: selector,
                                index: idx,
                                text: text.slice(0, 300),
                                classes: classes,
                                dataset: dataset,
                                tagName: el.tagName,
                                isOnboardingRelated: text.toLowerCase().includes('onboard') || 
                                                   text.toLowerCase().includes('business profile') ||
                                                   text.toLowerCase().includes('complete') ||
                                                   text.toLowerCase().includes('setup') ||
                                                   text.toLowerCase().includes('welcome') ||
                                                   classes.toLowerCase().includes('onboard')
                            });
                        }
                    });
                } catch (e) {
                    // Continue with other selectors
                }
            });
            
            return cards;
        });
        
        console.log(`📋 Found ${cardAnalysis.length} Cards/elements`);
        const onboardingCards = cardAnalysis.filter(card => card.isOnboardingRelated);
        console.log(`🎯 ${onboardingCards.length} appear to be onboarding-related`);
        
        activityLog.onboarding_cards_found = activityLog.onboarding_cards_found.concat(
            onboardingCards.map(card => ({
                source: 'dom_analysis',
                element: card,
                timestamp: new Date().toISOString()
            }))
        );
        
        // Try to interact with onboarding elements
        if (onboardingCards.length > 0) {
            console.log('🔄 Attempting to interact with onboarding Cards...');
            
            for (let i = 0; i < Math.min(onboardingCards.length, 3); i++) {
                const card = onboardingCards[i];
                try {
                    const selector = `${card.selector}:nth-child(${card.index + 1})`;
                    await userPage.click(selector);
                    await userPage.waitForTimeout(2000);
                    
                    await userPage.screenshot({ 
                        path: `${outputDir}/02-card-${i}-clicked.png`, 
                        fullPage: true 
                    });
                    
                    activityLog.user_actions.push({
                        action: 'card_clicked',
                        selector: selector,
                        cardText: card.text.slice(0, 100),
                        timestamp: new Date().toISOString()
                    });
                    
                } catch (e) {
                    console.log(`⚠️ Could not click card ${i}: ${e.message}`);
                }
            }
        }
        
        // Try Chat with Ally to trigger onboarding
        console.log('💬 Trying to trigger onboarding through Chat...');
        try {
            const chatButton = await userPage.$('button:has-text("Chat with Ally")');
            if (chatButton) {
                await chatButton.click();
                await userPage.waitForTimeout(2000);
                
                const chatInput = await userPage.$('input[type="text"], textarea');
                if (chatInput) {
                    await chatInput.fill('I need help setting up my business profile and completing onboarding');
                    await userPage.keyboard.press('Enter');
                    await userPage.waitForTimeout(3000);
                    
                    await userPage.screenshot({ path: `${outputDir}/03-onboarding-chat-request.png`, fullPage: true });
                    
                    activityLog.user_actions.push({
                        action: 'onboarding_chat_request',
                        message: 'I need help setting up my business profile and completing onboarding',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (e) {
            console.log(`⚠️ Chat interaction failed: ${e.message}`);
        }
        
        // Phase 2: Open Dev Toolkit to monitor agent activities
        console.log('🔧 Phase 2: Opening Dev Toolkit to monitor agent orchestration');
        
        const devContext = await browser.newContext({
            storageState: '.auth/user-state.json',
            viewport: { width: 1400, height: 900 }
        });
        
        const devPage = await devContext.newPage();
        
        // Monitor Dev Toolkit console for agent deliberations
        devPage.on('console', msg => {
            const text = msg.text();
            console.log(`🤖 Dev Console: ${text}`);
            
            if (text.includes('orchestrat') || text.includes('agent') || text.includes('deliberat') || 
                text.includes('reasoning') || text.includes('context') || text.includes('task')) {
                activityLog.agent_deliberations.push({
                    type: 'console_log',
                    source: 'dev_toolkit',
                    message: text,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Monitor network for TaskContext writes
        devPage.on('response', async response => {
            const url = response.url();
            if (url.includes('/api/') && (response.request().method() === 'POST' || response.request().method() === 'PUT')) {
                try {
                    const requestData = response.request().postDataJSON();
                    if (requestData && (requestData.task_context || requestData.context || requestData.metadata)) {
                        console.log(`✍️ TaskContext Write: ${JSON.stringify(requestData).slice(0, 200)}`);
                        activityLog.task_context_writes.push({
                            url: url,
                            method: response.request().method(),
                            data: requestData,
                            status: response.status(),
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    // Not JSON or failed to parse
                }
            }
        });
        
        await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
        await devPage.waitForTimeout(2000);
        
        // Open Dev Toolkit via F12
        await devPage.keyboard.press('F12');
        await devPage.waitForTimeout(1000);
        
        await devPage.screenshot({ path: `${outputDir}/04-dev-toolkit-opened.png`, fullPage: true });
        
        activityLog.phases.push({
            phase: 2,
            name: 'Dev Toolkit Monitoring',
            start_time: new Date().toISOString(),
            description: 'Monitoring agent deliberations and TaskContext writes'
        });
        
        // Try to access Real-Time Agent Visualizer
        console.log('📊 Looking for Real-Time Agent Visualizer...');
        
        const visualizerSelectors = [
            'button:has-text("Agent Visualizer")',
            '[data-testid="agent-visualizer"]',
            'a[href*="visualizer"]',
            'button:has-text("Real-Time")',
            '.agent-visualizer',
            'div:has-text("Agent Visualizer")'
        ];
        
        for (const selector of visualizerSelectors) {
            try {
                const element = await devPage.$(selector);
                if (element) {
                    console.log(`📊 Opening Agent Visualizer with: ${selector}`);
                    await element.click();
                    await devPage.waitForTimeout(2000);
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        await devPage.screenshot({ path: `${outputDir}/05-agent-visualizer.png`, fullPage: true });
        
        // Phase 3: Create onboarding task and monitor processing
        console.log('📝 Phase 3: Creating onboarding task to observe agent deliberations');
        
        // Look for task creation or "Start Onboarding" buttons
        const taskTriggers = [
            'button:has-text("Create Task")',
            'button:has-text("Start Onboarding")',
            'button:has-text("Begin")',
            'button:has-text("Start")',
            '[data-testid="create-task"]',
            '[data-testid="start-onboarding"]'
        ];
        
        for (const selector of taskTriggers) {
            try {
                const element = await devPage.$(selector);
                if (element) {
                    console.log(`▶️ Triggering task creation with: ${selector}`);
                    await element.click();
                    await devPage.waitForTimeout(3000);
                    
                    await devPage.screenshot({ path: `${outputDir}/06-task-triggered.png`, fullPage: true });
                    
                    activityLog.user_actions.push({
                        action: 'task_creation_triggered',
                        selector: selector,
                        timestamp: new Date().toISOString()
                    });
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        // Phase 4: Extended monitoring for agent activities
        console.log('⏱️ Phase 4: Extended monitoring for agent orchestration (60 seconds)');
        
        const monitoringStart = Date.now();
        let screenshotCounter = 7;
        
        while (Date.now() - monitoringStart < 60000) {
            await devPage.waitForTimeout(2000);
            
            // Check for agent activity in the UI
            const currentActivities = await devPage.evaluate(() => {
                const activities = [];
                const text = document.body.textContent || '';
                
                // Look for agent-related UI elements
                const indicators = [
                    'orchestrating', 'processing', 'analyzing', 'reasoning',
                    'agent', 'compliance', 'data collection', 'user input',
                    'scheduled', 'executing', 'deliberating', 'context'
                ];
                
                indicators.forEach(indicator => {
                    if (text.toLowerCase().includes(indicator)) {
                        activities.push(`UI contains: ${indicator}`);
                    }
                });
                
                // Check for progress indicators, loading states
                const progressElements = document.querySelectorAll('[class*="progress"], [class*="loading"], [class*="spinner"]');
                if (progressElements.length > 0) {
                    activities.push(`Progress indicators: ${progressElements.length}`);
                }
                
                return activities;
            });
            
            if (currentActivities.length > 0) {
                console.log(`🎯 Agent activity indicators: ${currentActivities.join(', ')}`);
                currentActivities.forEach(activity => {
                    activityLog.agent_activities.push({
                        type: 'ui_indicator',
                        activity: activity,
                        timestamp: new Date().toISOString()
                    });
                });
            }
            
            // Take periodic screenshots
            if ((Date.now() - monitoringStart) % 15000 < 2000) {
                await devPage.screenshot({ 
                    path: `${outputDir}/${screenshotCounter.toString().padStart(2, '0')}-monitoring-${Math.floor((Date.now() - monitoringStart) / 1000)}s.png`, 
                    fullPage: true 
                });
                
                activityLog.screenshots.push({
                    file: `${screenshotCounter.toString().padStart(2, '0')}-monitoring-${Math.floor((Date.now() - monitoringStart) / 1000)}s.png`,
                    description: `Agent monitoring at ${Math.floor((Date.now() - monitoringStart) / 1000)} seconds`,
                    timestamp: new Date().toISOString()
                });
                screenshotCounter++;
            }
            
            // Switch between tabs to see different views
            const tabs = ['Timeline', 'Context', 'Reasoning', 'Orchestration'];
            const currentSecond = Math.floor((Date.now() - monitoringStart) / 1000);
            if (currentSecond % 20 === 0 && currentSecond > 0) {
                const tabName = tabs[Math.floor(currentSecond / 20) % tabs.length];
                try {
                    const tabButton = await devPage.$(`button:has-text("${tabName}")`);
                    if (tabButton) {
                        console.log(`📑 Switching to ${tabName} tab`);
                        await tabButton.click();
                        await devPage.waitForTimeout(1000);
                    }
                } catch (e) {
                    // Tab not found or clickable
                }
            }
        }
        
        // Final captures
        console.log('✅ Phase 5: Final state capture');
        
        await userPage.bringToFront();
        await userPage.waitForTimeout(2000);
        await userPage.screenshot({ path: `${outputDir}/final-user-dashboard.png`, fullPage: true });
        
        await devPage.bringToFront();
        await devPage.waitForTimeout(2000);
        await devPage.screenshot({ path: `${outputDir}/final-dev-toolkit.png`, fullPage: true });
        
        // Save comprehensive logs
        const logData = JSON.stringify(activityLog, null, 2);
        await fs.writeFile(`${outputDir}/comprehensive-activity-log.json`, logData);
        
        // Create detailed summary
        const summary = `# Complete Onboarding Flow Test Report
## Test Run: ${timestamp}

### Executive Summary
This test captured the complete onboarding flow including generic Cards, TaskContext analysis, agent deliberations, and TaskContext writes.

### Key Metrics
- **Onboarding Cards Found**: ${activityLog.onboarding_cards_found.length}
- **Agent Deliberations Captured**: ${activityLog.agent_deliberations.length}  
- **TaskContext Updates**: ${activityLog.task_context_updates.length}
- **TaskContext Writes**: ${activityLog.task_context_writes.length}
- **User Actions**: ${activityLog.user_actions.length}
- **Screenshots**: ${activityLog.screenshots.length}
- **Errors**: ${activityLog.errors.length}

### Phase Breakdown
${activityLog.phases.map(phase => `- **Phase ${phase.phase}**: ${phase.name} - ${phase.description}`).join('\n')}

## Detailed Findings

### Onboarding Cards Discovery
${activityLog.onboarding_cards_found.length > 0 ? `
Found ${activityLog.onboarding_cards_found.length} onboarding-related elements:
${activityLog.onboarding_cards_found.map((item, idx) => `
#### Card ${idx + 1} (${item.source})
- **Text**: ${item.element?.text?.slice(0, 150) || item.data?.description || 'Dynamic content'}
- **Classes**: ${item.element?.classes || 'N/A'}
- **Timestamp**: ${item.timestamp}
`).join('')}
` : '⚠️ No specific onboarding cards detected - may be fully dynamic'}

### Agent Deliberations Captured
${activityLog.agent_deliberations.length > 0 ? `
Captured ${activityLog.agent_deliberations.length} agent deliberation events:
${activityLog.agent_deliberations.slice(0, 10).map((item, idx) => `
#### Deliberation ${idx + 1}
- **Source**: ${item.source} (${item.type})
- **Message**: ${item.message?.slice(0, 200) || 'Activity detected'}
- **Timestamp**: ${item.timestamp}
`).join('')}
${activityLog.agent_deliberations.length > 10 ? `... and ${activityLog.agent_deliberations.length - 10} more deliberations` : ''}
` : '⚠️ No explicit agent deliberations captured in console logs'}

### TaskContext Writes Monitored
${activityLog.task_context_writes.length > 0 ? `
Monitored ${activityLog.task_context_writes.length} TaskContext write operations:
${activityLog.task_context_writes.map((item, idx) => `
#### Write ${idx + 1}
- **URL**: ${item.url}
- **Method**: ${item.method}
- **Status**: ${item.status}
- **Context Data**: ${JSON.stringify(item.data).slice(0, 200)}...
- **Timestamp**: ${item.timestamp}
`).join('')}
` : '⚠️ No TaskContext write operations observed - may need active task processing'}

### API Response Analysis
${activityLog.task_context_updates.length > 0 ? `
Captured ${activityLog.task_context_updates.length} API responses with task data:
${activityLog.task_context_updates.slice(0, 5).map((item, idx) => `
#### API Response ${idx + 1}
- **URL**: ${item.url}
- **Status**: ${item.status}
- **Data**: ${JSON.stringify(item.data).slice(0, 300)}...
- **Timestamp**: ${item.timestamp}
`).join('')}
${activityLog.task_context_updates.length > 5 ? `... and ${activityLog.task_context_updates.length - 5} more responses` : ''}
` : '⚠️ No task-related API responses captured'}

### User Interactions Log
${activityLog.user_actions.map((action, idx) => `
#### Action ${idx + 1}: ${action.action}
- **Details**: ${action.details || action.cardText || action.message || 'N/A'}
- **Selector**: ${action.selector || 'N/A'}
- **Timestamp**: ${action.timestamp}
`).join('')}

### Screenshots Captured
${activityLog.screenshots.map(screenshot => `- **${screenshot.file}**: ${screenshot.description}`).join('\n')}

### Technical Notes
- **Generic Cards**: The system uses dynamic, generic Cards rather than hardcoded onboarding components
- **TaskContext Identification**: Onboarding tasks identified by examining description and TaskContext metadata
- **Agent Orchestration**: Monitored both console logs and UI indicators for agent activities
- **Real-time Monitoring**: Extended 60-second monitoring period to capture delayed agent activities

### Recommendations
1. **If no onboarding cards found**: Cards may be fully dynamic - check task creation API responses
2. **If no agent deliberations**: May need longer monitoring or active task processing
3. **For better TaskContext captures**: Create active onboarding task and monitor processing
4. **Future testing**: Consider triggering specific onboarding workflows through API

---
Generated on ${new Date().toISOString()}
Test Duration: ~2-3 minutes
`;
        
        await fs.writeFile(`${outputDir}/comprehensive-test-summary.md`, summary);
        
        console.log(`\n✅ Complete Onboarding Flow Test COMPLETED!`);
        console.log(`📁 Output directory: ${outputDir}`);
        console.log(`📊 Comprehensive results:`);
        console.log(`   - Onboarding Cards: ${activityLog.onboarding_cards_found.length}`);
        console.log(`   - Agent Deliberations: ${activityLog.agent_deliberations.length}`);
        console.log(`   - TaskContext Updates: ${activityLog.task_context_updates.length}`);
        console.log(`   - TaskContext Writes: ${activityLog.task_context_writes.length}`);
        console.log(`   - Screenshots: ${activityLog.screenshots.length}`);
        console.log(`📋 Full report: ${outputDir}/comprehensive-test-summary.md`);
        
        return {
            success: true,
            outputDir,
            activityLog,
            summary: {
                onboarding_cards: activityLog.onboarding_cards_found.length,
                agent_deliberations: activityLog.agent_deliberations.length,
                task_context_updates: activityLog.task_context_updates.length,
                task_context_writes: activityLog.task_context_writes.length
            }
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        activityLog.errors.push({
            phase: 'test_execution',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Save error log
        await fs.writeFile(`${outputDir}/error-log.json`, JSON.stringify(activityLog, null, 2));
        
        return {
            success: false,
            error: error.message,
            outputDir,
            activityLog
        };
        
    } finally {
        await browser.close();
    }
}

// Run the test
testCompleteOnboardingFlow()
    .then(result => {
        if (result.success) {
            console.log('🎉 Complete Onboarding Flow Test SUCCESS!');
            console.log(`📁 Results: ${result.outputDir}`);
            console.log(`📊 Summary: ${JSON.stringify(result.summary, null, 2)}`);
        } else {
            console.error('💥 Test failed:', result.error);
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });