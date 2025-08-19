const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NzM4MywiZXhwIjoyMDY4NjIzMzgzfQ.tPBuIjB_JF4aW0NEmYwzVfbg1zcFUo1r1eOTeZVWuyw';

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyEvents() {
  const taskId = '96eec43e-7bfe-4933-95d3-b3720b8e5899'; // Task 3
  
  console.log('🔍 Verifying events for task:', taskId);
  console.log('─'.repeat(60));
  
  // Check events with this task_id
  const { data: events, error } = await serviceSupabase
    .from('task_context_events')
    .select('id, task_id, operation, actor_id, sequence_number, created_at')
    .eq('task_id', taskId)
    .order('sequence_number', { ascending: true });
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (events && events.length > 0) {
    console.log(`✅ Found ${events.length} events for task ${taskId}:`);
    events.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.operation} (seq: ${event.sequence_number})`);
    });
  } else {
    console.log('⚠️ No events found for this task_id');
    
    // Check what events exist
    const { data: allEvents, error: allError } = await serviceSupabase
      .from('task_context_events')
      .select('task_id, count', { count: 'exact' })
      .limit(5);
      
    if (!allError && allEvents) {
      console.log('\n📊 Sample of events in table:');
      const taskIds = [...new Set(allEvents.map(e => e.task_id))];
      for (const id of taskIds.slice(0, 3)) {
        const { count } = await serviceSupabase
          .from('task_context_events')
          .select('*', { count: 'exact' })
          .eq('task_id', id);
        console.log(`   Task ${id}: ${count} events`);
      }
    }
  }
  
  // Also check the task status
  const { data: task } = await serviceSupabase
    .from('tasks')
    .select('id, title, status, metadata')
    .eq('id', taskId)
    .single();
    
  if (task) {
    console.log('\n📋 Task details:');
    console.log(`   Title: ${task.title}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Metadata:`, task.metadata);
  }
}

verifyEvents().catch(console.error);