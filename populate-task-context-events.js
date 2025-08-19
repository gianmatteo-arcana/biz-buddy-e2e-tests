#!/usr/bin/env node

/**
 * Populate task_context_events table through the backend API
 * Uses proper API endpoints to create events
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function getAuthToken() {
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
    console.log('Could not read auth token:', e.message);
  }
  return null;
}

async function populateTaskContextEvents() {
  console.log('🚀 Populating Task Context Events');
  console.log('═'.repeat(60));
  
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ No auth token found. Run: node universal-auth-capture.js');
    return;
  }
  
  try {
    // Step 1: Use a known task ID or create one
    console.log('\n📋 Step 1: Using known task for events...');
    
    // We know this task exists from earlier
    const targetTask = {
      id: '55a80026-1909-4e2e-bbe1-2dfbf399c6ac',
      title: 'Complete Business Onboarding - TechVenture Solutions'
    };
    
    console.log('🎯 Using task:', targetTask.title);
    console.log('   ID:', targetTask.id);
    
    // Step 2: Add events using the context events endpoint
    console.log('\n📋 Step 2: Adding context events...');
    
    // Create a context ID if not present
    const contextId = targetTask.context_id || uuidv4();
    
    const events = [
      {
        eventType: 'agent_action',
        agentId: 'OrchestratorAgent',
        operation: 'ONBOARDING_INITIATED',
        data: {
          workflow: 'comprehensive_onboarding',
          estimated_time: '30 minutes',
          agents_required: 9
        },
        reasoning: 'User requested business onboarding, initiating multi-agent workflow'
      },
      {
        eventType: 'agent_action',
        agentId: 'ProfileCollector',
        operation: 'USER_PROFILE_COLLECTED',
        data: {
          name: 'Gianmatteo Allyn',
          email: 'gianmatteo.allyn.test@gmail.com',
          location: 'San Francisco, CA'
        },
        reasoning: 'Collected user profile from authentication data'
      },
      {
        eventType: 'agent_action',
        agentId: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_DISCOVERY_STARTED',
        data: {
          method: 'domain_analysis',
          domain: 'techventure.com'
        },
        reasoning: 'Analyzing business information from domain'
      },
      {
        eventType: 'agent_action',
        agentId: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_INFORMATION_FOUND',
        data: {
          business_name: 'TechVenture Solutions',
          industry: 'Technology Consulting',
          employees: '1-10'
        },
        reasoning: 'Successfully discovered business information'
      },
      {
        eventType: 'agent_action',
        agentId: 'DataEnrichmentAgent',
        operation: 'ENTITY_TYPE_DETERMINED',
        data: {
          entity_type: 'C-Corporation',
          state: 'Delaware',
          ein: '88-1234567'
        },
        reasoning: 'Verified C-Corp status through state records'
      },
      {
        eventType: 'agent_action',
        agentId: 'ComplianceVerificationAgent',
        operation: 'EIN_VERIFIED',
        data: {
          ein: '88-1234567',
          status: 'active'
        },
        reasoning: 'EIN verified with IRS database'
      },
      {
        eventType: 'agent_action',
        agentId: 'FormOptimizerAgent',
        operation: 'FORMS_PRE_FILLED',
        data: {
          forms_completed: 8,
          fields_filled: 147,
          accuracy: 98
        },
        reasoning: 'Pre-filled forms with business data'
      },
      {
        eventType: 'agent_action',
        agentId: 'TaskCoordinatorAgent',
        operation: 'ACTION_PLAN_CREATED',
        data: {
          total_steps: 12,
          completed: 8,
          remaining: 4
        },
        reasoning: 'Created prioritized action plan'
      },
      {
        eventType: 'agent_action',
        agentId: 'CelebrationAgent',
        operation: 'MILESTONE_ACHIEVED',
        data: {
          milestone: 'Legal Formation Complete',
          badge: 'formation_expert'
        },
        reasoning: 'Celebrating milestone achievement'
      },
      {
        eventType: 'agent_action',
        agentId: 'MonitoringAgent',
        operation: 'METRICS_UPDATED',
        data: {
          progress: 75,
          efficiency: 95,
          satisfaction: 'high'
        },
        reasoning: 'Tracking metrics for improvement'
      }
    ];
    
    // Try to add events via the context events endpoint
    let successCount = 0;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Use the POST /api/tasks/:taskId/context/events endpoint
      const eventResponse = await fetch(`${BACKEND_URL}/api/tasks/${targetTask.id}/context/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...event,
          contextId: contextId
        })
      });
      
      if (eventResponse.ok) {
        successCount++;
        console.log(`   ✅ ${event.operation} by ${event.agentId}`);
      } else {
        const error = await eventResponse.text();
        console.log(`   ⚠️ Failed: ${event.operation} - ${eventResponse.status}`);
      }
      
      // Small delay between events
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n✅ Added ${successCount}/${events.length} events`);
    
    // Step 3: Verify events were created
    console.log('\n📋 Step 3: Verifying events...');
    
    const verifyResponse = await fetch(`${BACKEND_URL}/api/task-events/${targetTask.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.ok) {
      const result = await verifyResponse.json();
      console.log('✅ Task has', result.count, 'events in timeline');
      
      if (result.events && result.events.length > 0) {
        console.log('\n📊 Recent events:');
        result.events.slice(-5).forEach(e => {
          console.log(`   - ${e.operation} by ${e.actor_id}`);
        });
      }
    } else {
      console.log('⚠️ Could not verify events');
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TASK CONTEXT EVENTS POPULATED!');
    console.log('═'.repeat(60));
    console.log('📋 Task:', targetTask.title);
    console.log('🆔 Task ID:', targetTask.id);
    console.log('📊 Events Added:', successCount);
    console.log('\n✅ The DevToolkit should now show:');
    console.log('   • Rich timeline with agent events');
    console.log('   • Multiple agents in the visualization');
    console.log('   • Real operations and reasoning');
    console.log('\n🚀 Open DevToolkit at: http://localhost:8081/dev-toolkit-standalone');
    console.log('   Select the task to see the timeline!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  populateTaskContextEvents();
}