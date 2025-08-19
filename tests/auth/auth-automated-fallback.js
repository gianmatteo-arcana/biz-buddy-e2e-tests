const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { getTestCredentials } = require('./scripts/get-credentials');

async function automatedAuthCapture() {
  console.log('🔐 Automated Authentication Capture (Fallback Mode)\n');
  
  let credentials;
  try {
    credentials = getTestCredentials();
    console.log(`✅ Using credentials for: ${credentials.email}`);
  } catch (_error) {
    console.error('❌ No credentials found. Run: npm run setup:credentials');
    process.exit(1);
  }
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    const appUrl = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
    console.log(`\nNavigating to ${appUrl}...`);
    await page.goto(appUrl);
    
    // Wait for sign in button
    console.log('Waiting for sign in button...');
    await page.waitForSelector('text=Sign in with Google', { timeout: 30000 });
    
    // Click sign in
    console.log('Clicking sign in with Google...');
    await page.click('text=Sign in with Google');
    
    // Wait for Google sign in page
    console.log('Waiting for Google sign in page...');
    await page.waitForURL('**/accounts.google.com/**', { timeout: 30000 });
    
    // Fill in email
    console.log('Entering email...');
    await page.fill('input[type="email"]', credentials.email);
    await page.click('button:has-text("Next")');
    
    // Wait for password field or error
    console.log('Waiting for password field...');
    try {
      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 30000 });
    } catch (_e) {
      const errorText = await page.textContent('body');
      if (errorText.includes("Couldn't find your Google Account")) {
        throw new Error(`Invalid email: ${credentials.email}`);
      }
      throw e;
    }
    
    // Fill in password
    console.log('Entering password...');
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button:has-text("Next")');
    
    // Check for password error
    await page.waitForTimeout(2000);
    const passwordError = await page.locator('text=Wrong password').isVisible().catch(() => false);
    if (passwordError) {
      throw new Error('Invalid password. Please run: npm run setup:credentials');
    }
    
    // Check for consent screen
    console.log('Checking for consent screen...');
    try {
      const consentButton = await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 });
      if (consentButton) {
        console.log('Handling consent screen...');
        await consentButton.click();
      }
    } catch (_e) {
      // No consent screen, continue
    }
    
    // Wait for redirect back to app
    console.log('Waiting for redirect back to app...');
    await page.waitForURL(`${appUrl}/**`, { timeout: 60000 });
    
    // Wait for app to load without instrumentation
    console.log('Waiting for app to load...');
    
    // Wait for loading spinner to disappear
    try {
      await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 60000 });
      console.log('✅ Loading complete');
    } catch (_e) {
      console.log('⚠️  Loading spinner timeout, checking for app content...');
    }
    
    // Wait for either dashboard or onboarding
    console.log('Checking app state...');
    const appLoaded = await Promise.race([
      page.waitForSelector('text=Dashboard', { timeout: 30000 }).then(() => 'dashboard'),
      page.waitForSelector('text=Welcome to', { timeout: 30000 }).then(() => 'welcome'),
      page.waitForSelector('[data-testid="onboarding-card"]', { timeout: 30000 }).then(() => 'onboarding'),
      page.waitForSelector('text=Chat with Ally', { timeout: 30000 }).then(() => 'chat')
    ]).catch(() => null);
    
    if (appLoaded) {
      console.log(`✅ App loaded with: ${appLoaded}`);
    } else {
      console.log('⚠️  App loaded but no familiar elements found');
    }
    
    // Verify authentication - using the correct Supabase instance key
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
    });
    
    if (!authToken) {
      throw new Error('No auth token found in localStorage');
    }
    
    console.log('✅ Authentication successful!');
    
    // Save auth state
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    await context.storageState({ path: '.auth/user-state.json' });
    console.log('✅ Auth state saved to .auth/user-state.json');
    
    // Fix the localStorage key if needed
    const authState = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    if (authState.origins && authState.origins.length > 0) {
      authState.origins[0].origin = appUrl;
    }
    fs.writeFileSync('.auth/user-state.json', JSON.stringify(authState, null, 2));
    
    // Verify what was saved
    const saved = JSON.parse(fs.readFileSync('.auth/user-state.json', 'utf8'));
    console.log(`\n📊 Saved state:`);
    console.log(`  - ${saved.cookies.length} cookies`);
    console.log(`  - ${saved.origins.length} origins with localStorage`);
    
    // Parse token to check expiration
    try {
      const tokenData = JSON.parse(authToken);
      const expiresAt = new Date(tokenData.expires_at * 1000);
      const minutesLeft = Math.floor((expiresAt - new Date()) / 1000 / 60);
      console.log(`\n⏰ Token expires in ${minutesLeft} minutes`);
    } catch (_e) {
      // Token might not be JSON
    }
    
    // Take a final screenshot
    await page.screenshot({ path: 'auth-success.png', fullPage: true });
    console.log('📸 Success screenshot saved: auth-success.png');
    
    // Keep browser open for a moment
    console.log('\n✨ Authentication capture complete!');
    await page.waitForTimeout(3000);
    
  } catch (_error) {
    console.error('\n❌ Authentication failed:', error.message);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'auth-error.png' });
    console.log('📸 Error screenshot saved: auth-error.png');
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  automatedAuthCapture().catch(console.error);
}

module.exports = { automatedAuthCapture };