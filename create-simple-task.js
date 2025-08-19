#!/usr/bin/env node

/**
 * Create a simple task without business logic
 * Then populate it with rich context events
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
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
        return parsed;
      }
    }
  } catch (e) {
    console.log('Could not read auth token:', e.message);
  }
  return null;
}

async function createSimpleTask() {
  console.log('🚀 Creating Task with Rich Event Timeline');
  console.log('═'.repeat(60));
  
  const authData = await getAuthToken();
  if (!authData) {
    console.log('❌ No auth token found. Run: node universal-auth-capture.js');
    return;
  }
  
  const token = authData.access_token;
  const userId = authData.user?.id;
  
  if (!userId) {
    console.log('❌ No user ID in auth token');
    return;
  }
  
  try {
    // Create Supabase client with service role for direct database access
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://raenkewzlvrdqufwxjpl.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw'
    );
    
    // Step 1: Create task directly in database
    console.log('\n📋 Step 1: Creating task directly in database...');
    
    const taskId = uuidv4();
    const contextId = uuidv4();
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        id: taskId,
        user_id: userId,
        task_type: 'onboarding',
        template_id: 'business_onboarding',
        title: 'Complete Business Onboarding - Tech Innovations LLC',
        description: 'Comprehensive business setup with multi-agent orchestration',
        status: 'in_progress',
        priority: 'high',
        metadata: {
          context_id: contextId,
          current_phase: 'legal_formation',
          business_name: 'Tech Innovations LLC',
          entity_type: 'Limited Liability Company',
          state: 'California',
          ein: '95-1234567',
          progress: {
            overall: 75,
            formation: 100,
            compliance: 80,
            financial: 50
          }
        }
      })
      .select()
      .single();
    
    if (taskError) {
      console.log('❌ Failed to create task:', taskError);
      return;
    }
    
    console.log('✅ Task created successfully!');
    console.log('   Title:', task.title);
    console.log('   ID:', taskId);
    console.log('   Context ID:', contextId);
    
    // Step 2: Add rich context events directly
    console.log('\n📋 Step 2: Adding context events directly to database...');
    
    const events = [
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'OrchestratorAgent',
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
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'ProfileCollector',
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
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_DISCOVERY_STARTED',
        data: {
          method: 'domain_analysis',
          domain: 'techinnovations.com',
          confidence: 95
        },
        reasoning: 'Analyzing business information from domain'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'BusinessDiscoveryAgent',
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
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'DataEnrichmentAgent',
        operation: 'DATA_ENRICHMENT_STARTED',
        data: {
          sources: ['state_records', 'business_registry', 'tax_database'],
          enrichment_depth: 'comprehensive'
        },
        reasoning: 'Enriching business data from multiple sources'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'DataEnrichmentAgent',
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
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'ComplianceVerificationAgent',
        operation: 'COMPLIANCE_CHECK_INITIATED',
        data: {
          checks: ['EIN', 'State Registration', 'Business License', 'Tax Status'],
          compliance_level: 'full'
        },
        reasoning: 'Starting comprehensive compliance verification'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'ComplianceVerificationAgent',
        operation: 'EIN_VERIFIED',
        data: {
          ein: '95-1234567',
          status: 'active',
          issued_date: '2023-03-20'
        },
        reasoning: 'EIN verified with IRS database'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'ComplianceVerificationAgent',
        operation: 'STATE_REGISTRATION_VERIFIED',
        data: {
          state: 'California',
          status: 'good_standing',
          next_filing: '2024-03-15'
        },
        reasoning: 'State registration verified with CA Secretary of State'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'FormOptimizerAgent',
        operation: 'FORMS_OPTIMIZATION_STARTED',
        data: {
          forms_identified: 12,
          auto_fillable: 10,
          manual_required: 2
        },
        reasoning: 'Analyzing forms for auto-fill optimization'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'FormOptimizerAgent',
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
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'TaskCoordinatorAgent',
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
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'CelebrationAgent',
        operation: 'MILESTONE_ACHIEVED',
        data: {
          milestone: 'Legal Formation Complete',
          badge: 'formation_expert',
          achievement_points: 500
        },
        reasoning: 'Celebrating major milestone achievement'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'MonitoringAgent',
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
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'OrchestratorAgent',
        operation: 'ONBOARDING_PHASE_COMPLETE',
        data: {
          phase: 'legal_formation',
          next_phase: 'financial_setup',
          completion_rate: 100
        },
        reasoning: 'Legal formation phase completed successfully'
      }
    ];
    
    // Insert all events
    const { data: insertedEvents, error: eventsError } = await supabase
      .from('task_context_events')
      .insert(events)
      .select();
    
    if (eventsError) {
      console.log('❌ Failed to insert events:', eventsError);
      return;
    }
    
    console.log(`✅ Added ${insertedEvents.length} events successfully!`);
    
    // Step 3: Verify through backend API
    console.log('\n📋 Step 3: Verifying through backend API...');
    
    const verifyResponse = await fetch(`${BACKEND_URL}/api/task-events/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.ok) {
      const result = await verifyResponse.json();
      console.log('✅ Backend confirms', result.count, 'events in timeline');
      
      if (result.events && result.events.length > 0) {
        console.log('\n📊 Event Timeline (from backend):');
        result.events.slice(0, 5).forEach((e, idx) => {
          const timeLabel = '+' + (idx * 2) + 'm';
          console.log(`   [${timeLabel}] ${e.operation} by ${e.actor_id}`);
        });
        if (result.events.length > 5) {
          console.log(`   ... and ${result.events.length - 5} more events`);
        }
      }
    } else {
      console.log('⚠️ Backend verification failed');
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TASK CREATED WITH RICH EVENT TIMELINE!');
    console.log('═'.repeat(60));
    console.log('📋 Task: Complete Business Onboarding - Tech Innovations LLC');
    console.log('🆔 Task ID:', taskId);
    console.log('📊 Events: 15 agent operations');
    console.log('📈 Progress: 75% complete');
    console.log('🤖 Agents: 8 different agents involved');
    console.log('\n✅ DevToolkit Features Demonstrated:');
    console.log('   • Rich event timeline with 15 events');
    console.log('   • Multiple agent collaboration');
    console.log('   • Detailed operation data and reasoning');
    console.log('   • Progress tracking and metrics');
    console.log('   • Real-time task introspection');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Open DevToolkit: http://localhost:8081/dev-toolkit-standalone');
    console.log('   2. Look for "Tech Innovations LLC" task');
    console.log('   3. Click to see the complete timeline visualization');
    console.log('   4. Watch events unfold in chronological order');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  createSimpleTask();
}