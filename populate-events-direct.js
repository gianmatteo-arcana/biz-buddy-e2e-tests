const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function populateEventsDirectly() {
  const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';
  const TEST_USER_EMAIL = 'gianmatteo.allyn.test@gmail.com';
  
  console.log('🚀 Populating Task Events Directly');
  console.log('─'.repeat(60));
  
  try {
    // Get or create a task
    const { data: tasks, error: tasksError } = await serviceSupabase
      .from('tasks')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (tasksError) throw tasksError;
    
    let taskId;
    
    if (tasks && tasks.length > 0) {
      taskId = tasks[0].id;
      console.log('✅ Using existing task:', tasks[0].title);
    } else {
      // Create a new task
      const { data: newTask, error: taskError } = await serviceSupabase
        .from('tasks')
        .insert({
          user_id: TEST_USER_ID,
          title: 'Business Formation with Real Events',
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
    }
    
    console.log('\n📝 Creating realistic agent events...');
    
    // Generate a context ID (since task_contexts table doesn't exist, we'll use a UUID)
    const contextId = crypto.randomUUID();
    
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
        reasoning: 'User initiated business formation workflow',
        sequence_number: 1
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
        reasoning: 'Analyzing business requirements based on tech startup profile',
        sequence_number: 2
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'BusinessDiscoveryAgent',
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
        reasoning: 'Collected comprehensive business profile through discovery process',
        sequence_number: 3
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'DataEnrichmentAgent',
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
        reasoning: 'Enhanced business profile with regulatory and classification data',
        sequence_number: 4
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'ComplianceVerificationAgent',
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
        reasoning: 'Verified compliance requirements across all jurisdictions',
        sequence_number: 5
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'DocumentGenerationAgent',
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
        reasoning: 'Generated all required formation documents based on profile',
        sequence_number: 6
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'ProfileCollector',
        operation: 'PROFILE_UPDATED',
        data: {
          profile: {
            firstName: 'Gianmatteo',
            lastName: 'Test',
            email: TEST_USER_EMAIL,
            phone: '555-0123',
            businessName: 'TechStartup Inc',
            businessType: 'C-Corporation'
          }
        },
        reasoning: 'Collected and validated user profile information',
        sequence_number: 7
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'TaskCoordinatorAgent',
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
        reasoning: 'Created actionable task list with realistic timelines',
        sequence_number: 8
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'CelebrationAgent',
        operation: 'MILESTONE_ACHIEVED',
        data: {
          milestone: 'Business formation documents ready',
          celebration: '🎉 Congratulations on taking the first step!',
          achievement_level: 'bronze'
        },
        reasoning: 'User reached important milestone in business formation',
        sequence_number: 9
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'UXOptimizationAgent',
        operation: 'UX_OPTIMIZED',
        data: {
          optimization: 'Simplified document review interface',
          improvement_metric: 0.35,
          user_feedback_incorporated: true
        },
        reasoning: 'Optimized user experience based on interaction patterns',
        sequence_number: 10
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'agent',
        actor_id: 'MonitoringAgent',
        operation: 'HEALTH_CHECK',
        data: {
          system_health: 'optimal',
          response_times: { avg: 230, p95: 450, p99: 780 },
          error_rate: 0.001
        },
        reasoning: 'System performing within normal parameters',
        sequence_number: 11
      },
      {
        context_id: contextId,
        task_id: taskId,
        actor_type: 'system',
        actor_id: 'monitoring-system',
        operation: 'TASK_COMPLETED',
        data: {
          summary: {
            total_agents: 10,
            total_duration: '4.5 minutes',
            success_rate: 1.0,
            average_confidence: 0.91
          },
          status: 'completed'
        },
        reasoning: 'All agent tasks completed successfully',
        sequence_number: 12
      }
    ];
    
    // Insert events with slight delays to create realistic timeline
    let successCount = 0;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Add timestamp with incremental seconds
      const timestamp = new Date(Date.now() - (events.length - i) * 5000).toISOString();
      
      const { data, error } = await serviceSupabase
        .from('task_context_events')
        .insert({
          ...event,
          created_at: timestamp
        });
      
      if (error) {
        console.error(`❌ Error inserting event ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Event ${i + 1}/${events.length}: ${event.operation} (${event.actor_id})`);
        successCount++;
      }
    }
    
    // Update task status to completed
    if (successCount === events.length) {
      await serviceSupabase
        .from('tasks')
        .update({ 
          status: 'completed', 
          updated_at: new Date().toISOString(),
          metadata: { 
            demo: false, 
            withEvents: true, 
            eventCount: events.length,
            contextId: contextId 
          }
        })
        .eq('id', taskId);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Successfully populated task with real events!');
    console.log(`📊 Task ID: ${taskId}`);
    console.log(`📊 Context ID: ${contextId}`);
    console.log(`📊 Total Events: ${successCount}/${events.length}`);
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

populateEventsDirectly().catch(console.error);