const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  console.log('Navigating to BizBuddy...');
  
  // Try different URLs
  const urls = [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com'
  ];
  
  let loaded = false;
  for (const url of urls) {
    try {
      console.log(`Trying ${url}...`);
      await page.goto(url, { timeout: 5000 });
      loaded = true;
      console.log(`✅ Loaded from ${url}`);
      break;
    } catch (e) {
      console.log(`❌ Failed to load ${url}`);
    }
  }
  
  if (!loaded) {
    console.error('Could not load app from any URL');
    await browser.close();
    return;
  }
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  console.log('Current URL:', page.url());
  console.log('Page Title:', await page.title());
  
  // Check what's visible
  const checks = {
    dashboard: await page.locator('text=Dashboard').isVisible().catch(() => false),
    onboarding: await page.locator('text=Welcome to BizBuddy').isVisible().catch(() => false),
    onboardingCard: await page.locator('[data-testid="onboarding-card"]').isVisible().catch(() => false),
    signIn: await page.locator('text=Sign in with Google').isVisible().catch(() => false),
    userEmail: await page.locator('text=gianmatteo.allyn.test@gmail.com').isVisible().catch(() => false)
  };
  
  console.log('\nVisible elements:', checks);
  
  // Check localStorage
  const localStorage = await page.evaluate(() => {
    const auth = localStorage.getItem('sb-cydmqfqbimqvpcejetxa-auth-token');
    return {
      hasAuth: auth !== null,
      authLength: auth ? auth.length : 0
    };
  });
  
  console.log('\nLocalStorage:', localStorage);
  
  // Check for onboarding status
  console.log('\nChecking onboarding status...');
  
  // Wait 30 seconds to observe behavior
  console.log('\nObserving app behavior for 30 seconds...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();