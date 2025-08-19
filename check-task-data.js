const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTaskData() {
  const TEST_USER_ID = '8e8ea7bd-b7fb-4e77-8e34-aa551fe26934';
  
  console.log('🔍 Checking task and context data...\n');
  
  // Get tasks
  const { data: tasks, error: tasksError } = await serviceSupabase
    .from('tasks')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: false });
    
  if (tasksError) {
    console.error('❌ Error fetching tasks:', tasksError);
    return;
  }
  
  console.log(`✅ Found ${tasks.length} tasks for user`);
  
  for (const task of tasks.slice(0, 3)) {
    console.log(`\n📋 Task: ${task.title} (${task.id})`);
    console.log(`   Status: ${task.status}`);
    
    // Check for task context
    const { data: contexts, error: contextError } = await serviceSupabase
      .from('task_contexts')
      .select('*')
      .eq('task_id', task.id);
      
    if (contextError) {
      console.error('   ❌ Error fetching context:', contextError);
    } else if (contexts && contexts.length > 0) {
      console.log(`   ✅ Has context: ${contexts[0].id}`);
      
      // Check for events
      const { data: events, error: eventsError } = await serviceSupabase
        .from('task_context_events')
        .select('id, operation, actor_type')
        .eq('context_id', contexts[0].id);
        
      if (eventsError) {
        console.error('   ❌ Error fetching events:', eventsError);
      } else {
        console.log(`   📊 Events: ${events.length}`);
        if (events.length > 0) {
          console.log(`   🎯 Sample operations: ${events.slice(0, 3).map(e => e.operation).join(', ')}`);
        }
      }
    } else {
      console.log('   ⚠️ No context found');
    }
  }
  
  // Check the task_context_events table structure
  console.log('\n📋 Checking task_context_events table...');
  const { data: sampleEvent, error: sampleError } = await serviceSupabase
    .from('task_context_events')
    .select('*')
    .limit(1);
    
  if (sampleError) {
    console.error('❌ Error checking events table:', sampleError);
  } else if (sampleEvent && sampleEvent.length > 0) {
    console.log('✅ Table structure:', Object.keys(sampleEvent[0]));
  } else {
    console.log('⚠️ No events in table');
  }
}

checkTaskData().catch(console.error);