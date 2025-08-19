const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NTU1OTQsImV4cCI6MjAzODIzMTU5NH0.djnlTRU-mTaL05hbvfCgHXMJiKmy8G3J_5ynAJKYjDc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Populate real task events for demonstration
 * Creates a realistic sequence of agent interactions
 */
async function populateRealTaskEvents() {
  console.log('🚀 Populating Real Task Events for Demo');
  console.log('─'.repeat(60));

  try {
    // Use service role key for direct database access
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';
    
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Use the test user's ID directly
    const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934'; // gianmatteo.allyn.test@gmail.com
    const TEST_USER_EMAIL = 'gianmatteo.allyn.test@gmail.com';
    
    console.log('✅ Using test user:', TEST_USER_EMAIL);

    // Find or create a task to populate with events
    const { data: tasks, error: tasksError } = await serviceSupabase
      .from('tasks')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tasksError) throw tasksError;

    let taskId;
    let contextId;
    
    if (tasks && tasks.length > 0) {
      taskId = tasks[0].id;
      console.log('✅ Using existing task:', tasks[0].title);
      
      // Get or create task context
      const { data: contexts } = await serviceSupabase
        .from('task_contexts')
        .select('*')
        .eq('task_id', taskId)
        .limit(1);
        
      if (contexts && contexts.length > 0) {
        contextId = contexts[0].id;
      } else {
        // Create task context
        const { data: newContext, error: contextError } = await serviceSupabase
          .from('task_contexts')
          .insert({
            task_id: taskId,
            shared_context: {
              user: { firstName: 'Test', email: TEST_USER_EMAIL },
              business: { name: 'TechStartup Inc', type: 'LLC' }
            },
            agent_contexts: {}
          })
          .select()
          .single();
          
        if (contextError) throw contextError;
        contextId = newContext.id;
      }
    } else {
      // Create a new task
      const { data: newTask, error: taskError } = await serviceSupabase
        .from('tasks')
        .insert({
          user_id: TEST_USER_ID,
          title: 'Business Formation Analysis',
          task_type: 'onboarding',
          status: 'in_progress',
          priority: 1,
          metadata: { demo: false, withEvents: true }
        })
        .select()
        .single();
        
      if (taskError) throw taskError;
      taskId = newTask.id;
      console.log('✅ Created new task:', newTask.title);
      
      // Create task context
      const { data: newContext, error: contextError } = await serviceSupabase
        .from('task_contexts')
        .insert({
          task_id: taskId,
          shared_context: {
            user: { firstName: 'Test', email: TEST_USER_EMAIL },
            business: { name: 'TechStartup Inc', type: 'LLC' }
          },
          agent_contexts: {}
        })
        .select()
        .single();
        
      if (contextError) throw contextError;
      contextId = newContext.id;
    }

    console.log('\n📝 Creating realistic agent events...');

    // Define realistic agent sequence
    const events = [
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'user',
        actor_id: TEST_USER_ID,
        operation: 'TASK_INITIATED',
        data: {
          request: 'Help me set up my tech startup business',
          timestamp: new Date().toISOString()
        },
        reasoning: 'User initiated business formation workflow'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'orchestrator-001',
        operation: 'TASK_ANALYSIS',
        data: {
          analysis: 'Tech startup requires Delaware C-Corp structure',
          confidence: 0.95,
          nextAgent: 'business-discovery'
        },
        reasoning: 'Analyzing business requirements based on tech startup profile'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'business-discovery-agent',
        operation: 'BUSINESS_PROFILE_COLLECTED',
        data: {
          business_profile: {
            name: 'TechStartup Inc',
            industry: 'Software Technology',
            location: 'Delaware',
            employees: '1-10',
            funding_stage: 'Pre-seed',
            revenue: '0-100k'
          },
          confidence: 0.88
        },
        reasoning: 'Collected comprehensive business profile through discovery process'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'data-enrichment-agent',
        operation: 'DATA_ENRICHED',
        data: {
          enriched_data: {
            industry_codes: ['541511', '541512'],
            business_category: 'Professional Services',
            tax_classification: 'C-Corporation',
            regulatory_requirements: ['State Registration', 'EIN', 'Business License']
          },
          sources: ['IRS', 'NAICS', 'State Database'],
          confidence: 0.92
        },
        reasoning: 'Enhanced business profile with regulatory and classification data'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'compliance-verification-agent',
        operation: 'COMPLIANCE_CHECK',
        data: {
          compliance_status: {
            federal: { status: 'compliant', requirements: ['EIN Required'] },
            state: { status: 'pending', requirements: ['State Registration', 'Annual Report'] },
            local: { status: 'compliant', requirements: [] }
          },
          risk_level: 'low',
          confidence: 0.91
        },
        reasoning: 'Verified compliance requirements across all jurisdictions'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'document-generation-agent',
        operation: 'DOCUMENTS_PREPARED',
        data: {
          documents: [
            { type: 'Articles of Incorporation', status: 'ready' },
            { type: 'Operating Agreement', status: 'ready' },
            { type: 'EIN Application', status: 'ready' },
            { type: 'State Registration', status: 'pending_review' }
          ],
          confidence: 0.94
        },
        reasoning: 'Generated all required formation documents based on profile'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'task-coordinator-agent',
        operation: 'NEXT_STEPS_GENERATED',
        data: {
          next_steps: [
            { step: 1, action: 'Review incorporation documents', status: 'pending', assignee: 'user' },
            { step: 2, action: 'Sign and submit state filing', status: 'pending', deadline: '2025-08-20' },
            { step: 3, action: 'Apply for EIN', status: 'pending', deadline: '2025-08-22' },
            { step: 4, action: 'Open business bank account', status: 'pending', deadline: '2025-08-25' }
          ],
          estimated_completion: '5-7 business days',
          confidence: 0.89
        },
        reasoning: 'Created actionable task list with realistic timelines'
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'system',
        actor_id: 'monitoring-system',
        operation: 'TASK_COMPLETED',
        data: {
          summary: {
            total_agents: 6,
            total_duration: '4.5 minutes',
            success_rate: 1.0,
            average_confidence: 0.91
          },
          status: 'completed'
        },
        reasoning: 'All agent tasks completed successfully'
      }
    ];

    // Insert events with slight delays to create realistic timeline
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Add timestamp with incremental seconds
      const timestamp = new Date(Date.now() - (events.length - i) * 5000).toISOString();
      
      const { data, error } = await serviceSupabase
        .from('task_context_events')
        .insert({
          ...event,
          created_at: timestamp,
          updated_at: timestamp
        });

      if (error) {
        console.error(`❌ Error inserting event ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Event ${i + 1}/${events.length}: ${event.operation}`);
      }
    }

    // Update task status to completed
    await serviceSupabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', taskId);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Successfully populated task with real events!');
    console.log(`📊 Task ID: ${taskId}`);
    console.log(`📊 Total Events: ${events.length}`);
    console.log('═'.repeat(60));
    console.log('\n🎯 Next Steps:');
    console.log('1. Open Dev Toolkit at http://localhost:8081/dev-toolkit-standalone');
    console.log('2. The task should auto-select with real event data');
    console.log('3. Click on timeline events to see full payloads');
    console.log('4. Navigate through all tabs to see complete data');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Run the script
populateRealTaskEvents().catch(console.error);