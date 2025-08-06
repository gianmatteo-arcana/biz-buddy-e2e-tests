const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { getTestCredentials } = require('./scripts/get-credentials');
const { waitForAppReady } = require('./helpers/waitForApp');

class AuthManager {
  constructor() {
    this.authFile = '.auth/user-state.json';
    this.lockFile = '.auth/auth-in-progress.lock';
  }

  async checkAuthValidity() {
    if (!fs.existsSync(this.authFile)) {
      return { valid: false, reason: 'No auth file found' };
    }

    try {
      const authState = JSON.parse(fs.readFileSync(this.authFile, 'utf8'));
      
      // Check if we have the required auth data
      if (!authState.origins || authState.origins.length === 0) {
        return { valid: false, reason: 'No localStorage data' };
      }

      // Find the Supabase auth token
      const bizBuddyOrigin = authState.origins.find(o => 
        o.origin.includes('lovableproject.com')
      );
      
      if (!bizBuddyOrigin || !bizBuddyOrigin.localStorage) {
        return { valid: false, reason: 'No BizBuddy auth data' };
      }

      const authToken = bizBuddyOrigin.localStorage.find(item => 
        item.name.includes('auth-token')
      );

      if (!authToken) {
        return { valid: false, reason: 'No auth token found' };
      }

      // Parse the token to check expiration
      const tokenData = JSON.parse(authToken.value);
      const expiresAt = tokenData.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeLeft = expiresAt - now;

      if (timeLeft <= 0) {
        return { 
          valid: false, 
          reason: 'Token expired',
          expiredAt: new Date(expiresAt).toLocaleString()
        };
      }

      // Token is valid
      const minutesLeft = Math.floor(timeLeft / 1000 / 60);
      return { 
        valid: true, 
        expiresAt: new Date(expiresAt).toLocaleString(),
        minutesLeft,
        timeLeft
      };

    } catch (error) {
      return { valid: false, reason: `Error parsing auth: ${error.message}` };
    }
  }

