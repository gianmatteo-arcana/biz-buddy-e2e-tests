#!/usr/bin/env node

/**
 * Check if task_context_events table has ANY data
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MDUzMTgsImV4cCI6MjA0NjQ4MTMxOH0.GOEr-RJQG8VmAnCCaIScmUrGfvZ2h6WMU-5S_MzoJzg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTaskContextEvents() {
  console.log('🔍 CHECKING TASK_CONTEXT_EVENTS TABLE');
  console.log('=' .repeat(60));
  
  try {
    // First, check if the table exists and get its count
    const { count, error: countError } = await supabase
      .from('task_context_events')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Error accessing table:', countError.message);
      return;
    }
    
    console.log(`\n📊 Total records in task_context_events: ${count || 0}`);
    
    if (count && count > 0) {
      // Get a sample of recent events
      const { data: events, error } = await supabase
        .from('task_context_events')
        .select('id, task_id, agent_name, action, reasoning, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && events) {
        console.log('\n📋 Recent events:');
        events.forEach((event, i) => {
          console.log(`\n${i + 1}. Event ${event.id.substring(0, 8)}...`);
          console.log(`   Task: ${event.task_id}`);
          console.log(`   Agent: ${event.agent_name}`);
          console.log(`   Action: ${event.action}`);
          console.log(`   Has reasoning: ${!!event.reasoning}`);
          console.log(`   Created: ${event.created_at}`);
        });
        
        // Get unique agents
        const { data: agents } = await supabase
          .from('task_context_events')
          .select('agent_name')
          .limit(100);
        
        if (agents) {
          const uniqueAgents = [...new Set(agents.map(a => a.agent_name))];
          console.log('\n🤖 Unique agents in table:', uniqueAgents.join(', '));
        }
        
        // Get unique task IDs
        const { data: tasks } = await supabase
          .from('task_context_events')
          .select('task_id')
          .limit(100);
        
        if (tasks) {
          const uniqueTasks = [...new Set(tasks.map(t => t.task_id))];
          console.log(`\n📝 Unique tasks with events: ${uniqueTasks.length}`);
          console.log('   Task IDs:', uniqueTasks.slice(0, 3).join(', '), '...');
        }
      }
    } else {
      console.log('\n⚠️ The task_context_events table is EMPTY!');
      console.log('This explains why no agent activity is visible in the Dev Toolkit.');
      console.log('\nPossible reasons:');
      console.log('1. The onboarding orchestrator code is not being triggered');
      console.log('2. The events are being created but not saved to the database');
      console.log('3. The table has wrong permissions preventing inserts');
      
      // Check table structure
      console.log('\n🔍 Checking table structure...');
      const { data: columns, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'task_context_events' })
        .single();
      
      if (!schemaError && columns) {
        console.log('Table columns:', columns);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTaskContextEvents();