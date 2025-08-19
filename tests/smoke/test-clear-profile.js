const { chromium } = require('playwright');

/**
 * Clear profile data to trigger onboarding
 */
async function clearProfileForOnboarding() {
  console.log('🧹 Clearing Profile to Trigger Onboarding\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for app to load
    await page.waitForTimeout(3000);
    
    // Execute profile clearing via console
    const result = await page.evaluate(async () => {
      try {
        // Import Supabase from the app
        const supabaseModule = await import('/src/integrations/supabase/client.ts');
        const supabase = supabaseModule.supabase;
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return { error: 'No user logged in' };
        }
        
        // Update profile to clear business data
        const { data, error } = await supabase
          .from('profiles')
          .update({
            business_name: null,
            business_type: null,
            subscription_tier: null,
            subscription_status: null
          })
          .eq('id', user.id);
        
        if (error) {
          return { error: error.message };
        }
        
        return { 
          success: true, 
          userId: user.id,
          message: 'Profile cleared - onboarding should trigger on refresh'
        };
      } catch (err) {
        return { error: err.message };
      }
    });
    
    console.log('\n📊 Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Profile cleared successfully!');
      console.log('🔄 Refreshing page to trigger onboarding...\n');
      
      // Refresh the page
      await page.reload();
      await page.waitForTimeout(5000);
      
      // Check if onboarding appears
      const onboardingState = await page.evaluate(() => {
        return {
          hasOnboardingCard: !!document.querySelector('.fixed.inset-0.z-50'),
          hasSettingUpText: document.body.textContent?.includes('Setting up'),
          visibleText: Array.from(document.querySelectorAll('h1, h2, h3'))
            .slice(0, 5)
            .map(el => el.textContent?.trim())
            .filter(Boolean)
        };
      });
      
      console.log('🎯 Onboarding State:', JSON.stringify(onboardingState, null, 2));
      
      // Take screenshot
      await page.screenshot({ path: 'profile-cleared-state.png', fullPage: true });
      console.log('\n📸 Screenshot saved: profile-cleared-state.png');
    }
    
  } catch (_error) {
    console.error('\n❌ Failed:', error);
    await page.screenshot({ path: 'clear-profile-error.png' });
  } finally {
    await browser.close();
  }
}

clearProfileForOnboarding().catch(console.error);