#!/usr/bin/env node

/**
 * Create Task via Backend API
 * Uses the proper task service API to create tasks with events
 */

const TEST_USER_EMAIL = 'gianmatteo.allyn.test@gmail.com';
const BACKEND_URL = 'http://localhost:3001';

async function getAuthToken() {
  // Read auth state from saved file
  const fs = require('fs');
  try {
    const authState = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    const localStorage = authState.origins?.[0]?.localStorage;
    
    if (localStorage) {
      const authToken = localStorage.find(item => 
        item.name === 'sb-raenkewzlvrdqufwxjpl-auth-token'
      );
      
      if (authToken?.value) {
        const parsed = JSON.parse(authToken.value);
        return parsed.access_token;
      }
    }
  } catch (e) {
    console.log('Could not read auth token from file:', e.message);
  }
  return null;
}

async function createTaskViaAPI() {
  console.log('🚀 Creating Task via Backend API');
  console.log('═'.repeat(60));
  
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ No auth token found. Please authenticate first.');
    return;
  }
  
  console.log('✅ Found auth token');
  console.log('📧 User:', TEST_USER_EMAIL);
  console.log('🌐 Backend:', BACKEND_URL);
  console.log('');
  
  // Create task payload
  const taskPayload = {
    title: 'Complete Business Onboarding - TechVenture Solutions',
    description: 'Comprehensive business setup with multi-agent orchestration',
    template: 'business_onboarding',
    context: {
      business_name: 'TechVenture Solutions',
      entity_type: 'C-Corporation',
      state: 'Delaware',
      industry: 'Technology Consulting',
      ein: '88-1234567',
      employees: 5,
      website: 'techventure.com'
    }
  };
  
  try {
    console.log('📋 Creating task...');
    
    // Call the task creation API
    const response = await fetch(`${BACKEND_URL}/api/tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskPayload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Failed to create task:', response.status, error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Task created successfully!');
    console.log('   Task ID:', result.taskId || result.id);
    console.log('   Title:', result.title);
    console.log('   Status:', result.status);
    
    // If the API triggers orchestration, events should be created automatically
    if (result.orchestrationStarted) {
      console.log('   🤖 Orchestration started - agents are working...');
    }
    
    // Check for events after a delay
    if (result.taskId || result.id) {
      const taskId = result.taskId || result.id;
      console.log('\n⏳ Waiting 5 seconds for agents to process...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Fetch task events
      console.log('\n📊 Fetching task events...');
      const eventsResponse = await fetch(`${BACKEND_URL}/api/task-events/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (eventsResponse.ok) {
        const events = await eventsResponse.json();
        console.log('✅ Found', events.count || events.length || 0, 'events');
        
        if (events.events || events.data) {
          const eventList = events.events || events.data || [];
          console.log('\n📋 Recent events:');
          eventList.slice(0, 5).forEach(event => {
            console.log(`   - ${event.operation} by ${event.actor_id || event.actor}`);
          });
        }
      } else {
        console.log('⚠️ Could not fetch events:', eventsResponse.status);
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 Task created via API!');
    console.log('═'.repeat(60));
    console.log('✅ The DevToolkit should now show this task with events');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Alternative: Create task with manual orchestration trigger
async function createAndOrchestrateTask() {
  console.log('🚀 Creating and Orchestrating Task via Backend API');
  console.log('═'.repeat(60));
  
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ No auth token found. Please authenticate first.');
    return;
  }
  
  try {
    // First create the task
    const createResponse = await fetch(`${BACKEND_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Business Formation - Advanced Demo',
        description: 'Full orchestration demonstration',
        priority: 'high',
        task_type: 'onboarding'
      })
    });
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create task:', createResponse.status);
      return;
    }
    
    const task = await createResponse.json();
    console.log('✅ Task created:', task.id);
    
    // Trigger orchestration
    console.log('🤖 Triggering orchestration...');
    const orchestrateResponse = await fetch(`${BACKEND_URL}/api/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        taskId: task.id,
        action: 'start_onboarding'
      })
    });
    
    if (orchestrateResponse.ok) {
      const result = await orchestrateResponse.json();
      console.log('✅ Orchestration triggered!');
      console.log('   Agents working:', result.agentsInvolved || 'multiple');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check which approach to use based on backend capabilities
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--orchestrate')) {
    await createAndOrchestrateTask();
  } else {
    await createTaskViaAPI();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createTaskViaAPI, createAndOrchestrateTask };