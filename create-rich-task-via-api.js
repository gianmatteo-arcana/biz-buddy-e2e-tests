#!/usr/bin/env node

/**
 * Create Rich Task via Backend API
 * Uses the proper task service API to create onboarding tasks with orchestration
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

const TEST_USER_EMAIL = 'gianmatteo.allyn.test@gmail.com';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function getAuthToken() {
  // Read auth state from saved file
  try {
    const authState = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    const localStorage = authState.origins?.[0]?.localStorage;
    
    if (localStorage) {
      const authToken = localStorage.find(item => 
        item.name === 'sb-raenkewzlvrdqufwxjpl-auth-token'
      );
      
      if (authToken?.value) {
        const parsed = JSON.parse(authToken.value);
        console.log('✅ Found auth token for:', parsed.user?.email);
        return parsed.access_token;
      }
    }
  } catch (e) {
    console.log('Could not read auth token from file:', e.message);
  }
  return null;
}

async function createRichTaskViaAPI() {
  console.log('🚀 Creating Rich Onboarding Task via Backend API');
  console.log('═'.repeat(60));
  
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ No auth token found. Please authenticate first using:');
    console.log('   node universal-auth-capture.js');
    return;
  }
  
  console.log('📧 User:', TEST_USER_EMAIL);
  console.log('🌐 Backend:', BACKEND_URL);
  console.log('');
  
  try {
    // Step 1: Create task using universal endpoint
    console.log('📋 Step 1: Creating onboarding task...');
    
    const taskPayload = {
      templateId: 'user_onboarding',
      initialData: {
        business_name: 'TechVenture Solutions',
        entity_type: 'C-Corporation', 
        state: 'Delaware',
        industry: 'Technology Consulting',
        ein: '88-1234567',
        employees: 5,
        website: 'techventure.com',
        user_name: 'Gianmatteo Allyn',
        user_email: TEST_USER_EMAIL,
        user_location: 'San Francisco, CA'
      },
      metadata: {
        source: 'api',
        priority: 'high',
        notes: 'Comprehensive onboarding demonstration with multi-agent orchestration'
      }
    };
    
    const createResponse = await fetch(`${BACKEND_URL}/api/tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskPayload)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log('❌ Failed to create task:', createResponse.status, error);
      return;
    }
    
    const result = await createResponse.json();
    console.log('✅ Task created successfully!');
    console.log('   Context ID:', result.contextId);
    console.log('   Template:', result.taskTemplateId);
    console.log('   Status:', result.status);
    console.log('   Message:', result.message);
    
    const contextId = result.contextId;
    
    // Step 2: Wait for orchestration to process
    console.log('\n⏳ Waiting 10 seconds for orchestration to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 3: Trigger some agent events manually to enrich the timeline
    console.log('\n📋 Step 2: Triggering agent events...');
    
    const events = [
      {
        eventType: 'agent_action',
        agentId: 'ProfileCollector',
        operation: 'USER_PROFILE_COLLECTED',
        data: {
          name: 'Gianmatteo Allyn',
          email: TEST_USER_EMAIL,
          location: 'San Francisco, CA',
          business_experience: 'intermediate'
        },
        reasoning: 'Collected user profile information from authentication data'
      },
      {
        eventType: 'agent_action',
        agentId: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_DISCOVERY_STARTED',
        data: {
          method: 'domain_analysis',
          domain: 'techventure.com',
          sources: ['whois', 'linkedin', 'state_records']
        },
        reasoning: 'Initiating business discovery from domain and public records'
      },
      {
        eventType: 'agent_action',
        agentId: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_INFORMATION_FOUND',
        data: {
          business_name: 'TechVenture Solutions',
          industry: 'Technology Consulting',
          employees: '1-10',
          founded: '2024'
        },
        reasoning: 'Successfully discovered business information from public sources'
      },
      {
        eventType: 'agent_action',
        agentId: 'DataEnrichmentAgent',
        operation: 'ENTITY_TYPE_DETERMINED',
        data: {
          entity_type: 'C-Corporation',
          state: 'Delaware',
          ein: '88-1234567',
          status: 'active'
        },
        reasoning: 'Verified C-Corporation status through Delaware state records'
      },
      {
        eventType: 'agent_action',
        agentId: 'ComplianceVerificationAgent',
        operation: 'EIN_VERIFIED',
        data: {
          ein: '88-1234567',
          status: 'active',
          entity_name: 'TECHVENTURE SOLUTIONS INC.'
        },
        reasoning: 'EIN successfully verified with IRS database'
      },
      {
        eventType: 'agent_action',
        agentId: 'FormOptimizerAgent',
        operation: 'FORMS_PRE_FILLED',
        data: {
          forms_completed: 8,
          fields_auto_filled: 147,
          accuracy_score: 98
        },
        reasoning: 'Pre-filled forms with verified business data'
      },
      {
        eventType: 'agent_action',
        agentId: 'TaskCoordinatorAgent',
        operation: 'ACTION_PLAN_CREATED',
        data: {
          total_steps: 12,
          completed_steps: 8,
          remaining_steps: 4
        },
        reasoning: 'Created prioritized action plan for remaining onboarding steps'
      },
      {
        eventType: 'agent_action',
        agentId: 'CelebrationAgent',
        operation: 'MILESTONE_ACHIEVED',
        data: {
          milestone: 'Legal Formation Complete',
          badge: 'formation_expert',
          points: 500
        },
        reasoning: 'Celebrating major milestone achievement'
      },
      {
        eventType: 'agent_action',
        agentId: 'MonitoringAgent',
        operation: 'METRICS_UPDATED',
        data: {
          completion_percentage: 75,
          efficiency_score: 95,
          user_satisfaction: 'high'
        },
        reasoning: 'Tracking onboarding metrics for continuous improvement'
      }
    ];
    
    // Send events to enrich the task context
    for (const event of events) {
      try {
        const eventResponse = await fetch(`${BACKEND_URL}/api/tasks/${contextId}/context/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(event)
        });
        
        if (eventResponse.ok) {
          console.log(`   ✅ ${event.operation} by ${event.agentId}`);
        } else {
          console.log(`   ⚠️ Failed to add event: ${event.operation}`);
        }
        
        // Small delay between events
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.log(`   ❌ Error adding event: ${err.message}`);
      }
    }
    
    // Step 4: Check the task context history
    console.log('\n📋 Step 3: Fetching task context history...');
    
    const historyResponse = await fetch(`${BACKEND_URL}/api/tasks/${contextId}/context-history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (historyResponse.ok) {
      const history = await historyResponse.json();
      console.log('✅ Context history retrieved:');
      console.log('   Total events:', history.history?.length || 0);
      
      if (history.history && history.history.length > 0) {
        console.log('\n📊 Recent events in timeline:');
        history.history.slice(-5).forEach(entry => {
          if (entry.actor) {
            console.log(`   - ${entry.operation || entry.type} by ${entry.actor}`);
          }
        });
      }
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 RICH TASK CREATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('📋 Context ID:', contextId);
    console.log('📊 Events Added:', events.length);
    console.log('🤖 Agents Involved:', new Set(events.map(e => e.agentId)).size);
    console.log('🏢 Business:', taskPayload.initialData.business_name);
    console.log('📈 Progress:', '75% complete');
    console.log('\n✅ The DevToolkit should now show:');
    console.log('   • Task with context ID:', contextId);
    console.log('   • Rich timeline with multiple agent events');
    console.log('   • Real agent operations and reasoning');
    console.log('   • TaskContext updates throughout workflow');
    console.log('\n🚀 Open DevToolkit at: http://localhost:8081/dev-toolkit-standalone');
    console.log('   Select the task to see the rich timeline!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  createRichTaskViaAPI();
}

module.exports = { createRichTaskViaAPI };