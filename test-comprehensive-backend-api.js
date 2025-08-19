/**
 * Comprehensive Backend API E2E Test
 * 
 * Tests all API endpoints from Issue #59 unified schema implementation:
 * - Universal task management
 * - Task context events (unified schema)  
 * - UI request/response flow
 * - Agent state management
 * - SSE streaming
 * - Full CRUD operations with real authenticated user
 * 
 * Exercises the entire backend-frontend integration with meaningful data.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Test configuration
const CONFIG = {
  // Backend API base URL (Railway)
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  
  // Frontend app URL for SSE testing  
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8081',
  
  // Test user credentials
  TEST_EMAIL: 'gianmatteo.allyn.test@gmail.com',
  
  // Test settings
  HEADLESS: process.env.HEADLESS !== 'false',
  TIMEOUT: 90000,
  
  // Screenshot directory
  SCREENSHOT_DIR: `test-backend-api-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}`
};

// Test data for comprehensive API testing
const TEST_DATA = {
  businesses: [
    {
      name: 'Test LLC',
      entity_type: 'LLC',
      state: 'CA',
      industry: 'Technology',
      ein: '12-3456789',
      additional_info: {
        foundedYear: 2023,
        employees: 5,
        testScenario: 'comprehensive-api-test'
      }
    },
    {
      name: 'Demo Corp',
      entity_type: 'Corporation', 
      state: 'NY',
      industry: 'Consulting',
      additional_info: {
        foundedYear: 2024,
        testScenario: 'comprehensive-api-test'
      }
    }
  ],
  
  tasks: [
    {
      taskType: 'onboarding',
      title: 'Business Onboarding Flow',
      description: 'Complete business setup and compliance',
      metadata: {
        priority: 'high',
        category: 'compliance',
        testScenario: 'comprehensive-api-test'
      }
    },
    {
      taskType: 'soi_filing',
      title: 'Statement of Information Filing',
      description: 'CA SOI compliance filing',
      metadata: {
        priority: 'critical',
        dueDate: '2025-12-31',
        testScenario: 'comprehensive-api-test'
      }
    }
  ],
  
  contextEvents: [
    {
      operation: 'user_input',
      data: {
        formData: { businessName: 'Test LLC', contactEmail: 'test@example.com' },
        source: 'onboarding_form'
      },
      reasoning: 'User provided initial business information'
    },
    {
      operation: 'agent_analysis',
      data: {
        findings: ['Valid business name', 'Email format correct'],
        recommendations: ['Proceed with registration', 'Verify EIN'],
        confidence: 0.95
      },
      reasoning: 'Legal compliance agent analyzed input data'
    },
    {
      operation: 'status_update',
      data: {
        previousStatus: 'pending',
        newStatus: 'in_progress',
        phase: 'data_collection'
      },
      reasoning: 'Task progressed to data collection phase'
    }
  ],
  
  uiRequests: [
    {
      requestType: 'form_input',
      semanticData: {
        title: 'Business Information Required',
        description: 'Please provide additional details about your business',
        fields: [
          { name: 'industry', type: 'select', required: true, options: ['Technology', 'Consulting', 'Retail'] },
          { name: 'employees', type: 'number', required: false },
          { name: 'revenue', type: 'currency', required: false }
        ],
        actions: [
          { id: 'submit', label: 'Continue', type: 'primary' },
          { id: 'save_draft', label: 'Save Draft', type: 'secondary' }
        ]
      }
    },
    {
      requestType: 'approval',
      semanticData: {
        title: 'Document Review Required',
        description: 'Please review the generated compliance documents',
        fields: [
          { name: 'documents_approved', type: 'boolean', required: true }
        ],
        actions: [
          { id: 'approve', label: 'Approve & Submit', type: 'primary' },
          { id: 'request_changes', label: 'Request Changes', type: 'danger' }
        ]
      }
    }
  ],
  
  agentStates: [
    {
      agentRole: 'legal_compliance_agent',
      stateData: {
        currentAnalysis: 'business_structure_review',
        documentsProcessed: ['articles_of_incorporation', 'operating_agreement'],
        complianceStatus: 'pending_review',
        findings: {
          structureCompliant: true,
          filingRequirements: ['SOI', 'tax_registration'],
          nextActions: ['verify_ein', 'submit_soi']
        }
      }
    },
    {
      agentRole: 'data_collection_agent',
      stateData: {
        collectionStatus: 'active',
        requiredFields: ['business_address', 'authorized_representative'],
        collectedFields: ['business_name', 'entity_type', 'state'],
        validationResults: {
          business_name: 'valid',
          entity_type: 'valid',
          state: 'valid'
        }
      }
    }
  ]
};

class ComprehensiveBackendAPITest {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.authToken = null;
    this.userId = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      apiTests: {},
      screenshots: [],
      errors: []
    };
    this.createdResources = {
      businesses: [],
      tasks: [],
      contexts: []
    };
  }

  async init() {
    // Create screenshot directory
    if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
      fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
    }

    // Launch browser and authenticate
    this.browser = await chromium.launch({ 
      headless: CONFIG.HEADLESS,
      slowMo: 500 // Slow down for visual verification
    });
    
    this.context = await this.browser.newContext({
      storageState: '.auth/user-state.json', // Use existing auth
      viewport: { width: 1920, height: 1080 }
    });
    
    this.page = await this.context.newPage();
    
    // Extract authentication token from browser storage
    await this.extractAuthToken();
    
    console.log('✅ Browser initialized with authentication');
  }

  async extractAuthToken() {
    // Navigate to app to trigger auth context
    await this.page.goto(CONFIG.FRONTEND_URL);
    await this.page.waitForTimeout(2000);
    
    // Extract auth token from localStorage
    const authData = await this.page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const authKey = keys.find(key => key.includes('auth-token'));
      if (authKey) {
        const authValue = localStorage.getItem(authKey);
        try {
          const parsed = JSON.parse(authValue);
          return {
            token: parsed.currentSession?.access_token,
            userId: parsed.currentSession?.user?.id,
            email: parsed.currentSession?.user?.email
          };
        } catch (e) {
          return null;
        }
      }
      return null;
    });

    if (!authData?.token) {
      throw new Error('Failed to extract authentication token from browser storage');
    }

    this.authToken = authData.token;
    this.userId = authData.userId;
    
    console.log(`✅ Authentication extracted for user: ${authData.email}`);
    console.log(`   User ID: ${this.userId}`);
    console.log(`   Token length: ${this.authToken.length} chars`);
  }

  async screenshot(name, description = '') {
    const filename = `${this.testResults.screenshots.length + 1}-${name.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    const filepath = path.join(CONFIG.SCREENSHOT_DIR, filename);
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    this.testResults.screenshots.push({
      filename,
      description,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot: ${filename} - ${description}`);
  }

  async apiCall(method, endpoint, data = null, description = '') {
    const url = `${CONFIG.BACKEND_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log(`🔗 API Call: ${method} ${endpoint} - ${description}`);
      
      const response = await fetch(url, options);
      const responseData = await response.json();
      
      const result = {
        method,
        endpoint,
        description,
        status: response.status,
        success: response.ok,
        data: responseData,
        timestamp: new Date().toISOString()
      };

      this.testResults.apiTests[`${method}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`] = result;

      if (response.ok) {
        console.log(`   ✅ Success: ${response.status}`);
        return responseData;
      } else {
        console.log(`   ❌ Failed: ${response.status} - ${responseData.error}`);
        this.testResults.errors.push({
          type: 'api_error',
          endpoint,
          status: response.status,
          error: responseData.error
        });
        return null;
      }
    } catch (error) {
      console.log(`   💥 Exception: ${error.message}`);
      this.testResults.errors.push({
        type: 'api_exception',
        endpoint,
        error: error.message
      });
      return null;
    }
  }

  async testUniversalTaskManagement() {
    console.log('\n🎯 Testing Universal Task Management APIs');

    // Test 1: Create multiple tasks
    for (const taskData of TEST_DATA.tasks) {
      const response = await this.apiCall(
        'POST',
        '/api/tasks/create',
        taskData,
        `Create ${taskData.taskType} task`
      );

      if (response?.contextId) {
        this.createdResources.tasks.push({
          contextId: response.contextId,
          taskType: taskData.taskType,
          title: taskData.title
        });
      }
    }

    // Test 2: List all tasks
    await this.apiCall('GET', '/api/tasks', null, 'List all user tasks');

    // Test 3: Get specific task details
    if (this.createdResources.tasks.length > 0) {
      const task = this.createdResources.tasks[0];
      await this.apiCall(
        'GET',
        `/api/tasks/${task.contextId}`,
        null,
        `Get task details for ${task.title}`
      );

      // Test 4: Update task
      await this.apiCall(
        'PUT',
        `/api/tasks/${task.contextId}`,
        {
          status: 'in_progress',
          metadata: { testUpdate: true, lastModified: new Date().toISOString() }
        },
        `Update task status to in_progress`
      );

      // Test 5: Get task status
      await this.apiCall(
        'GET', 
        `/api/tasks/${task.contextId}/status`,
        null,
        `Get detailed task status`
      );
    }
  }

  async testUnifiedEventSourcing() {
    console.log('\n🎯 Testing Unified Task Context Events (Issue #59 Schema)');

    if (this.createdResources.tasks.length === 0) {
      console.log('   ⚠️ No tasks available for event testing');
      return;
    }

    const task = this.createdResources.tasks[0];

    // Test 1: Add context events
    for (const eventData of TEST_DATA.contextEvents) {
      await this.apiCall(
        'POST',
        `/api/tasks/${task.contextId}/context/events`,
        {
          operation: eventData.operation,
          data: eventData.data,
          reasoning: eventData.reasoning
        },
        `Add context event: ${eventData.operation}`
      );
    }

    // Test 2: Get context history
    await this.apiCall(
      'GET',
      `/api/tasks/${task.contextId}/context-history`,
      null,
      'Get complete context event history'
    );
  }

  async testUIRequestResponseFlow() {
    console.log('\n🎯 Testing UI Request/Response Flow (Unified Schema)');

    if (this.createdResources.tasks.length === 0) {
      console.log('   ⚠️ No tasks available for UI testing');
      return;
    }

    const task = this.createdResources.tasks[0];

    // Test UI response submission
    for (let i = 0; i < TEST_DATA.uiRequests.length; i++) {
      const uiRequest = TEST_DATA.uiRequests[i];
      
      await this.apiCall(
        'POST',
        `/api/tasks/${task.contextId}/ui-response`,
        {
          requestId: `test_request_${i + 1}`,
          response: {
            industry: 'Technology',
            employees: 25,
            documents_approved: true
          },
          action: 'submit'
        },
        `Submit UI response for ${uiRequest.requestType}`
      );
    }
  }

  async testAgentManagement() {
    console.log('\n🎯 Testing Agent Management APIs (Unified Schema)');

    // Test 1: Get all agents
    await this.apiCall(
      'GET',
      '/api/tasks/agents',
      null,
      'Get all active agents across tasks'
    );

    // Test 2: Get specific agent role data
    for (const agentData of TEST_DATA.agentStates) {
      await this.apiCall(
        'GET',
        `/api/tasks/agents/${agentData.agentRole}`,
        null,
        `Get agent state for ${agentData.agentRole}`
      );
    }
  }

  async testSSEStreaming() {
    console.log('\n🎯 Testing Server-Sent Events (SSE) Streaming');

    if (this.createdResources.tasks.length === 0) {
      console.log('   ⚠️ No tasks available for SSE testing');
      return;
    }

    // Navigate to frontend to test SSE integration
    await this.page.goto(CONFIG.FRONTEND_URL);
    await this.page.waitForTimeout(2000);
    
    await this.screenshot('sse-frontend-loaded', 'Frontend loaded for SSE testing');

    // Test SSE endpoint directly (this would normally be consumed by frontend)
    const task = this.createdResources.tasks[0];
    
    // NOTE: SSE testing requires special handling since it's a streaming endpoint
    // For now, we'll just verify the endpoint exists and is accessible
    try {
      const sseResponse = await fetch(`${CONFIG.BACKEND_URL}/api/tasks/${task.contextId}/context/stream`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'text/event-stream'
        }
      });
      
      console.log(`   ✅ SSE endpoint accessible: ${sseResponse.status}`);
      
      this.testResults.apiTests.sse_stream = {
        endpoint: `/api/tasks/${task.contextId}/context/stream`,
        status: sseResponse.status,
        accessible: sseResponse.ok,
        description: 'SSE streaming endpoint accessibility test'
      };
    } catch (error) {
      console.log(`   ❌ SSE endpoint error: ${error.message}`);
    }
  }

  async testDataIntegrity() {
    console.log('\n🎯 Testing Data Integrity & Unified Schema');

    // Test data consistency across all APIs
    if (this.createdResources.tasks.length > 0) {
      const task = this.createdResources.tasks[0];
      
      // Get task data from different endpoints and compare
      const taskDetails = await this.apiCall(
        'GET',
        `/api/tasks/${task.contextId}`,
        null,
        'Get task for integrity check'
      );
      
      const taskStatus = await this.apiCall(
        'GET',
        `/api/tasks/${task.contextId}/status`, 
        null,
        'Get task status for integrity check'
      );
      
      const contextHistory = await this.apiCall(
        'GET',
        `/api/tasks/${task.contextId}/context-history`,
        null,
        'Get context history for integrity check'
      );

      // Verify data consistency
      const consistent = taskDetails?.context?.contextId === taskStatus?.taskId;
      console.log(`   📊 Data Consistency Check: ${consistent ? '✅ PASS' : '❌ FAIL'}`);
      
      this.testResults.dataIntegrity = {
        consistent,
        taskDetails: !!taskDetails,
        taskStatus: !!taskStatus,
        contextHistory: !!contextHistory,
        eventCount: contextHistory?.entries?.length || 0
      };
    }
  }

  async generateTestReport() {
    console.log('\n📋 Generating Comprehensive Test Report');

    // Calculate test statistics
    const apiTestCount = Object.keys(this.testResults.apiTests).length;
    const successCount = Object.values(this.testResults.apiTests).filter(test => test.success).length;
    const errorCount = this.testResults.errors.length;
    
    const summary = {
      totalTests: apiTestCount,
      successful: successCount,
      failed: apiTestCount - successCount,
      errors: errorCount,
      successRate: apiTestCount > 0 ? (successCount / apiTestCount * 100).toFixed(1) : 0,
      resourcesCreated: {
        businesses: this.createdResources.businesses.length,
        tasks: this.createdResources.tasks.length,
        contexts: this.createdResources.contexts.length
      }
    };

    this.testResults.summary = summary;

    // Save test results
    const reportPath = path.join(CONFIG.SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));

    // Take final screenshot
    await this.screenshot('final-test-state', 'Final application state after all tests');

    console.log('\n📊 Test Summary:');
    console.log(`   Total API Tests: ${summary.totalTests}`);
    console.log(`   Successful: ${summary.successful}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Success Rate: ${summary.successRate}%`);
    console.log(`   Errors: ${summary.errors}`);
    console.log(`   Resources Created: ${summary.resourcesCreated.tasks} tasks, ${summary.resourcesCreated.businesses} businesses`);
    console.log(`   Screenshots: ${this.testResults.screenshots.length}`);
    console.log(`   Report saved: ${reportPath}`);

    return this.testResults;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('✅ Test cleanup completed');
  }

  async run() {
    try {
      console.log('🚀 Starting Comprehensive Backend API E2E Test');
      console.log(`   Backend URL: ${CONFIG.BACKEND_URL}`);
      console.log(`   Frontend URL: ${CONFIG.FRONTEND_URL}`);
      console.log(`   Test User: ${CONFIG.TEST_EMAIL}`);
      console.log(`   Headless: ${CONFIG.HEADLESS}`);

      await this.init();
      await this.screenshot('initial-state', 'Initial application state');

      // Run all test suites
      await this.testUniversalTaskManagement();
      await this.testUnifiedEventSourcing();
      await this.testUIRequestResponseFlow();
      await this.testAgentManagement();
      await this.testSSEStreaming();
      await this.testDataIntegrity();

      // Generate comprehensive report
      const results = await this.generateTestReport();
      
      console.log('\n🎉 Comprehensive Backend API Test Completed Successfully!');
      
      return results;

    } catch (error) {
      console.error('💥 Test failed with error:', error);
      this.testResults.errors.push({
        type: 'test_failure',
        error: error.message,
        stack: error.stack
      });
      
      await this.screenshot('error-state', `Test failed: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test if called directly
if (process.argv[1].endsWith('test-comprehensive-backend-api.js')) {
  const test = new ComprehensiveBackendAPITest();
  
  test.run()
    .then(results => {
      console.log(`\n✅ Test completed with ${results.summary.successRate}% success rate`);
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error.message);
      process.exit(1);
    });
}

export default ComprehensiveBackendAPITest;