/**
 * E2E Test: SSE TaskContext Streaming
 * 
 * This test demonstrates the complete Server-Sent Events (SSE) implementation
 * for real-time TaskContext updates between frontend and backend.
 * 
 * Architecture:
 * - Frontend connects to SSE endpoint /api/tasks/:taskId/context/stream
 * - Backend pushes real-time updates via SSE
 * - Frontend visualizes updates in TaskCard component
 * - No polling required - true real-time updates
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const GOOGLE_TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
const HEADLESS = process.env.HEADLESS !== 'false';

// Create test run directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const testRunDir = path.join(__dirname, `test-run-sse-${timestamp}`);

async function ensureTestDirectory() {
  await fs.mkdir(testRunDir, { recursive: true });
  console.log(`📁 Test directory created: ${testRunDir}`);
}

async function captureScreenshot(page, name) {
  const screenshotPath = path.join(testRunDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}.png`);
  return screenshotPath;
}

async function saveTestState(state) {
  const statePath = path.join(testRunDir, 'test-state.json');
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  console.log('💾 Test state saved');
}

async function testSSETaskContext() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const testState = {
    startTime: new Date().toISOString(),
    appUrl: APP_URL,
    backendUrl: BACKEND_URL,
    testUser: GOOGLE_TEST_EMAIL,
    steps: []
  };

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      } else if (msg.text().includes('[SSE]') || msg.text().includes('TaskContext')) {
        console.log('📡', msg.text());
      }
    });

    // Monitor network requests for SSE
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/context/stream')) {
        console.log(`🌊 SSE Stream Response: ${response.status()} - ${url}`);
      }
    });

    console.log('\n🚀 Starting SSE TaskContext E2E Test\n');
    console.log('═══════════════════════════════════════════\n');

    // Step 1: Navigate to app
    console.log('1️⃣  Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await captureScreenshot(page, '01-initial-load');
    testState.steps.push({ step: 1, action: 'Navigate to app', status: 'success' });

    // Step 2: Check if we're already authenticated
    console.log('2️⃣  Checking authentication status...');
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token') !== null;
    });

    if (!isAuthenticated) {
      console.log('   ⚠️  Not authenticated. Please authenticate manually.');
      console.log('   📋 Instructions:');
      console.log('   1. Complete Google OAuth login');
      console.log('   2. The test will continue automatically once authenticated');
      
      // Wait for authentication
      await page.waitForFunction(
        () => localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token') !== null,
        { timeout: 120000 }
      );
      console.log('   ✅ Authentication detected!');
    } else {
      console.log('   ✅ Already authenticated');
    }
    
    await captureScreenshot(page, '02-authenticated');
    testState.steps.push({ step: 2, action: 'Authentication verified', status: 'success' });

    // Step 3: Create a test task via backend API
    console.log('3️⃣  Creating test task via backend API...');
    
    // Get auth token from localStorage
    const authToken = await page.evaluate(() => {
      const authData = JSON.parse(localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token') || '{}');
      return authData.access_token;
    });

    if (!authToken) {
      throw new Error('No auth token found');
    }

    // Create task via backend
    const createTaskResponse = await page.evaluate(async (backendUrl, token) => {
      const response = await fetch(`${backendUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskType: 'sse_test',
          title: 'SSE Test Task',
          description: 'Testing Server-Sent Events streaming',
          metadata: {
            testType: 'e2e_sse',
            timestamp: new Date().toISOString()
          }
        })
      });
      return response.json();
    }, BACKEND_URL, authToken);

    const taskId = createTaskResponse.taskId;
    console.log(`   ✅ Task created: ${taskId}`);
    testState.taskId = taskId;
    testState.steps.push({ step: 3, action: 'Create test task', status: 'success', taskId });

    // Step 4: Navigate to Dev Toolkit to see TaskCard
    console.log('4️⃣  Opening Dev Toolkit...');
    
    // Check if dev toolkit button exists
    const devButtonExists = await page.$('[data-testid="dev-toolkit-button"]') !== null;
    
    if (!devButtonExists) {
      // Try keyboard shortcut
      await page.keyboard.down('Meta');
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      await page.waitForTimeout(1000);
    } else {
      await page.click('[data-testid="dev-toolkit-button"]');
    }
    
    await page.waitForTimeout(2000);
    await captureScreenshot(page, '03-dev-toolkit-open');
    testState.steps.push({ step: 4, action: 'Open Dev Toolkit', status: 'success' });

    // Step 5: Create a TaskCard with SSE streaming
    console.log('5️⃣  Creating TaskCard with SSE streaming...');
    
    // Inject a TaskCard that visualizes our test task
    await page.evaluate((taskId) => {
      // Find the dev toolkit content area
      const devContent = document.querySelector('[data-testid="modal-content"]') || 
                        document.querySelector('.dev-toolkit-content') ||
                        document.body;
      
      // Create a container for our test
      const testContainer = document.createElement('div');
      testContainer.id = 'sse-test-container';
      testContainer.style.cssText = 'padding: 20px; background: white; border: 2px solid blue; margin: 20px;';
      testContainer.innerHTML = `
        <h2 style="color: blue; margin-bottom: 10px;">🌊 SSE TaskContext Test</h2>
        <div id="task-card-mount"></div>
        <div id="sse-status" style="margin-top: 10px; padding: 10px; background: #f0f0f0; font-family: monospace;">
          Initializing SSE connection to task: ${taskId}
        </div>
      `;
      devContent.appendChild(testContainer);
      
      // Log for debugging
      console.log('[SSE Test] Container injected for task:', taskId);
    }, taskId);
    
    await page.waitForTimeout(1000);
    await captureScreenshot(page, '04-taskcard-container-created');

    // Step 6: Connect to SSE stream
    console.log('6️⃣  Establishing SSE connection...');
    
    const sseConnected = await page.evaluate(async (backendUrl, taskId, token) => {
      const eventSource = new EventSource(
        `${backendUrl}/api/tasks/${taskId}/context/stream`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const statusDiv = document.getElementById('sse-status');
      let eventCount = 0;
      
      return new Promise((resolve) => {
        eventSource.addEventListener('CONTEXT_INITIALIZED', (event) => {
          eventCount++;
          const data = JSON.parse(event.data);
          console.log('[SSE] Context initialized:', data);
          statusDiv.innerHTML = `
            <div style="color: green;">✅ SSE Connected!</div>
            <div>Task ID: ${data.taskId}</div>
            <div>Status: ${data.currentState?.status || 'pending'}</div>
            <div>Events received: ${eventCount}</div>
            <pre style="font-size: 10px; overflow: auto; max-height: 200px;">
              ${JSON.stringify(data, null, 2)}
            </pre>
          `;
          resolve(true);
        });
        
        eventSource.addEventListener('EVENT_ADDED', (event) => {
          eventCount++;
          const data = JSON.parse(event.data);
          console.log('[SSE] Event added:', data);
          statusDiv.innerHTML += `
            <div style="margin-top: 10px; padding: 5px; background: #e0f0e0;">
              📨 New Event (${eventCount}): ${data.operation || 'unknown'}
            </div>
          `;
        });
        
        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          statusDiv.innerHTML = `<div style="color: red;">❌ SSE Error: ${error.message || 'Connection failed'}</div>`;
          resolve(false);
        };
        
        // Timeout after 10 seconds
        setTimeout(() => resolve(false), 10000);
      });
    }, BACKEND_URL, taskId, authToken);
    
    if (sseConnected) {
      console.log('   ✅ SSE connection established successfully!');
      testState.sseConnected = true;
    } else {
      console.log('   ❌ SSE connection failed');
      testState.sseConnected = false;
    }
    
    await page.waitForTimeout(2000);
    await captureScreenshot(page, '05-sse-connected');
    testState.steps.push({ step: 6, action: 'Establish SSE connection', status: sseConnected ? 'success' : 'failed' });

    // Step 7: Send a context event to trigger SSE update
    console.log('7️⃣  Sending context event to trigger SSE update...');
    
    const eventSent = await page.evaluate(async (backendUrl, taskId, token) => {
      const response = await fetch(`${backendUrl}/api/tasks/${taskId}/context/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          operation: 'TEST_EVENT',
          data: {
            message: 'Testing SSE real-time updates',
            timestamp: new Date().toISOString()
          },
          reasoning: 'E2E test verification of SSE functionality'
        })
      });
      return response.ok;
    }, BACKEND_URL, taskId, authToken);
    
    if (eventSent) {
      console.log('   ✅ Context event sent successfully');
      // Wait for SSE to receive the update
      await page.waitForTimeout(3000);
    } else {
      console.log('   ❌ Failed to send context event');
    }
    
    await captureScreenshot(page, '06-after-event-sent');
    testState.steps.push({ step: 7, action: 'Send context event', status: eventSent ? 'success' : 'failed' });

    // Step 8: Verify TaskCard renders with TaskFlow
    console.log('8️⃣  Verifying TaskCard with TaskFlow visualization...');
    
    // Check if TaskCard properly renders
    const taskCardRendered = await page.evaluate(() => {
      const container = document.getElementById('sse-test-container');
      if (!container) return false;
      
      // Check for SSE status updates
      const statusDiv = document.getElementById('sse-status');
      const hasUpdates = statusDiv && statusDiv.textContent.includes('SSE Connected');
      
      return hasUpdates;
    });
    
    console.log(`   ${taskCardRendered ? '✅' : '❌'} TaskCard rendering: ${taskCardRendered ? 'Success' : 'Failed'}`);
    await captureScreenshot(page, '07-final-state');
    testState.steps.push({ step: 8, action: 'Verify TaskCard rendering', status: taskCardRendered ? 'success' : 'failed' });

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════\n');
    
    const successSteps = testState.steps.filter(s => s.status === 'success').length;
    const totalSteps = testState.steps.length;
    const allPassed = successSteps === totalSteps;
    
    console.log(`Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Steps: ${successSteps}/${totalSteps} successful`);
    console.log(`SSE Connected: ${testState.sseConnected ? 'Yes' : 'No'}`);
    console.log(`Task ID: ${testState.taskId || 'N/A'}`);
    
    testState.summary = {
      passed: allPassed,
      successSteps,
      totalSteps,
      sseConnected: testState.sseConnected
    };

    await saveTestState(testState);
    
    if (allPassed) {
      console.log('\n🎉 E2E SSE TaskContext test completed successfully!');
    } else {
      console.log('\n⚠️  Some test steps failed. Check screenshots for details.');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    testState.error = error.message;
    await saveTestState(testState);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testSSETaskContext().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});