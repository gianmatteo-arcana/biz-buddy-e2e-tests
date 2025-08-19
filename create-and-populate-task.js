#!/usr/bin/env node

/**
 * Create a task and populate it with rich context events
 * Uses backend API for all operations
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

async function createAndPopulateTask() {
  console.log('🚀 Creating and Populating Task with Rich Events');
  console.log('═'.repeat(60));
  
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ No auth token found. Run: node universal-auth-capture.js');
    return;
  }
  
  try {
    // Step 1: Create a new task
    console.log('\n📋 Step 1: Creating new task...');
    
    const createResponse = await fetch(`${BACKEND_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        taskType: 'onboarding',
        title: 'Complete Business Onboarding - Tech Innovations LLC',
        description: 'Comprehensive business setup with multi-agent orchestration',
        metadata: {
          business_name: 'Tech Innovations LLC',
          entity_type: 'Limited Liability Company',
          state: 'California',
          progress: 0
        }
      })
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log('❌ Failed to create task:', createResponse.status, error);
      return;
    }
    
    const { taskId } = await createResponse.json();
    console.log('✅ Task created successfully!');
    console.log('   ID:', taskId);
    
    // Step 2: Add rich context events
    console.log('\n📋 Step 2: Adding context events...');
    
    const events = [
      {
        eventType: 'agent_action',
        agentId: 'OrchestratorAgent',
        operation: 'ONBOARDING_INITIATED',
        data: {
          workflow: 'comprehensive_onboarding',
          estimated_time: '30 minutes',
          agents_required: 9,
          phase: 'initialization'
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
          location: 'San Francisco, CA',
          profile_completeness: 100
        },
        reasoning: 'Collected user profile from authentication data'
      },
      {
        eventType: 'agent_action',
        agentId: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_DISCOVERY_STARTED',
        data: {
          method: 'domain_analysis',
          domain: 'techinnovations.com',
          confidence: 95
        },
        reasoning: 'Analyzing business information from domain'
      },
      {
        eventType: 'agent_action',
        agentId: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_INFORMATION_FOUND',
        data: {
          business_name: 'Tech Innovations LLC',
          industry: 'Technology Services',
          employees: '10-50',
          founded: '2023'
        },
        reasoning: 'Successfully discovered business information'
      },
      {
        eventType: 'agent_action',
        agentId: 'DataEnrichmentAgent',
        operation: 'DATA_ENRICHMENT_STARTED',
        data: {
          sources: ['state_records', 'business_registry', 'tax_database'],
          enrichment_depth: 'comprehensive'
        },
        reasoning: 'Enriching business data from multiple sources'
      },
      {
        eventType: 'agent_action',
        agentId: 'DataEnrichmentAgent',
        operation: 'ENTITY_TYPE_DETERMINED',
        data: {
          entity_type: 'Limited Liability Company',
          state: 'California',
          ein: '95-1234567',
          formation_date: '2023-03-15'
        },
        reasoning: 'Verified LLC status through state records'
      },
      {
        eventType: 'agent_action',
        agentId: 'ComplianceVerificationAgent',
        operation: 'COMPLIANCE_CHECK_INITIATED',
        data: {
          checks: ['EIN', 'State Registration', 'Business License', 'Tax Status'],
          compliance_level: 'full'
        },
        reasoning: 'Starting comprehensive compliance verification'
      },
      {
        eventType: 'agent_action',
        agentId: 'ComplianceVerificationAgent',
        operation: 'EIN_VERIFIED',
        data: {
          ein: '95-1234567',
          status: 'active',
          issued_date: '2023-03-20'
        },
        reasoning: 'EIN verified with IRS database'
      },
      {
        eventType: 'agent_action',
        agentId: 'ComplianceVerificationAgent',
        operation: 'STATE_REGISTRATION_VERIFIED',
        data: {
          state: 'California',
          status: 'good_standing',
          next_filing: '2024-03-15'
        },
        reasoning: 'State registration verified with CA Secretary of State'
      },
      {
        eventType: 'agent_action',
        agentId: 'FormOptimizerAgent',
        operation: 'FORMS_OPTIMIZATION_STARTED',
        data: {
          forms_identified: 12,
          auto_fillable: 10,
          manual_required: 2
        },
        reasoning: 'Analyzing forms for auto-fill optimization'
      },
      {
        eventType: 'agent_action',
        agentId: 'FormOptimizerAgent',
        operation: 'FORMS_PRE_FILLED',
        data: {
          forms_completed: 10,
          fields_filled: 186,
          accuracy: 98,
          time_saved: '3.5 hours'
        },
        reasoning: 'Pre-filled forms with verified business data'
      },
      {
        eventType: 'agent_action',
        agentId: 'TaskCoordinatorAgent',
        operation: 'ACTION_PLAN_CREATED',
        data: {
          total_steps: 15,
          completed: 11,
          remaining: 4,
          next_actions: ['Bank Account Setup', 'Insurance Selection', 'Tax Registration']
        },
        reasoning: 'Created prioritized action plan for completion'
      },
      {
        eventType: 'agent_action',
        agentId: 'CelebrationAgent',
        operation: 'MILESTONE_ACHIEVED',
        data: {
          milestone: 'Legal Formation Complete',
          badge: 'formation_expert',
          achievement_points: 500
        },
        reasoning: 'Celebrating major milestone achievement'
      },
      {
        eventType: 'agent_action',
        agentId: 'MonitoringAgent',
        operation: 'METRICS_UPDATED',
        data: {
          progress: 75,
          efficiency: 95,
          satisfaction: 'high',
          time_elapsed: '25 minutes',
          estimated_completion: '10 minutes'
        },
        reasoning: 'Tracking metrics for performance optimization'
      },
      {
        eventType: 'agent_action',
        agentId: 'OrchestratorAgent',
        operation: 'ONBOARDING_PHASE_COMPLETE',
        data: {
          phase: 'legal_formation',
          next_phase: 'financial_setup',
          completion_rate: 100
        },
        reasoning: 'Legal formation phase completed successfully'
      }
    ];
    
    let successCount = 0;
    const contextId = uuidv4(); // Use same context for all events
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Add small delay to create realistic timeline
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const eventResponse = await fetch(`${BACKEND_URL}/api/tasks/${taskId}/context/events`, {
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
        const timeStr = '+' + (i * 2) + 'm';
        console.log(`   ✅ [${timeStr}] ${event.operation} by ${event.agentId}`);
      } else {
        const error = await eventResponse.text();
        console.log(`   ⚠️ Failed: ${event.operation} - ${eventResponse.status}`);
      }
    }
    
    console.log(`\n✅ Added ${successCount}/${events.length} events`);
    
    // Step 3: Verify events were created
    console.log('\n📋 Step 3: Verifying task events...');
    
    const verifyResponse = await fetch(`${BACKEND_URL}/api/task-events/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.ok) {
      const result = await verifyResponse.json();
      console.log('✅ Task has', result.count, 'events in timeline');
      
      if (result.events && result.events.length > 0) {
        console.log('\n📊 Event Timeline:');
        result.events.forEach((e, idx) => {
          const timeLabel = '+' + (idx * 2) + 'm';
          console.log(`   [${timeLabel}] ${e.operation} by ${e.actor_id}`);
        });
      }
    } else {
      console.log('⚠️ Could not verify events');
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TASK CREATED AND POPULATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('📋 Task Title: Complete Business Onboarding - Tech Innovations LLC');
    console.log('🆔 Task ID:', taskId);
    console.log('📊 Events Added:', successCount);
    console.log('⏱️ Timeline Span: 30 minutes (simulated)');
    console.log('\n✅ The DevToolkit should now show:');
    console.log('   • Rich timeline with', successCount, 'agent events');
    console.log('   • Multiple agents working together');
    console.log('   • Real operations with detailed data');
    console.log('   • Progress tracking at 75%');
    console.log('\n🚀 Open DevToolkit at: http://localhost:8081/dev-toolkit-standalone');
    console.log('   Select the new task to see the complete timeline!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  createAndPopulateTask();
}