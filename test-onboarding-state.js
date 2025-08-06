const { chromium } = require('playwright');
const fs = require('fs');

async function analyzeOnboardingState() {
  console.log('🔍 Analyzing BizBuddy Onboarding State\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Navigate to the Lovable production URL
  const url = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
  console.log(`Loading ${url}...`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');
    
    // Wait a bit for any redirects or dynamic content
    await page.waitForTimeout(3000);
    
    console.log('Current URL:', page.url());
    console.log('Page Title:', await page.title());
    
    // Analyze what's visible
    console.log('\n📋 Checking UI Elements:');
    
    const elements = {
      // Dashboard elements
      'Dashboard visible': await page.locator('text=Dashboard').isVisible().catch(() => false),
      'User email visible': await page.locator('text=gianmatteo.allyn.test@gmail.com').isVisible().catch(() => false),
      'Chat with Ally': await page.locator('text=Chat with Ally').isVisible().catch(() => false),
      
      // Onboarding elements
      'Welcome to BizBuddy': await page.locator('text=Welcome to BizBuddy').isVisible().catch(() => false),
      'Onboarding card': await page.locator('[data-testid="onboarding-card"]').isVisible().catch(() => false),
      'Get Started button': await page.locator('text=Get Started').isVisible().catch(() => false),
      'Setting up experience': await page.locator('text=Setting up your experience').isVisible().catch(() => false),
      
      // Auth elements  
      'Sign in button': await page.locator('text=Sign in with Google').isVisible().catch(() => false)
    };
    
    for (const [element, visible] of Object.entries(elements)) {
      console.log(`  ${visible ? '✅' : '❌'} ${element}`);
    }
    
    // Check localStorage
    console.log('\n🔐 Authentication State:');
    const authState = await page.evaluate(() => {
      const token = localStorage.getItem('sb-cydmqfqbimqvpcejetxa-auth-token');
      if (!token) return null;
      
      try {
        const parsed = JSON.parse(token);
        return {
          hasToken: true,
          userEmail: parsed.user?.email,
          userId: parsed.user?.id,
          expiresAt: parsed.expires_at
        };
      } catch {
        return { hasToken: true, parseError: true };
      }
    });
    
    if (authState) {
      console.log('  ✅ Auth token present');
      if (authState.userEmail) {
        console.log(`  📧 User: ${authState.userEmail}`);
        console.log(`  🆔 ID: ${authState.userId}`);
      }
    } else {
      console.log('  ❌ No auth token found');
    }
    
    // Check for backend calls
    console.log('\n🌐 Checking Backend Communication:');
    
    // Listen for onboarding API calls
    page.on('response', response => {
      const url = response.url();
      if (url.includes('onboarding') || url.includes('task')) {
        console.log(`  📡 Backend call: ${url.split('?')[0]} - ${response.status()}`);
      }
    });
    
    // Take screenshot
    await page.screenshot({ 
      path: 'onboarding-state.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: onboarding-state.png');
    
    // Wait to observe any dynamic behavior
    console.log('\n⏳ Observing for 30 seconds to allow full load...');
    await page.waitForTimeout(30000);
    
    // Final state check
    console.log('\n📊 Final State:');
    const finalUrl = page.url();
    console.log(`  URL: ${finalUrl}`);
    console.log(`  Has onboarding in URL: ${finalUrl.includes('onboarding')}`);
    
    // Check if OnboardingCard component is mounted
    const hasOnboardingCard = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid*="onboarding"], [class*="onboarding"]');
      return cards.length > 0;
    });
    console.log(`  OnboardingCard component: ${hasOnboardingCard ? 'Present' : 'Not found'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the analysis
analyzeOnboardingState().catch(console.error);