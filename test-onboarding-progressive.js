const { chromium } = require('playwright');
const fs = require('fs');

async function monitorOnboardingState() {
  console.log('🔍 Monitoring BizBuddy Onboarding State\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Navigate to the Lovable production URL
  const url = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
  console.log(`Loading ${url}...`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log('✅ Initial page loaded\n');
  
  // Monitor for 60 seconds, checking every 5 seconds
  const checkInterval = 5000;
  const totalTime = 60000;
  const checks = totalTime / checkInterval;
  
  for (let i = 0; i < checks; i++) {
    console.log(`\n⏱️  Check ${i + 1}/${checks} (${i * 5}s elapsed)`);
    
    // Check what's visible
    const elements = {
      'Loading spinner': await page.locator('.animate-spin').isVisible().catch(() => false),
      'Dashboard': await page.locator('text=Dashboard').isVisible().catch(() => false),
      'User email': await page.locator('text=gianmatteo.allyn.test@gmail.com').isVisible().catch(() => false),
      'Chat with Ally': await page.locator('text=Chat with Ally').isVisible().catch(() => false),
      'Setting up experience': await page.locator('text=Setting up your experience').isVisible().catch(() => false),
      'Onboarding card': await page.locator('[data-testid="onboarding-card"]').isVisible().catch(() => false),
      'Sign out button': await page.locator('text=Sign Out').isVisible().catch(() => false)
    };
    
    // Print what's visible
    const visibleElements = Object.entries(elements)
      .filter(([_, visible]) => visible)
      .map(([element]) => element);
    
    if (visibleElements.length > 0) {
      console.log('  ✅ Visible:', visibleElements.join(', '));
    } else {
      console.log('  ⏳ Still loading...');
    }
    
    // Check auth state
    const hasAuth = await page.evaluate(() => {
      const token = localStorage.getItem('sb-cydmqfqbimqvpcejetxa-auth-token');
      return token !== null && token !== '';
    });
    console.log(`  🔐 Auth: ${hasAuth ? 'Present' : 'Missing'}`);
    
    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('  ❌ Console error:', msg.text());
      }
    });
    
    // Take screenshot at key intervals
    if (i === 0 || i === 5 || i === checks - 1) {
      await page.screenshot({ 
        path: `onboarding-state-${i * 5}s.png`,
        fullPage: true 
      });
      console.log(`  📸 Screenshot: onboarding-state-${i * 5}s.png`);
    }
    
    // If dashboard appears, check for onboarding
    if (elements['Dashboard']) {
      console.log('\n🎯 Dashboard loaded! Checking for onboarding...');
      
      // Wait a bit for any onboarding overlay
      await page.waitForTimeout(2000);
      
      const onboardingCheck = {
        'OnboardingCard overlay': await page.locator('[data-testid="onboarding-card"]').isVisible().catch(() => false),
        'Welcome to SmallBizAlly': await page.locator('text=Welcome to SmallBizAlly').isVisible().catch(() => false),
        'Setting up overlay': await page.locator('.fixed.inset-0').isVisible().catch(() => false)
      };
      
      console.log('\nOnboarding elements:');
      for (const [element, visible] of Object.entries(onboardingCheck)) {
        console.log(`  ${visible ? '✅' : '❌'} ${element}`);
      }
      
      // Check if createOnboardingTask was called
      const networkLogs = [];
      page.on('request', request => {
        if (request.url().includes('onboarding') || request.url().includes('task')) {
          networkLogs.push(`${request.method()} ${request.url()}`);
        }
      });
      
      await page.waitForTimeout(3000);
      
      if (networkLogs.length > 0) {
        console.log('\n📡 Onboarding API calls:');
        networkLogs.forEach(log => console.log(`  - ${log}`));
      }
      
      break; // Exit loop once dashboard loads
    }
    
    // Wait before next check
    if (i < checks - 1) {
      await page.waitForTimeout(checkInterval);
    }
  }
  
  // Final analysis
  console.log('\n📊 Final Analysis:');
  const finalUrl = page.url();
  console.log(`  URL: ${finalUrl}`);
  
  const isDashboardVisible = await page.locator('text=Dashboard').isVisible().catch(() => false);
  const isOnboardingVisible = await page.locator('[data-testid="onboarding-card"]').isVisible().catch(() => false);
  
  if (isDashboardVisible && !isOnboardingVisible) {
    console.log('  ❌ Dashboard loaded but NO onboarding overlay detected');
    console.log('  💡 This suggests onboarding is not triggering for the test user');
  } else if (isDashboardVisible && isOnboardingVisible) {
    console.log('  ✅ Dashboard loaded with onboarding overlay');
  } else {
    console.log('  ⚠️  App may still be loading or have errors');
  }
  
  await browser.close();
}

// Run the monitoring
monitorOnboardingState().catch(console.error);