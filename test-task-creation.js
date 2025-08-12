/**
 * Quick test to check what task status values are accepted
 */
const { chromium } = require('playwright');

async function testTaskCreation() {
  console.log('🧪 Testing task creation with different status values...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
  });
  const page = await context.newPage();
  
  // Test different status values
  const statusValues = ['pending', 'in_progress', 'active', 'completed', 'skipped'];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error creating') || text.includes('task created successfully') || text.includes('Task insert')) {
      console.log(`   Console: ${text.substring(0, 150)}`);
    }
  });
  
  try {
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Test each status value
    for (const status of statusValues) {
      console.log(`\n📍 Testing status: "${status}"`);
      
      const result = await page.evaluate(async (testStatus) => {
        try {
          // Import Supabase client
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
          const supabase = createClient(
            'https://raenkewzlvrdqufwxjpl.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEyMjUwNzUsImV4cCI6MjAzNjgwMTA3NX0.TQdxHWX2OAJjRQQ1xVhyJJq0jhpJNt8CvHTGHcbCrCA'
          );
          
          const { data: user } = await supabase.auth.getUser();
          if (!user?.user) {
            return { error: 'Not authenticated' };
          }
          
          console.log(`[Task Insert] Testing status: ${testStatus}`);
          
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              title: `Test Task ${testStatus}`,
              description: 'Test task creation',
              status: testStatus,
              priority: 'high',
              user_id: user.user.id,
              task_type: 'test',
              template_id: 'test_template'
            })
            .select()
            .single();
            
          if (error) {
            console.log(`[Task Insert] Error with status ${testStatus}: ${error.message}`);
            return { error: error.message, code: error.code };
          } else {
            console.log(`[Task Insert] Success with status ${testStatus}: Task ${data.id} created`);
            return { success: true, id: data.id };
          }
        } catch (e) {
          return { error: e.message };
        }
      }, status);
      
      if (result.error) {
        console.log(`   ❌ ${status}: ${result.error}`);
      } else {
        console.log(`   ✅ ${status}: Task created successfully`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testTaskCreation().catch(console.error);