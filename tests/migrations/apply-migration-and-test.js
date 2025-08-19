#!/usr/bin/env node

/**
 * APPLY MIGRATION AND TEST
 * 
 * Applies the RLS migration and then tests event creation
 */

const { chromium } = require('playwright');

async function applyMigrationAndTest() {
  console.log('🔧 APPLY MIGRATION AND TEST');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Step 1: Open Dev Panel
    console.log('📍 STEP 1: OPEN DEV PANEL TO APPLY MIGRATION');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Capture console for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Migration') || text.includes('RLS') || text.includes('task_context_events')) {
        console.log('  🔍', text);
      }
    });
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev');
    await page.waitForTimeout(3000);
    
    // Click on Migrations tab if available
    const migrationTab = await page.$('button:has-text("Migrations"), [role="tab"]:has-text("Migrations")');
    if (migrationTab) {
      await migrationTab.click();
      await page.waitForTimeout(2000);
      console.log('  ✅ Found Migrations tab');
      
      // Look for our RLS migration
      const migrationText = await page.evaluate(() => document.body.innerText);
      if (migrationText.includes('20250812013000_add_task_context_events_rls')) {
        console.log('  ✅ Found RLS migration in list');
        
        // Check if it needs to be applied
        if (migrationText.includes('pending') || migrationText.includes('Pending')) {
          console.log('  ⚠️ Migration is pending - needs to be applied');
          
          // Try to apply it
          const applyButton = await page.$('button:has-text("Apply"), button:has-text("Run")');
          if (applyButton) {
            await applyButton.click();
            console.log('  🚀 Applying migration...');
            await page.waitForTimeout(5000);
            console.log('  ✅ Migration applied');
          }
        } else {
          console.log('  ✅ Migration already applied');
        }
      }
    } else {
      // Try Dev Toolkit instead
      console.log('  Trying Dev Toolkit...');
      await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
      await page.waitForTimeout(3000);
      
      // Click Migrations tab
      const migTab = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Migrations')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (migTab) {
        console.log('  ✅ Opened Migrations in Dev Toolkit');
        await page.waitForTimeout(3000);
        
        // Check for pending migrations
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log('  Migrations status:', pageText.includes('pending') ? 'Has pending' : 'All applied');
      }
    }
    
    // Step 2: Test if we can now create events
    console.log('\n📍 STEP 2: TEST EVENT CREATION');
    console.log('-' .repeat(40));
    
    // Go back to main app
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(3000);
    
    // Try to create an event directly via console
    const eventTest = await page.evaluate(async () => {
      try {
        // Get Supabase client from window
        const supabase = window.supabase;
        if (!supabase) {
          return { error: 'Supabase not available on window' };
        }
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { error: 'No authenticated user' };
        }
        
        // First, get a task ID to test with
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (!tasks) {
          // Create a test task
          const { data: newTask, error: taskError } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              title: 'Test Task for Events',
              status: 'in_progress',
              priority: 1,
              task_type: 'test'
            })
            .select()
            .single();
          
          if (taskError) {
            return { error: 'Failed to create test task: ' + taskError.message };
          }
          
          tasks.id = newTask.id;
        }
        
        // Now try to create an event
        const testEvent = {
          task_id: tasks.id,
          agent_name: 'TestAgent',
          agent_version: '1.0.0',
          agent_instance_id: crypto.randomUUID(),
          action: 'test_action',
          reasoning: 'Testing if events can be created',
          confidence: 0.95,
          context_snapshot: { test: true, timestamp: Date.now() },
          context_diff: {
            added: { test: true },
            modified: {},
            removed: []
          }
        };
        
        console.log('[TEST] Attempting to insert event:', testEvent);
        
        const { data: insertedEvent, error: eventError } = await supabase
          .from('task_context_events')
          .insert(testEvent)
          .select()
          .single();
        
        if (eventError) {
          console.error('[TEST] Event insertion failed:', eventError);
          return {
            error: eventError.message,
            code: eventError.code,
            details: eventError.details,
            hint: eventError.hint
          };
        }
        
        console.log('[TEST] Event created successfully:', insertedEvent);
        
        return {
          success: true,
          taskId: tasks.id,
          eventId: insertedEvent.id,
          sequenceNumber: insertedEvent.sequence_number
        };
        
      } catch (error) {
        return {
          error: error.message,
          stack: error.stack
        };
      }
    });
    
    console.log('\nEvent creation test result:', JSON.stringify(eventTest, null, 2));
    
    if (eventTest.success) {
      console.log('\n✅ SUCCESS! Events can now be created!');
      console.log(`  Event ID: ${eventTest.eventId}`);
      console.log(`  Task ID: ${eventTest.taskId}`);
      
      // Step 3: Check if the event shows up in Dev Toolkit
      console.log('\n📍 STEP 3: VERIFY IN DEV TOOLKIT');
      console.log('-' .repeat(40));
      
      const devPage = await context.newPage();
      await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
      await devPage.waitForTimeout(3000);
      
      // Go to Task History
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Task History')) {
            btn.click();
            break;
          }
        }
      });
      
      await devPage.waitForTimeout(2000);
      
      // Refresh
      await devPage.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const svgs = btn.querySelectorAll('svg');
          for (const svg of svgs) {
            if (svg.getAttribute('class')?.includes('refresh')) {
              btn.click();
              return;
            }
          }
        }
      });
      
      await devPage.waitForTimeout(3000);
      
      // Select the test task if visible
      const selected = await devPage.evaluate((taskId) => {
        const cards = document.querySelectorAll('[class*="card"]');
        for (const card of cards) {
          if (card.textContent?.includes('Test Task') || card.textContent?.includes(taskId)) {
            card.click();
            return true;
          }
        }
        return false;
      }, eventTest.taskId);
      
      if (selected) {
        console.log('  ✅ Selected test task');
        await devPage.waitForTimeout(2000);
        
        // Switch to Agent Visualizer
        await devPage.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent?.includes('Agent Visualizer')) {
              btn.click();
              break;
            }
          }
        });
        
        await devPage.waitForTimeout(2000);
        
        const visualizerText = await devPage.evaluate(() => document.body.innerText);
        if (visualizerText.includes('TestAgent') || visualizerText.includes('test_action')) {
          console.log('  ✅ TEST AGENT EVENT IS VISIBLE IN DEV TOOLKIT!');
        } else {
          console.log('  ⚠️ Event not visible yet in visualizer');
        }
      }
    } else {
      console.log('\n❌ Event creation failed:', eventTest.error);
      if (eventTest.code === '42501') {
        console.log('  This is a permission error - RLS policies may not be applied yet');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔍 Test complete. Check the browser windows for results.');
    // Keep browser open for inspection
    // await browser.close();
  }
}

// Run the test
applyMigrationAndTest().then(() => {
  console.log('\n✅ Script completed');
}).catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});