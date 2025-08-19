/**
 * Real Backend Integration E2E Test
 * 
 * This test creates a comprehensive end-to-end validation using:
 * - Real authenticated user (gianmatteo.allyn.test@gmail.com)
 * - Real database operations with unified schema
 * - All established APIs exercised
 * - Task lifecycle with context events
 * - UI request/response flow
 * - Agent state management via unified events
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  FRONTEND_URL: process.env.APP_URL || 'http://localhost:8081',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  TEST_EMAIL: process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com',
  HEADLESS: process.env.HEADLESS !== 'false',
  TIMEOUT: 120000,
  SCREENSHOT_DIR: `test-real-backend-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
};

class RealBackendIntegrationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.authToken = null;
    this.testResults = {
      authentication: false,
      backendHealth: false,
      taskCreation: false,
      contextEvents: false,
      uiFlow: false,
      agentState: false,
      taskLifecycle: false,
      businessOperations: false
    };
    this.createdData = [];
    this.screenshotCount = 0;
    
    // Create screenshot directory
    fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async screenshot(name, description = '') {
    try {
      this.screenshotCount++;
      const filename = `${String(this.screenshotCount).padStart(2, '0')}-${name}.png`;
      const filepath = path.join(CONFIG.SCREENSHOT_DIR, filename);
      
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      
      await this.log(`📸 Screenshot: ${filename} - ${description}`);
      return filename;
    } catch (error) {
      await this.log(`⚠️ Screenshot failed: ${error.message}`, 'error');
    }
  }

  async setupBrowser() {
    await this.log('🚀 Setting up browser and authentication...');
    
    this.browser = await chromium.launch({ 
      headless: CONFIG.HEADLESS,
      slowMo: 500 
    });
    
    const context = await this.browser.newContext({
      storageState: '.auth/user-state.json', // Use existing auth state
      viewport: { width: 1920, height: 1080 }
    });
    
    this.page = await context.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });
  }

  async extractAuthToken() {
    await this.log('🔑 Extracting authentication token...');
    
    try {
      // Navigate to the app to get authenticated state
      await this.page.goto(CONFIG.FRONTEND_URL);
      await this.page.waitForTimeout(3000);
      
      // Extract JWT token from localStorage
      const authData = await this.page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const authKey = keys.find(key => key.includes('supabase') && key.includes('auth'));
        if (authKey) {
          const authStr = localStorage.getItem(authKey);
          if (authStr) {
            const auth = JSON.parse(authStr);
            return auth?.currentSession?.access_token || null;
          }
        }
        return null;
      });

      if (authData) {
        this.authToken = authData;
        this.testResults.authentication = true;
        await this.log('✅ Authentication token extracted successfully', 'success');
        await this.screenshot('auth-token-extracted', 'Successfully extracted auth token');
        return true;
      } else {
        throw new Error('No authentication token found in localStorage');
      }
    } catch (error) {
      await this.log(`❌ Authentication extraction failed: ${error.message}`, 'error');
      await this.screenshot('auth-extraction-failed', 'Failed to extract auth token');
      return false;
    }
  }

  async makeBackendRequest(endpoint, options = {}) {
    const url = `${CONFIG.BACKEND_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      await this.log(`❌ Backend request failed: ${endpoint} - ${error.message}`, 'error');
      throw error;
    }
  }

  async testBackendHealth() {
    await this.log('🏥 Testing backend health and connectivity...');
    
    try {
      const health = await this.makeBackendRequest('/health');
      
      if (health && health.status === 'ok') {
        this.testResults.backendHealth = true;
        await this.log('✅ Backend is healthy and connected', 'success');
        return true;
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      await this.log(`❌ Backend health test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testTaskCreationWithUnifiedSchema() {
    await this.log('📋 Testing task creation with unified schema...');
    
    try {
      const taskData = {
        taskType: 'real_e2e_test',
        title: 'Real E2E Integration Test Task',
        description: 'Comprehensive test of unified schema with real authentication',
        priority: 'high',
        metadata: {
          testType: 'real_backend_integration',
          timestamp: new Date().toISOString(),
          userEmail: CONFIG.TEST_EMAIL,
          schemaVersion: 'unified_task_context_events'
        }
      };

      const task = await this.makeBackendRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });

      if (task && task.id) {
        this.testResults.taskCreation = true;
        this.createdData.push({ type: 'task', id: task.id, title: task.title });
        await this.log(`✅ Task created: ${task.id} - "${task.title}"`, 'success');
        
        // Take screenshot of successful task creation
        await this.screenshot('task-created-successfully', `Task ${task.id} created`);
        
        return task;
      } else {
        throw new Error('Task creation returned invalid response');
      }
    } catch (error) {
      await this.log(`❌ Task creation failed: ${error.message}`, 'error');
      await this.screenshot('task-creation-failed', 'Task creation failed');
      throw error;
    }
  }

  async testUnifiedContextEvents(taskId) {
    await this.log(`📊 Testing unified context events for task ${taskId}...`);
    
    try {
      // Get task context events from unified table
      const events = await this.makeBackendRequest(`/api/tasks/${taskId}/events`);
      
      if (Array.isArray(events) && events.length > 0) {
        this.testResults.contextEvents = true;
        await this.log(`✅ Context events retrieved: ${events.length} events`, 'success');
        
        // Log event details to verify unified schema structure
        events.forEach((event, index) => {
          this.log(`   Event ${index + 1}: ${event.operation} by ${event.actor_type}:${event.actor_id}`);
          this.log(`     Sequence: ${event.sequence_number}, Data keys: ${Object.keys(event.data || {}).join(', ')}`);
        });
        
        return events;
      } else {
        // Events might not exist yet for a new task - this could be normal
        await this.log('⚠️ No context events found (may be normal for new task)');
        return [];
      }
    } catch (error) {
      await this.log(`❌ Context events test failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testUIRequestResponseFlow(taskId) {
    await this.log(`🖥️ Testing UI request/response flow through unified schema...`);
    
    try {
      // Simulate UI request being created
      const uiRequest = {
        taskId: taskId,
        type: 'form_input',
        prompt: 'Please provide business information for E2E testing',
        fields: [
          { name: 'business_name', type: 'text', required: true, label: 'Business Name' },
          { name: 'business_type', type: 'select', required: true, label: 'Business Type', options: ['LLC', 'Corporation', 'Partnership'] },
          { name: 'industry', type: 'text', required: false, label: 'Industry' }
        ],
        metadata: {
          testScenario: 'ui_flow_test',
          unified_schema: true
        }
      };

      const response = await this.makeBackendRequest('/api/ui-requests', {
        method: 'POST',
        body: JSON.stringify(uiRequest)
      });

      if (response && response.id) {
        this.testResults.uiFlow = true;
        this.createdData.push({ type: 'ui_request', id: response.id });
        await this.log(`✅ UI request created: ${response.id}`, 'success');
        
        // Test UI response submission
        const uiResponse = {
          uiRequestId: response.id,
          taskId: taskId,
          formData: {
            business_name: 'E2E Test LLC',
            business_type: 'LLC',
            industry: 'Technology Testing'
          },
          metadata: {
            completed_via: 'e2e_test',
            completion_time: new Date().toISOString()
          }
        };

        const responseResult = await this.makeBackendRequest('/api/ui-responses', {
          method: 'POST',
          body: JSON.stringify(uiResponse)
        });

        if (responseResult) {
          await this.log('✅ UI response submitted successfully', 'success');
          return { request: response, response: responseResult };
        }
      } else {
        throw new Error('UI request creation failed');
      }
    } catch (error) {
      await this.log(`❌ UI flow test failed: ${error.message}`, 'error');
      // Don't throw - UI endpoints might not be implemented yet
      return null;
    }
  }

  async testAgentStateManagement(taskId) {
    await this.log(`🤖 Testing agent state management via unified events...`);
    
    try {
      // Simulate agent state updates being stored as context events
      const agentStates = [
        {
          taskId: taskId,
          agentType: 'compliance_agent',
          state: 'analyzing',
          data: {
            analysis_progress: 25,
            current_step: 'business_entity_validation',
            findings: ['LLC registration confirmed', 'EIN verification pending']
          },
          reasoning: 'Analyzing business entity compliance requirements'
        },
        {
          taskId: taskId,
          agentType: 'compliance_agent', 
          state: 'validation_complete',
          data: {
            analysis_progress: 100,
            current_step: 'final_recommendations',
            findings: ['LLC registration confirmed', 'EIN verified', 'State compliance current'],
            recommendations: ['Schedule annual report filing', 'Update registered agent address']
          },
          reasoning: 'Compliance analysis completed with recommendations'
        }
      ];

      let successCount = 0;
      for (const agentState of agentStates) {
        try {
          const result = await this.makeBackendRequest('/api/agent-states', {
            method: 'POST',
            body: JSON.stringify(agentState)
          });

          if (result) {
            successCount++;
            await this.log(`✅ Agent state ${agentState.state} recorded`, 'success');
          }
        } catch (error) {
          await this.log(`⚠️ Agent state ${agentState.state} failed: ${error.message}`);
          // Continue with other states
        }
      }

      if (successCount > 0) {
        this.testResults.agentState = true;
        await this.log(`✅ Agent state management test passed (${successCount}/${agentStates.length})`, 'success');
        return true;
      } else {
        await this.log('⚠️ No agent states recorded (endpoints may not be implemented)');
        return false;
      }
    } catch (error) {
      await this.log(`❌ Agent state test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testTaskLifecycle(taskId) {
    await this.log(`🔄 Testing complete task lifecycle...`);
    
    try {
      // Update task status
      const updateData = {
        status: 'in_progress',
        currentPhase: 'data_collection',
        completeness: 50,
        metadata: {
          updated_via: 'e2e_test',
          phase_transition: 'pending_to_in_progress',
          timestamp: new Date().toISOString()
        }
      };

      const updatedTask = await this.makeBackendRequest(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (updatedTask && updatedTask.status === 'in_progress') {
        await this.log('✅ Task status updated to in_progress', 'success');
        
        // Complete the task
        const completionData = {
          status: 'completed',
          currentPhase: 'completed',
          completeness: 100,
          completedAt: new Date().toISOString(),
          metadata: {
            completion_method: 'e2e_test',
            final_outcome: 'successful_test_completion'
          }
        };

        const completedTask = await this.makeBackendRequest(`/api/tasks/${taskId}`, {
          method: 'PUT', 
          body: JSON.stringify(completionData)
        });

        if (completedTask && completedTask.status === 'completed') {
          this.testResults.taskLifecycle = true;
          await this.log('✅ Task lifecycle test completed successfully', 'success');
          return true;
        }
      }
      
      throw new Error('Task lifecycle update failed');
    } catch (error) {
      await this.log(`❌ Task lifecycle test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testBusinessOperations() {
    await this.log(`🏢 Testing business operations with additional_info field...`);
    
    try {
      const businessData = {
        name: 'E2E Integration Test LLC',
        entityType: 'llc',
        state: 'CA',
        industry: 'Software Testing',
        ein: '98-7654321',
        additionalInfo: {
          testScenario: 'real_backend_integration',
          createdBy: 'e2e_test_suite',
          timestamp: new Date().toISOString(),
          schemaVersion: 'unified_with_additional_info',
          compliance_status: 'testing',
          validation_data: {
            entity_verified: true,
            state_registration: 'pending_test',
            tax_id_format: 'valid'
          }
        }
      };

      const business = await this.makeBackendRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData)
      });

      if (business && business.id) {
        this.testResults.businessOperations = true;
        this.createdData.push({ type: 'business', id: business.id, name: business.name });
        await this.log(`✅ Business created: ${business.id} - "${business.name}"`, 'success');
        await this.screenshot('business-created', `Business ${business.name} created with additional_info`);
        return business;
      } else {
        throw new Error('Business creation failed');
      }
    } catch (error) {
      await this.log(`❌ Business operations test failed: ${error.message}`, 'error');
      await this.screenshot('business-creation-failed', 'Business creation failed');
      return false;
    }
  }

  async testFrontendIntegration() {
    await this.log(`🎨 Testing frontend integration with backend...`);
    
    try {
      // Navigate to main app
      await this.page.goto(CONFIG.FRONTEND_URL);
      await this.page.waitForTimeout(3000);
      
      await this.screenshot('frontend-main-app', 'Main application loaded with authentication');
      
      // Check if authenticated
      const isAuthenticated = await this.page.evaluate(() => {
        return document.body.textContent.includes('Welcome') || 
               document.body.textContent.includes('Dashboard') ||
               !!document.querySelector('[data-testid="user-menu"]');
      });

      if (isAuthenticated) {
        await this.log('✅ Frontend shows authenticated state', 'success');
        
        // Try to access Dev Toolkit if available
        try {
          await this.page.goto(`${CONFIG.FRONTEND_URL}/dev-toolkit-standalone`);
          await this.page.waitForTimeout(2000);
          await this.screenshot('dev-toolkit', 'Dev Toolkit accessed for testing');
        } catch (error) {
          await this.log('⚠️ Dev Toolkit not accessible (may be normal)');
        }
        
        return true;
      } else {
        await this.log('⚠️ Frontend not showing authenticated state');
        return false;
      }
    } catch (error) {
      await this.log(`❌ Frontend integration test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    await this.log('🧹 Cleaning up created test data...');
    
    for (const item of this.createdData) {
      try {
        let endpoint = '';
        if (item.type === 'task') {
          endpoint = `/api/tasks/${item.id}`;
        } else if (item.type === 'business') {
          endpoint = `/api/businesses/${item.id}`;
        } else if (item.type === 'ui_request') {
          endpoint = `/api/ui-requests/${item.id}`;
        }

        if (endpoint) {
          await this.makeBackendRequest(endpoint, { method: 'DELETE' });
          await this.log(`✅ Cleaned up ${item.type}: ${item.id}`, 'success');
        }
      } catch (error) {
        await this.log(`⚠️ Failed to cleanup ${item.type} ${item.id}: ${error.message}`);
      }
    }
  }

  async generateReport() {
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(result => result === true).length;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    const report = {
      timestamp: new Date().toISOString(),
      test_config: CONFIG,
      summary: {
        total_tests: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        success_rate: successRate
      },
      test_results: this.testResults,
      created_data: this.createdData,
      screenshots_captured: this.screenshotCount,
      screenshot_directory: CONFIG.SCREENSHOT_DIR
    };

    // Write report to file
    const reportPath = path.join(CONFIG.SCREENSHOT_DIR, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 REAL BACKEND INTEGRATION TEST REPORT:');
    console.log(`   Frontend URL: ${CONFIG.FRONTEND_URL}`);
    console.log(`   Backend URL: ${CONFIG.BACKEND_URL}`);
    console.log(`   Test Email: ${CONFIG.TEST_EMAIL}`);
    console.log(`   Total Tests: ${report.summary.total_tests}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Success Rate: ${report.summary.success_rate}%`);
    console.log(`   Data Created: ${report.created_data.length} items`);
    console.log(`   Screenshots: ${report.screenshots_captured} files in ${CONFIG.SCREENSHOT_DIR}`);

    if (report.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      Object.entries(this.testResults).forEach(([test, passed]) => {
        if (!passed) {
          console.log(`   ❌ ${test}`);
        }
      });
    }

    console.log('\n✅ PASSED TESTS:');
    Object.entries(this.testResults).forEach(([test, passed]) => {
      if (passed) {
        console.log(`   ✅ ${test}`);
      }
    });

    return report;
  }

  async run() {
    try {
      console.log('🚀 Starting Real Backend Integration E2E Test');
      console.log(`   Frontend: ${CONFIG.FRONTEND_URL}`);
      console.log(`   Backend: ${CONFIG.BACKEND_URL}`);
      console.log(`   Test User: ${CONFIG.TEST_EMAIL}`);
      console.log(`   Screenshots: ${CONFIG.SCREENSHOT_DIR}`);
      console.log('');

      // Setup
      await this.setupBrowser();
      await this.screenshot('test-start', 'E2E test suite starting');

      // Authentication
      const authSuccess = await this.extractAuthToken();
      if (!authSuccess) {
        throw new Error('Authentication failed - cannot proceed');
      }

      // Backend connectivity
      await this.testBackendHealth();

      // Core functionality tests
      const task = await this.testTaskCreationWithUnifiedSchema();
      if (task) {
        await this.testUnifiedContextEvents(task.id);
        await this.testUIRequestResponseFlow(task.id);
        await this.testAgentStateManagement(task.id);
        await this.testTaskLifecycle(task.id);
      }

      // Additional tests
      await this.testBusinessOperations();
      await this.testFrontendIntegration();

      await this.screenshot('test-complete', 'All tests completed');

      const report = await this.generateReport();

      if (report.summary.failed > 0) {
        await this.log(`⚠️ ${report.summary.failed} tests failed`, 'error');
      } else {
        await this.log('🎉 All tests passed!', 'success');
      }

      return report;

    } catch (error) {
      await this.log(`💥 Test suite failed: ${error.message}`, 'error');
      await this.screenshot('test-failed', `Test suite failed: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new RealBackendIntegrationTest();
  
  test.run()
    .then(report => {
      console.log(`\n✅ Real backend integration test completed with ${report.summary.success_rate}% success rate`);
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Real backend integration test failed:', error.message);
      process.exit(1);
    });
}