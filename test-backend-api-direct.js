/**
 * Direct Backend API Test
 * 
 * Test the backend APIs directly with a JWT token to verify:
 * 1. Backend can connect to the unified database schema
 * 2. CRUD operations work with task_context_events
 * 3. Universal task management APIs work
 * 4. Real authentication and database integration
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InlxeWNiVW1UZlpqWnR1UzMiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU5ODM0ODY2LCJpYXQiOjE3NTk3NDg0NjYsImlzcyI6Imh0dHBzOi8vcmFlbmtld3psdnJkcXVmd3hqcGwuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCIsImVtYWlsIjoiZ2lhbm1hdHRlby5hbGx5bi50ZXN0QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOGNfS3Jid1RFTU80cUZ5SnBQd3oteWVJeWRVZjVMVnMzZzVGQVY1VlFwbXhpUVpNdXdnPXM5Ni1jIiwiZW1haWwiOiJnaWFubWF0dGVvLmFsbHluLnRlc3RAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkdpYW5tYXR0ZW8gQWxseW4iLCJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYW1lIjoiR2lhbm1hdHRlbyBBbGx5biIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4Y19LcmJ3VEVNTzRxRnlKcFB3ei15ZUl5ZFVmNUxWczNnNUZBVjVWUXBteGlRWk11d2c9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwNTM3MjAzNTk2MDcxMDk5NDAwMyIsInN1YiI6IjEwNTM3MjAzNTk2MDcxMDk5NDAwMyJ9.b-WBfkEDIr2rEP8ZjWdqVmHpjJu3M4TdAL9PF0vQ23A'; // Test JWT from authenticated user

class DirectBackendAPITest {
  constructor() {
    this.results = {
      healthCheck: false,
      taskCreation: false,
      taskRetrival: false,
      contextEvents: false,
      businessCreation: false,
      unifiedSchema: false,
      errors: []
    };
    this.createdResources = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BACKEND_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${TEST_JWT}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      this.log(`Making request to ${endpoint}`, 'info');
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.log(`✅ Request successful: ${endpoint}`, 'success');
      return data;
    } catch (error) {
      this.log(`❌ Request failed: ${endpoint} - ${error.message}`, 'error');
      this.results.errors.push({ endpoint, error: error.message });
      throw error;
    }
  }

  async testHealthCheck() {
    this.log('Testing backend health check...');
    try {
      const data = await this.makeRequest('/health');
      if (data.status === 'ok') {
        this.results.healthCheck = true;
        this.log('✅ Backend is healthy', 'success');
        return true;
      } else {
        throw new Error('Health check returned non-ok status');
      }
    } catch (error) {
      this.log(`❌ Health check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testTaskCreation() {
    this.log('Testing task creation with unified schema...');
    try {
      const taskData = {
        taskType: 'unified_test',
        title: 'Test Unified Schema Task',
        description: 'Testing unified task_context_events schema',
        priority: 'medium',
        metadata: {
          testType: 'unified_schema',
          timestamp: new Date().toISOString()
        }
      };

      const task = await this.makeRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });

      if (task && task.id) {
        this.results.taskCreation = true;
        this.createdResources.push({ type: 'task', id: task.id });
        this.log(`✅ Task created successfully: ${task.id}`, 'success');
        return task;
      } else {
        throw new Error('Task creation did not return valid task');
      }
    } catch (error) {
      this.log(`❌ Task creation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testTaskRetrieval(taskId) {
    this.log(`Testing task retrieval for ${taskId}...`);
    try {
      const task = await this.makeRequest(`/api/tasks/${taskId}`);
      
      if (task && task.id === taskId) {
        this.results.taskRetrival = true;
        this.log('✅ Task retrieved successfully', 'success');
        return task;
      } else {
        throw new Error('Task retrieval returned invalid data');
      }
    } catch (error) {
      this.log(`❌ Task retrieval failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testContextEvents(taskId) {
    this.log(`Testing context events for task ${taskId}...`);
    try {
      // Get task context events
      const events = await this.makeRequest(`/api/tasks/${taskId}/events`);
      
      if (Array.isArray(events)) {
        this.results.contextEvents = true;
        this.log(`✅ Context events retrieved: ${events.length} events`, 'success');
        
        // Log some details about the events to verify unified schema
        events.forEach((event, index) => {
          this.log(`   Event ${index + 1}: ${event.operation} by ${event.actor_type}:${event.actor_id}`);
        });
        
        return events;
      } else {
        throw new Error('Context events did not return array');
      }
    } catch (error) {
      this.log(`❌ Context events test failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testBusinessCreation() {
    this.log('Testing business creation with additional_info field...');
    try {
      const businessData = {
        name: 'Test Business LLC',
        entityType: 'llc',
        state: 'CA',
        industry: 'Technology',
        additionalInfo: {
          testScenario: 'unified_schema_test',
          timestamp: new Date().toISOString(),
          schemaVersion: 'task_context_events'
        }
      };

      const business = await this.makeRequest('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(businessData)
      });

      if (business && business.id) {
        this.results.businessCreation = true;
        this.createdResources.push({ type: 'business', id: business.id });
        this.log(`✅ Business created successfully: ${business.id}`, 'success');
        return business;
      } else {
        throw new Error('Business creation did not return valid business');
      }
    } catch (error) {
      this.log(`❌ Business creation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testUnifiedSchemaOperations() {
    this.log('Testing unified schema operations...');
    try {
      // Test that we can perform operations that require the unified schema
      let allPassed = true;
      
      // Create a task
      const task = await this.testTaskCreation();
      
      // Retrieve the task
      await this.testTaskRetrieval(task.id);
      
      // Get context events (should use task_context_events table)
      await this.testContextEvents(task.id);
      
      // Create a business (should use additional_info field)
      await this.testBusinessCreation();
      
      if (allPassed) {
        this.results.unifiedSchema = true;
        this.log('✅ All unified schema operations passed', 'success');
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Unified schema operations failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up created resources...');
    for (const resource of this.createdResources) {
      try {
        if (resource.type === 'task') {
          await this.makeRequest(`/api/tasks/${resource.id}`, { method: 'DELETE' });
        } else if (resource.type === 'business') {
          await this.makeRequest(`/api/businesses/${resource.id}`, { method: 'DELETE' });
        }
        this.log(`✅ Cleaned up ${resource.type}: ${resource.id}`, 'success');
      } catch (error) {
        this.log(`⚠️ Failed to cleanup ${resource.type}: ${resource.id} - ${error.message}`, 'error');
      }
    }
  }

  generateReport() {
    const totalTests = Object.keys(this.results).length - 1; // exclude errors array
    const passedTests = Object.values(this.results).filter(result => result === true).length;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    const report = {
      timestamp: new Date().toISOString(),
      backend_url: BACKEND_URL,
      summary: {
        total_tests: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        success_rate: successRate,
        errors: this.results.errors.length
      },
      test_results: this.results,
      created_resources: this.createdResources.length
    };

    console.log('\n📊 DIRECT BACKEND API TEST REPORT:');
    console.log(`   Backend URL: ${BACKEND_URL}`);
    console.log(`   Total Tests: ${report.summary.total_tests}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Success Rate: ${report.summary.success_rate}%`);
    console.log(`   Errors: ${report.summary.errors}`);
    console.log(`   Resources Created: ${report.created_resources}`);

    if (report.summary.errors > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach(error => {
        console.log(`   ${error.endpoint}: ${error.error}`);
      });
    }

    return report;
  }

  async run() {
    try {
      console.log('🚀 Starting Direct Backend API Test');
      console.log(`   Backend URL: ${BACKEND_URL}`);
      console.log(`   Using JWT Authentication`);
      console.log('');

      // Run all tests
      await this.testHealthCheck();
      await this.testUnifiedSchemaOperations();

      const report = this.generateReport();

      if (report.summary.failed > 0) {
        throw new Error(`${report.summary.failed} tests failed`);
      }

      this.log('🎉 All backend API tests PASSED!', 'success');
      return report;

    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new DirectBackendAPITest();
  
  test.run()
    .then(report => {
      console.log(`\n✅ Direct backend test completed with ${report.summary.success_rate}% success rate`);
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Direct backend test failed:', error.message);
      process.exit(1);
    });
}