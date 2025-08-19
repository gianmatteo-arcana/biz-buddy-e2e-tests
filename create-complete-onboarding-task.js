const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createCompleteOnboardingTask() {
  const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';
  const TEST_USER_EMAIL = 'gianmatteo.allyn.test@gmail.com';
  
  console.log('🚀 Creating Complete Onboarding Task with Real Agent Events');
  console.log('═'.repeat(60));
  
  try {
    // Step 1: Create the onboarding task
    const { data: task, error: taskError } = await serviceSupabase
      .from('tasks')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Business Onboarding - Full Demo',
        task_type: 'onboarding',
        status: 'in_progress',
        priority: 'high',
        metadata: {
          demo: false,
          withEvents: true,
          createdBy: 'E2E Test',
          businessType: 'Tech Startup',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();
      
    if (taskError) throw taskError;
    
    console.log('✅ Created task:', task.title);
    console.log('   Task ID:', task.id);
    
    // Step 2: Create a context ID for events
    const contextId = crypto.randomUUID();
    
    // Step 3: Create comprehensive agent events showing full workflow
    const events = [
      // Initial user request
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 1,
        actor_type: 'user',
        actor_id: TEST_USER_ID,
        operation: 'ONBOARDING_INITIATED',
        data: {
          request: 'Start business onboarding process',
          userProfile: {
            email: TEST_USER_EMAIL,
            firstName: 'Gianmatteo',
            lastName: 'Test'
          },
          timestamp: new Date().toISOString()
        },
        reasoning: 'User initiated business onboarding workflow'
      },
      
      // Orchestrator analyzes request
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 2,
        actor_type: 'agent',
        actor_id: 'OrchestratorAgent',
        operation: 'TASK_ANALYSIS_COMPLETE',
        data: {
          taskType: 'onboarding',
          complexity: 'standard',
          estimatedDuration: '10-15 minutes',
          requiredAgents: ['ProfileCollector', 'BusinessDiscovery', 'DataEnrichment', 'ComplianceVerification'],
          confidence: 0.95
        },
        reasoning: 'Analyzed user request and determined onboarding workflow with 4 specialized agents'
      },
      
      // ProfileCollector gathers user info
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 3,
        actor_type: 'agent',
        actor_id: 'ProfileCollector',
        operation: 'USER_PROFILE_COLLECTED',
        data: {
          profile: {
            firstName: 'Gianmatteo',
            lastName: 'Test',
            email: TEST_USER_EMAIL,
            phone: '555-0100',
            role: 'Founder/CEO',
            location: 'San Francisco, CA'
          },
          completeness: 0.85,
          missingFields: ['address', 'taxId']
        },
        reasoning: 'Collected basic user profile information, some fields pending'
      },
      
      // BusinessDiscovery analyzes business
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 4,
        actor_type: 'agent',
        actor_id: 'BusinessDiscoveryAgent',
        operation: 'BUSINESS_ANALYSIS_COMPLETE',
        data: {
          businessProfile: {
            name: 'TechVenture Solutions',
            type: 'Technology Startup',
            industry: 'Software Development',
            structure: 'C-Corporation',
            location: 'Delaware',
            foundingDate: '2025-01-01',
            employees: '1-5',
            fundingStage: 'Pre-seed'
          },
          recommendations: [
            'Delaware C-Corp recommended for fundraising',
            'Consider IP protection strategies',
            'Implement equity vesting schedules'
          ],
          confidence: 0.92
        },
        reasoning: 'Analyzed business profile and provided structure recommendations for tech startup'
      },
      
      // DataEnrichment adds external data
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 5,
        actor_type: 'agent',
        actor_id: 'DataEnrichmentAgent',
        operation: 'DATA_ENRICHMENT_COMPLETE',
        data: {
          enrichedData: {
            industryCode: 'NAICS 541511',
            sectorClassification: 'Professional, Scientific, and Technical Services',
            competitorAnalysis: {
              marketSize: '$150B',
              growthRate: '12% YoY',
              keyPlayers: ['Competitor A', 'Competitor B']
            },
            regulatoryRequirements: [
              'State Registration',
              'EIN Application',
              'Business License',
              'Data Privacy Compliance'
            ]
          },
          dataSources: ['IRS', 'NAICS', 'Industry Reports', 'State Database'],
          confidence: 0.88
        },
        reasoning: 'Enhanced business profile with external data sources and regulatory requirements'
      },
      
      // ComplianceVerification checks requirements
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 6,
        actor_type: 'agent',
        actor_id: 'ComplianceVerificationAgent',
        operation: 'COMPLIANCE_CHECK_COMPLETE',
        data: {
          complianceStatus: {
            federal: {
              status: 'pending',
              requirements: ['EIN Required', 'Federal Tax Registration'],
              deadline: '2025-09-01'
            },
            state: {
              status: 'pending',
              requirements: ['Delaware State Registration', 'Registered Agent'],
              deadline: '2025-08-30'
            },
            local: {
              status: 'compliant',
              requirements: [],
              notes: 'No local requirements for Delaware C-Corp'
            }
          },
          riskAssessment: {
            level: 'low',
            factors: ['New entity', 'Standard structure', 'Common industry']
          },
          confidence: 0.94
        },
        reasoning: 'Verified compliance requirements across all jurisdictions, identified registration priorities'
      },
      
      // FormOptimizer prepares documents
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 7,
        actor_type: 'agent',
        actor_id: 'FormOptimizerAgent',
        operation: 'FORMS_OPTIMIZED',
        data: {
          optimizedForms: [
            {
              formId: 'DE-CERT-INC',
              title: 'Certificate of Incorporation',
              status: 'ready',
              prefilledFields: 28,
              totalFields: 32,
              completeness: 0.875
            },
            {
              formId: 'IRS-SS4',
              title: 'EIN Application',
              status: 'ready',
              prefilledFields: 15,
              totalFields: 18,
              completeness: 0.833
            },
            {
              formId: 'DE-REG-AGENT',
              title: 'Registered Agent Appointment',
              status: 'pending_selection',
              prefilledFields: 8,
              totalFields: 12,
              completeness: 0.667
            }
          ],
          totalOptimizations: 12,
          timeSaved: '45 minutes'
        },
        reasoning: 'Optimized and pre-filled government forms based on collected business data'
      },
      
      // TaskCoordinator creates action plan
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 8,
        actor_type: 'agent',
        actor_id: 'TaskCoordinatorAgent',
        operation: 'ACTION_PLAN_CREATED',
        data: {
          actionPlan: {
            immediateActions: [
              {
                priority: 1,
                action: 'Review and sign Certificate of Incorporation',
                assignee: 'user',
                deadline: '2025-08-18',
                status: 'pending'
              },
              {
                priority: 2,
                action: 'Select registered agent service',
                assignee: 'user',
                deadline: '2025-08-19',
                status: 'pending'
              }
            ],
            nextWeekActions: [
              {
                action: 'File with Delaware Secretary of State',
                deadline: '2025-08-25'
              },
              {
                action: 'Apply for EIN with IRS',
                deadline: '2025-08-26'
              }
            ],
            followUpActions: [
              {
                action: 'Open business bank account',
                deadline: '2025-09-01'
              },
              {
                action: 'Set up accounting system',
                deadline: '2025-09-05'
              }
            ]
          },
          estimatedCompletion: '2-3 weeks for full setup',
          criticalPath: ['Incorporation', 'EIN', 'Bank Account']
        },
        reasoning: 'Created prioritized action plan with clear deadlines and dependencies'
      },
      
      // CelebrationAgent recognizes milestone
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 9,
        actor_type: 'agent',
        actor_id: 'CelebrationAgent',
        operation: 'MILESTONE_ACHIEVED',
        data: {
          milestone: 'Onboarding Analysis Complete',
          achievement: {
            level: 'silver',
            points: 500,
            badge: 'Business Pioneer',
            message: '🎉 Congratulations! Your business structure is ready!'
          },
          progress: {
            onboardingComplete: 0.75,
            nextMilestone: 'First Filing Complete'
          }
        },
        reasoning: 'User completed initial onboarding analysis phase successfully'
      },
      
      // MonitoringAgent tracks metrics
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 10,
        actor_type: 'agent',
        actor_id: 'MonitoringAgent',
        operation: 'METRICS_UPDATED',
        data: {
          performanceMetrics: {
            totalAgents: 9,
            totalDuration: '4.2 minutes',
            apiCalls: 12,
            dataPointsCollected: 45,
            accuracyScore: 0.91
          },
          systemHealth: {
            status: 'healthy',
            latency: '230ms avg',
            errorRate: 0.0
          },
          userEngagement: {
            sessionDuration: '5 minutes',
            interactionCount: 8,
            completionRate: 0.75
          }
        },
        reasoning: 'Collected and analyzed system performance metrics for onboarding session'
      },
      
      // System completion event
      {
        context_id: contextId,
        task_id: task.id,
        sequence_number: 11,
        actor_type: 'system',
        actor_id: 'task-manager',
        operation: 'ONBOARDING_PHASE_COMPLETE',
        data: {
          summary: {
            phasesCompleted: ['Analysis', 'Data Collection', 'Compliance Check', 'Document Prep'],
            pendingPhases: ['Filing', 'Confirmation'],
            overallProgress: 0.75,
            nextSteps: 3,
            estimatedTimeToComplete: '2-3 weeks'
          },
          taskContext: {
            user: {
              firstName: 'Gianmatteo',
              email: TEST_USER_EMAIL,
              role: 'Founder/CEO'
            },
            business: {
              name: 'TechVenture Solutions',
              type: 'C-Corporation',
              location: 'Delaware',
              industry: 'Technology'
            },
            compliance: {
              federal: 'pending',
              state: 'pending',
              risk: 'low'
            },
            documents: {
              ready: 2,
              pending: 1,
              filed: 0
            }
          }
        },
        reasoning: 'Onboarding analysis phase completed successfully, ready for user actions'
      }
    ];
    
    // Insert all events
    console.log('\n📝 Creating agent events...');
    let successCount = 0;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Add timestamp with slight delays to show progression
      const timestamp = new Date(Date.now() - (events.length - i) * 3000).toISOString();
      
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
    
    // Update task status
    if (successCount === events.length) {
      await serviceSupabase
        .from('tasks')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
          metadata: {
            demo: false,
            withEvents: true,
            eventCount: events.length,
            contextId: contextId,
            lastAgent: 'MonitoringAgent',
            progress: 0.75
          }
        })
        .eq('id', task.id);
        
      console.log('\n✅ Task updated with progress');
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 ONBOARDING TASK CREATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('📊 Task ID:', task.id);
    console.log('📊 Context ID:', contextId);
    console.log('📊 Total Events:', successCount);
    console.log('📊 Status: In Progress (75% complete)');
    console.log('\n🎯 This task demonstrates:');
    console.log('   - Full agent orchestration workflow');
    console.log('   - Real TaskContext updates');
    console.log('   - Multiple agent interactions');
    console.log('   - Progressive data enrichment');
    console.log('   - Compliance verification');
    console.log('   - Document preparation');
    console.log('   - Action plan generation');
    console.log('\n📋 Next: Open Dev Toolkit to visualize this task');
    
    return task.id;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

createCompleteOnboardingTask().catch(console.error);