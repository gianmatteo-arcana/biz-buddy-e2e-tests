const { chromium } = require('playwright');

async function simulateNewUser() {
  console.log('🧪 Testing Onboarding for Simulated New User');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('\n📍 Step 1: Navigate to app...');
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
  
  // Listen for console logs
  page.on('console', msg => {
    if (msg.type() === 'log') console.log(`[Browser log] ${msg.text()}`);
    else if (msg.type() === 'error') console.log(`[Browser error] ${msg.text()}`);
  });
  
  console.log('\n📍 Step 2: Clear existing auth...');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  await page.reload();
  await page.waitForTimeout(2000);
  
  console.log('\n📍 Step 3: Check if sign-in page is shown...');
  const hasSignIn = await page.locator('text="Sign in with Google"').isVisible().catch(() => false);
  console.log('Sign-in visible:', hasSignIn);
  
  if (hasSignIn) {
    console.log('\n✅ Sign-in page shown - app is ready for new user onboarding');
    console.log('\n📝 To test onboarding:');
    console.log('1. Sign in with a new Google account (or test account)');
    console.log('2. The onboarding flow should start automatically');
    console.log('3. It will check if user has business_name/business_type in profile');
    console.log('4. If not, it will create an onboarding task and show OnboardingCard');
  } else {
    console.log('\n❌ Sign-in page not shown - there may be cached auth');
  }
  
  console.log('\n📸 Taking screenshot...');
  await page.screenshot({ path: 'new-user-state.png' });
  
  console.log('\n✨ Manual steps required:');
  console.log('1. Sign in with a Google account that has no business info');
  console.log('2. Or clear business_name and business_type from existing user in Supabase');
  console.log('3. Sign out and sign back in to trigger onboarding check');
  
  console.log('\nPress Ctrl+C to close browser...');
  
  // Keep browser open for manual testing
  await new Promise(() => {});
}

simulateNewUser().catch(console.error);