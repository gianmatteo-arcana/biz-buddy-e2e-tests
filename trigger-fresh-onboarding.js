#!/usr/bin/env node

/**
 * TRIGGER FRESH ONBOARDING
 * 
 * Clears user's business profile to trigger fresh onboarding
 * which will call the orchestrator and create events
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;

// Read auth state to get user token
async function getAuthToken() {
  try {
    const authState = await fs.readFile('.auth/user-state.json', 'utf-8');
    const state = JSON.parse(authState);
    
    // Find the localStorage entry with auth token
    for (const origin of state.origins) {
      for (const item of origin.localStorage) {
        if (item.name.includes('auth-token')) {
          const tokenData = JSON.parse(item.value);
          return tokenData.access_token;
        }
      }
    }
  } catch (error) {
    console.error('Failed to read auth token:', error);
  }
  return null;
}

async function triggerFreshOnboarding() {
  console.log('🔄 TRIGGER FRESH ONBOARDING');
  console.log('=' .repeat(60));
  console.log('📅 Date:', new Date().toLocaleString());
  console.log('=' .repeat(60) + '\n');
  
  // Get auth token
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ No auth token found');
    return;
  }
  
  // Create Supabase client with user token
  const supabase = createClient(
    'https://raenkewzlvrdqufwxjpl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MDUzMTgsImV4cCI6MjA0NjQ4MTMxOH0.GOEr-RJQG8VmAnCCaIScmUrGfvZ2h6WMU-5S_MzoJzg',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
  
  console.log('📍 STEP 1: CLEAR USER BUSINESS PROFILE');
  console.log('-' .repeat(40));
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('❌ Failed to get user:', userError);
    return;
  }
  
  console.log(`  User: ${user.email}`);
  
  // Update profile to clear business info
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      business_id: null,
      business_name: null,
      business_address: null,
      business_type: null,
      business_ein: null,
      business_formation_date: null
    })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('❌ Failed to clear profile:', updateError);
    return;
  }
  
  console.log('  ✅ Cleared business profile');
  
  // Now open the app with Playwright
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  try {
    console.log('\n📍 STEP 2: OPEN APP TO TRIGGER ONBOARDING');
    console.log('-' .repeat(40));
    
    const page = await context.newPage();
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      
      // Look for our debug logs
      if (text.includes('[OnboardingOrchestrator]') || 
          text.includes('[EventSourced]') ||
          text.includes('TRIGGERING ONBOARDING') ||
          text.includes('EVENT SAVED TO DATABASE')) {
        console.log('  🔍', text.substring(0, 200));
      }
    });
    
    console.log('  Opening app (should trigger onboarding)...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    await page.waitForTimeout(10000); // Give it time to trigger
    
    // Check if onboarding was triggered
    const onboardingLogs = logs.filter(log => 
      log.includes('ONBOARDING') || 
      log.includes('Orchestrator') ||
      log.includes('EventSourced')
    );
    
    if (onboardingLogs.length > 0) {
      console.log(`\n  ✅ ONBOARDING TRIGGERED! Found ${onboardingLogs.length} related logs`);
      onboardingLogs.slice(0, 5).forEach((log, i) => {
        console.log(`    ${i + 1}. ${log.substring(0, 150)}`);
      });
    } else {
      console.log('  ⚠️ No onboarding logs captured');
    }
    
    // Wait a bit more for events to be created
    console.log('\n📍 STEP 3: WAIT FOR EVENTS TO BE CREATED');
    console.log('-' .repeat(40));
    await page.waitForTimeout(5000);
    
    // Check for event creation logs
    const eventLogs = logs.filter(log => 
      log.includes('EVENT SAVED TO DATABASE') ||
      log.includes('Event created successfully') ||
      log.includes('task_context_events')
    );
    
    if (eventLogs.length > 0) {
      console.log(`  ✅ EVENTS CREATED! Found ${eventLogs.length} event logs`);
      eventLogs.forEach((log, i) => {
        console.log(`    ${i + 1}. ${log.substring(0, 150)}`);
      });
    }
    
    // Step 4: Open Dev Toolkit to verify
    console.log('\n📍 STEP 4: CHECK DEV TOOLKIT FOR EVENTS');
    console.log('-' .repeat(40));
    
    const devPage = await context.newPage();
    
    devPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RealTimeVisualizer]') && text.includes('events')) {
        console.log('  🔍 DevToolkit:', text.substring(0, 150));
      }
    });
    
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
    
    // Look for the new onboarding task
    const taskFound = await devPage.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"]');
      for (const card of cards) {
        if (card.textContent?.includes('Onboarding') || 
            card.textContent?.includes('Business Profile')) {
          card.click();
          return card.textContent?.substring(0, 100);
        }
      }
      return null;
    });
    
    if (taskFound) {
      console.log(`  ✅ Found onboarding task: ${taskFound}`);
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
      
      await devPage.waitForTimeout(3000);
      
      // Check for agent activity
      const visualizerText = await devPage.evaluate(() => document.body.innerText);
      
      console.log('\n  📊 Agent Activity Check:');
      console.log(`    • Has timeline: ${visualizerText.includes('Timeline') ? '✅' : '❌'}`);
      console.log(`    • Has orchestrator: ${visualizerText.includes('orchestrator') ? '✅' : '❌'}`);
      console.log(`    • Has events: ${visualizerText.includes('event') ? '✅' : '❌'}`);
      console.log(`    • Has reasoning: ${visualizerText.includes('reasoning') ? '✅' : '❌'}`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    
    if (onboardingLogs.length > 0 && eventLogs.length > 0) {
      console.log('\n✅ SUCCESS! AGENT EVENTS ARE BEING CREATED!');
      console.log('The orchestrator is creating events and they should be visible in the Dev Toolkit.');
    } else if (onboardingLogs.length > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS');
      console.log('Onboarding was triggered but no event creation logs found.');
      console.log('Check the Dev Toolkit manually to see if events appear.');
    } else {
      console.log('\n❌ ONBOARDING NOT TRIGGERED');
      console.log('The user may already have onboarding in progress.');
    }
    
    console.log('\n📝 Total logs collected:', logs.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔍 Check the browser windows for live results');
    // Keep browser open for inspection
  }
}

// Run the test
triggerFreshOnboarding().then(() => {
  console.log('\n✅ Test completed');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});