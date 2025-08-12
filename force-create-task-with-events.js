#!/usr/bin/env node

/**
 * FORCE CREATE TASK WITH EVENTS
 * 
 * This test directly calls the orchestrator to create a task
 * and monitors if events are created
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function forceCreateTaskWithEvents() {
  const outputDir = `/Users/gianmatteo/Documents/Arcana-Prototype/tests/force-task-${Date.now()}`;
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log('🚀 FORCE CREATE TASK WITH EVENTS');
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
    console.log('📍 STEP 1: EXECUTE ORCHESTRATOR IN BROWSER CONTEXT');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('[OnboardingOrchestrator]') || 
          text.includes('[EventSourced]') ||
          text.includes('DATABASE')) {
        console.log('  🔍', text.substring(0, 200));
      }
    });
    
    page.on('pageerror', error => {
      console.error('  ❌ Error:', error.message);
    });
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(3000);
    
    // Execute orchestrator code directly in the page context
    console.log('\n📍 STEP 2: FORCE ORCHESTRATOR EXECUTION');
    console.log('-' .repeat(40));
    
    const result = await page.evaluate(async () => {
      try {
        // Import the orchestrator (it should be available in the bundle)
        const { onboardingOrchestrator } = await import('/src/services/agents/onboardingOrchestrator.ts');
        
        // Get current user
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return { error: 'No authenticated user' };
        }
        
        console.log('[TEST] Creating task for user:', user.id);
        
        // Force create a new onboarding task
        const taskId = await onboardingOrchestrator.createOnboardingTask(
          user.id,
          {
            firstName: 'Test',
            lastName: 'User',
            email: user.email,
            forceNew: true,
            testRun: Date.now()
          }
        );
        
        console.log('[TEST] Task created:', taskId);
        
        // Now check if events were created
        const { data: events, error } = await supabase
          .from('task_context_events')
          .select('*')
          .eq('task_id', taskId)
          .order('sequence_number', { ascending: true });
        
        return {
          success: true,
          taskId,
          userId: user.id,
          eventCount: events?.length || 0,
          events: events?.map(e => ({
            id: e.id,
            agent: e.agent_name,
            action: e.action,
            hasReasoning: !!e.reasoning
          })),
          error: error?.message
        };
        
      } catch (error) {
        console.error('[TEST] Failed:', error);
        return {
          error: error.message,
          stack: error.stack
        };
      }
    }).catch(err => {
      // If the direct import fails, try a different approach
      console.log('  Direct import failed, trying alternative approach...');
      return { error: 'Cannot import modules directly', fallback: true };
    });
    
    console.log('\nResult:', JSON.stringify(result, null, 2));
    
    if (result.fallback) {
      // Alternative: Try to trigger through the UI
      console.log('\n📍 STEP 3: ALTERNATIVE - TRIGGER VIA UI');
      console.log('-' .repeat(40));
      
      // Look for any button or action that might create a task
      const created = await page.evaluate(() => {
        // Try to find and click "Start New Onboarding" or similar
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('Start') || 
              btn.textContent?.includes('New') ||
              btn.textContent?.includes('Onboarding')) {
            btn.click();
            return { clicked: true, text: btn.textContent };
          }
        }
        
        // Try to manually trigger if the hook is available
        if (window.__agentCommunication) {
          window.__agentCommunication.createOnboardingTask({
            test: true,
            timestamp: Date.now()
          });
          return { triggered: 'via window.__agentCommunication' };
        }
        
        return { error: 'No trigger found' };
      });
      
      console.log('  UI trigger result:', created);
      await page.waitForTimeout(5000);
    }
    
    // Step 4: Check Dev Toolkit for any events
    console.log('\n📍 STEP 4: CHECK DEV TOOLKIT FOR EVENTS');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    await devPage.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await devPage.waitForTimeout(3000);
    
    // Go to Task History and refresh
    await devPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task History')) {
          btn.click();
          setTimeout(() => {
            // Click refresh
            const refreshBtns = document.querySelectorAll('button');
            for (const rBtn of refreshBtns) {
              const svgs = rBtn.querySelectorAll('svg');
              for (const svg of svgs) {
                if (svg.getAttribute('class')?.includes('refresh')) {
                  rBtn.click();
                  return;
                }
              }
            }
          }, 1000);
          break;
        }
      }
    });
    
    await devPage.waitForTimeout(3000);
    
    await devPage.screenshot({
      path: path.join(outputDir, 'dev-toolkit-tasks.png'),
      fullPage: true
    });
    
    // Step 5: Direct database check
    console.log('\n📍 STEP 5: DIRECT DATABASE CHECK');
    console.log('-' .repeat(40));
    
    const dbCheck = await devPage.evaluate(async () => {
      try {
        // Try to access Supabase if available
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          'https://raenkewzlvrdqufwxjpl.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MDUzMTgsImV4cCI6MjA0NjQ4MTMxOH0.GOEr-RJQG8VmAnCCaIScmUrGfvZ2h6WMU-5S_MzoJzg'
        );
        
        // Get auth token from localStorage
        const authData = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.access_token) {
            // Set the session
            await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token
            });
          }
        }
        
        // Query task_context_events
        const { data, error, count } = await supabase
          .from('task_context_events')
          .select('*', { count: 'exact' })
          .limit(5)
          .order('created_at', { ascending: false });
        
        return {
          totalEvents: count || 0,
          recentEvents: data?.length || 0,
          error: error?.message,
          sample: data?.[0]
        };
      } catch (e) {
        return { error: e.message };
      }
    }).catch(err => ({ error: 'Eval failed: ' + err.message }));
    
    console.log('  Database check:', JSON.stringify(dbCheck, null, 2));
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n📋 Collected Logs with Keywords:');
    const keywordLogs = logs.filter(log => 
      log.includes('Orchestrator') || 
      log.includes('EventSourced') ||
      log.includes('task') ||
      log.includes('DATABASE')
    );
    
    keywordLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.substring(0, 150)}`);
    });
    
    // Save logs
    await fs.writeFile(
      path.join(outputDir, 'all-logs.json'),
      JSON.stringify(logs, null, 2)
    );
    
    console.log(`\n📁 Results saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
forceCreateTaskWithEvents().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});