  async startAuthCapture() {
    // Create a lock file to signal auth is in progress
    fs.writeFileSync(this.lockFile, JSON.stringify({
      startedAt: new Date().toISOString(),
      pid: process.pid
    }));

    console.log('\n🔐 Starting Authentication Capture\n');
    console.log('This process will:');
    console.log('1. Open a browser window');
    console.log('2. Navigate to BizBuddy');
    console.log('3. Wait for you to sign in');
    console.log('4. Automatically detect when you\'re authenticated');
    console.log('5. Save the auth state\n');

    const browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to BizBuddy...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');

    console.log('\n' + '='.repeat(60));
    console.log('👉 Please sign in with Google in the browser window');
    console.log('='.repeat(60) + '\n');

    // Poll for authentication
    let authenticated = false;
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes - more time for password entry

    while (!authenticated && attempts < maxAttempts) {
      await page.waitForTimeout(1000); // Wait 1 second

      // Check for various auth indicators including the test user
      const indicators = await Promise.all([
        page.locator('text=Welcome back').isVisible().catch(() => false),
        page.locator('text=Chat with Ally').isVisible().catch(() => false),
        page.locator('text=Dashboard').isVisible().catch(() => false),
        page.locator('text=gianmatteo.allyn.test@gmail.com').isVisible().catch(() => false),
        page.locator('text=Gianmatteo').isVisible().catch(() => false),
        page.locator('[data-testid="dashboard-container"]').isVisible().catch(() => false),
        page.url().includes('dashboard'),
        // Also check for localStorage auth token - using the correct Supabase instance key
        page.evaluate(() => {
          const auth = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
          return auth !== null && auth !== undefined;
        }).catch(() => false)
      ]);

      authenticated = indicators.some(v => v === true);

      if (!authenticated) {
        process.stdout.write(`\rWaiting for authentication... ${attempts}s`);
        attempts++;
      }
    }

    console.log('\n');

    if (authenticated) {
      console.log('✅ Authentication detected! Saving state...');
      
      // Wait for OAuth redirect and localStorage to be populated
      console.log('Waiting for BizBuddy session to be established...');
      
      // Wait for the app to be on the correct domain
      if (!page.url().includes('localhost:5173') && !page.url().includes('biz-buddy')) {
        try {
          await page.waitForURL('**/localhost:5173/**', { timeout: 30000 });
        } catch (e) {
          console.log('Warning: Could not navigate to BizBuddy domain');
        }
      }
      
      // Wait for localStorage to contain auth token
      let hasAuthToken = false;
      for (let i = 0; i < 30; i++) {
        hasAuthToken = await page.evaluate(() => {
          const auth = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
          return auth !== null && auth !== undefined && auth !== '';
        }).catch(() => false);
        
        if (hasAuthToken) {
          console.log('✅ BizBuddy auth token detected in localStorage');
          break;
        }
        
        await page.waitForTimeout(1000);
      }
      
      if (!hasAuthToken) {
        console.log('⚠️  Warning: No BizBuddy auth token found in localStorage');
      }
      
      // Wait a bit more for all cookies to settle
      await page.waitForTimeout(2000);
      
      // Save the state
      await context.storageState({ path: this.authFile });
      
      // Verify what was saved
      const saved = JSON.parse(fs.readFileSync(this.authFile, 'utf8'));
      console.log(`\n✅ Saved:`);
      console.log(`   - ${saved.cookies.length} cookies`);
      console.log(`   - ${saved.origins.length} origins with localStorage`);
      
      // Check validity
      const validity = await this.checkAuthValidity();
      if (validity.valid) {
        console.log(`\n✅ Auth token valid for ${validity.minutesLeft} minutes`);
        console.log(`   Expires at: ${validity.expiresAt}`);
      }
      
      // Create a success indicator file
      fs.writeFileSync('.auth/last-auth-success.json', JSON.stringify({
        capturedAt: new Date().toISOString(),
        expiresAt: validity.expiresAt,
        minutesLeft: validity.minutesLeft
      }, null, 2));

    } else {
      console.log('❌ Authentication timeout. Please try again.');
    }

    // Clean up
    await browser.close();
    if (fs.existsSync(this.lockFile)) {
      fs.unlinkSync(this.lockFile);
    }

    return authenticated;
  }

  async ensureValidAuth() {
    const validity = await this.checkAuthValidity();
    
    console.log('\n🔐 Checking authentication state...');
    
    if (validity.valid) {
      console.log(`✅ Auth is valid for ${validity.minutesLeft} more minutes`);
      console.log(`   Expires at: ${validity.expiresAt}\n`);
      return true;
    }

    console.log(`❌ Auth is invalid: ${validity.reason}`);
    if (validity.expiredAt) {
      console.log(`   Expired at: ${validity.expiredAt}`);
    }
    
    // Check if auth capture is already in progress
    if (fs.existsSync(this.lockFile)) {
      console.log('\n⏳ Authentication capture is already in progress...');
      console.log('   Waiting for it to complete...\n');
      
      // Wait for lock file to be removed (max 3 minutes)
      let waited = 0;
      while (fs.existsSync(this.lockFile) && waited < 180) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waited++;
        process.stdout.write(`\r   Waited ${waited}s...`);
      }
      console.log('\n');
      
      // Check if auth is now valid
      const newValidity = await this.checkAuthValidity();
      if (newValidity.valid) {
        console.log('✅ Authentication completed successfully!\n');
        return true;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔄 AUTHENTICATION REQUIRED');
    console.log('='.repeat(60));
    console.log('\nYour authentication has expired or is invalid.');
    console.log('Please run the following command in a terminal:\n');
    console.log('   npm run auth:refresh\n');
    console.log('This will open a browser for you to sign in with Google.');
    console.log('='.repeat(60) + '\n');
    
    return false;
  }
}

module.exports = AuthManager;

// If run directly, start auth capture
if (require.main === module) {
  const manager = new AuthManager();
  manager.startAuthCapture().then(success => {
    process.exit(success ? 0 : 1);
  });
}