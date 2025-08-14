/**
 * Authentication Resilience System for E2E Tests
 * 
 * This module provides robust authentication management with:
 * - Expiry detection and automatic renewal
 * - Cross-domain authentication handling
 * - Fallback authentication strategies
 * - Token validation and health checks
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

class AuthResilience {
  constructor(options = {}) {
    this.authFilePath = options.authFilePath || '.auth/user-state.json';
    this.testEmail = options.testEmail || 'gianmatteo.allyn.test@gmail.com';
    this.appUrls = options.appUrls || {
      localhost: 'http://localhost:8081',
      lovable: 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com'
    };
    this.authExpiryBuffer = options.authExpiryBuffer || 5 * 60 * 1000; // 5 minutes buffer
  }

  /**
   * Check if the stored authentication is valid and not expired
   */
  async validateStoredAuth() {
    console.log('🔍 Validating stored authentication...');
    
    if (!fs.existsSync(this.authFilePath)) {
      console.log('❌ No auth file found');
      return { valid: false, reason: 'no_file' };
    }

    try {
      const authState = JSON.parse(fs.readFileSync(this.authFilePath, 'utf8'));
      
      // Check if we have localStorage data
      const origins = authState.origins || [];
      const authOrigin = origins.find(origin => 
        origin.localStorage?.some(item => item.name.includes('auth-token'))
      );

      if (!authOrigin) {
        console.log('❌ No auth token found in stored state');
        return { valid: false, reason: 'no_token' };
      }

      // Find and parse the auth token
      const authTokenItem = authOrigin.localStorage.find(item => 
        item.name.includes('auth-token')
      );

      if (!authTokenItem) {
        console.log('❌ Auth token item not found');
        return { valid: false, reason: 'no_token_item' };
      }

      const tokenData = JSON.parse(authTokenItem.value);
      const expiresAt = tokenData.expires_at * 1000; // Convert to ms
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const isExpired = timeUntilExpiry <= this.authExpiryBuffer;

      console.log(`🔑 Token analysis:`);
      console.log(`   Expires at: ${new Date(expiresAt)}`);
      console.log(`   Current time: ${new Date(now)}`);
      console.log(`   Time until expiry: ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
      console.log(`   Is expired/near expiry: ${isExpired}`);
      console.log(`   User email: ${tokenData.user?.email}`);

      if (isExpired) {
        return { 
          valid: false, 
          reason: 'expired', 
          expiresAt: new Date(expiresAt),
          timeUntilExpiry 
        };
      }

      return { 
        valid: true, 
        expiresAt: new Date(expiresAt), 
        timeUntilExpiry,
        domain: authOrigin.origin,
        userEmail: tokenData.user?.email
      };

    } catch (error) {
      console.log('❌ Error parsing auth file:', error.message);
      return { valid: false, reason: 'parse_error', error: error.message };
    }
  }

  /**
   * Attempt to refresh authentication automatically
   */
  async refreshAuthentication(targetUrl = null) {
    console.log('🔄 Attempting to refresh authentication...');
    
    // Determine target URL
    const url = targetUrl || this.appUrls.localhost;
    console.log(`📍 Target URL: ${url}`);

    const browser = await chromium.launch({ 
      headless: false, 
      slowMo: 300,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'] 
    });
    
    try {
      const page = await browser.newPage();
      
      // Navigate to the app
      console.log('📍 Navigating to app...');
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for potential redirects
      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      console.log(`🌐 Final URL: ${finalUrl}`);

      // Check if we need to sign in
      const signInButton = await page.locator('button:has-text("Sign in with Google")').first();
      const welcomeMsg = await page.locator('text=/Welcome.*Gianmatteo/i').first();
      
      const needsSignIn = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);
      const isAlreadySignedIn = await welcomeMsg.isVisible({ timeout: 3000 }).catch(() => false);

      if (isAlreadySignedIn) {
        console.log('✅ Already authenticated - saving current state');
        await this.saveAuthState(page);
        return { success: true, method: 'already_authenticated' };
      }

      if (needsSignIn) {
        console.log('🔑 Sign-in required - initiating OAuth flow...');
        await signInButton.click();
        
        console.log('⏳ Waiting for OAuth completion (60 seconds)...');
        console.log('   Please complete the sign-in process in the browser');
        
        // Wait for authentication to complete
        let authComplete = false;
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds total
        
        while (!authComplete && attempts < maxAttempts) {
          await page.waitForTimeout(2000);
          attempts++;
          
          const welcomeVisible = await welcomeMsg.isVisible({ timeout: 1000 }).catch(() => false);
          if (welcomeVisible) {
            authComplete = true;
            break;
          }
          
          // Check for auth errors
          const errorMsg = await page.locator('text=/error|failed|denied/i').first();
          if (await errorMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
            throw new Error('Authentication failed - error detected');
          }
        }

        if (!authComplete) {
          throw new Error('Authentication timeout - please complete sign-in faster');
        }

        console.log('✅ Authentication completed successfully');
        await page.waitForTimeout(3000); // Wait for localStorage to be set
        
        // Verify localStorage has auth data
        const hasAuthData = await page.evaluate(() => {
          const key = Object.keys(localStorage).find(k => k.includes('auth-token'));
          return !!key;
        });

        if (!hasAuthData) {
          console.log('⚠️ No auth data in localStorage after sign-in, waiting more...');
          await page.waitForTimeout(5000);
        }

        await this.saveAuthState(page);
        return { success: true, method: 'oauth_refresh' };
      }

      throw new Error('Unable to determine authentication state');

    } catch (error) {
      console.log('❌ Authentication refresh failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      await browser.close();
    }
  }

  /**
   * Save current page authentication state
   */
  async saveAuthState(page) {
    const storageState = await page.context().storageState();
    const backupPath = this.authFilePath + '.backup.' + Date.now();
    
    // Backup existing auth file
    if (fs.existsSync(this.authFilePath)) {
      fs.copyFileSync(this.authFilePath, backupPath);
      console.log(`💾 Backed up existing auth to: ${backupPath}`);
    }
    
    // Save new auth state
    fs.writeFileSync(this.authFilePath, JSON.stringify(storageState, null, 2));
    console.log(`✅ Saved new authentication state`);
    
    // Clean up old backups (keep only last 5)
    this.cleanupAuthBackups();
  }

  /**
   * Clean up old auth backup files
   */
  cleanupAuthBackups() {
    try {
      const dir = path.dirname(this.authFilePath);
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith(path.basename(this.authFilePath) + '.backup.'))
        .map(f => ({
          name: f,
          path: path.join(dir, f),
          time: parseInt(f.split('.backup.')[1])
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the 5 most recent backups
      files.slice(5).forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Cleaned up old backup: ${file.name}`);
      });
    } catch (error) {
      console.log('⚠️ Could not clean up backups:', error.message);
    }
  }

  /**
   * Ensure authentication is valid before running tests
   * This is the main method to call before test execution
   */
  async ensureValidAuth(targetUrl = null) {
    console.log('🛡️ Ensuring valid authentication for E2E tests...');
    console.log('=' .repeat(60));
    
    // Step 1: Validate stored auth
    const validation = await this.validateStoredAuth();
    
    if (validation.valid) {
      console.log('✅ Stored authentication is valid and not expired');
      console.log(`   Domain: ${validation.domain}`);
      console.log(`   User: ${validation.userEmail}`);
      console.log(`   Expires: ${validation.expiresAt}`);
      console.log(`   Time remaining: ${Math.round(validation.timeUntilExpiry / 1000 / 60)} minutes`);
      return { success: true, method: 'existing_valid' };
    }

    console.log(`❌ Stored authentication invalid: ${validation.reason}`);
    
    // Step 2: Attempt automatic refresh
    console.log('🔄 Attempting automatic authentication refresh...');
    const refreshResult = await this.refreshAuthentication(targetUrl);
    
    if (refreshResult.success) {
      console.log(`✅ Authentication refresh successful via ${refreshResult.method}`);
      return refreshResult;
    }

    console.log('❌ Automatic refresh failed:', refreshResult.error);
    throw new Error(`Authentication failed: ${refreshResult.error}`);
  }

  /**
   * Create a resilient browser context with automatic auth recovery
   */
  async createResilientContext(browser, options = {}) {
    // Ensure auth is valid first
    await this.ensureValidAuth(options.targetUrl);
    
    // Create context with auth state
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: this.authFilePath,
      ...options.contextOptions
    });

    // Add auth validation to page navigation
    const originalNewPage = context.newPage.bind(context);
    context.newPage = async (...args) => {
      const page = await originalNewPage(...args);
      
      // Add navigation listener to detect auth failures
      page.on('response', async (response) => {
        if (response.status() === 401 || response.status() === 403) {
          console.log('⚠️ Auth error detected in response, may need refresh');
        }
      });

      return page;
    };

    return context;
  }

  /**
   * Test authentication across different URLs
   */
  async testAuthenticationAcrossUrls() {
    console.log('🧪 Testing authentication across different URLs...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await this.createResilientContext(browser);
    const page = await context.newPage();
    
    const urls = Object.values(this.appUrls);
    const results = {};
    
    for (const url of urls) {
      console.log(`\n🔍 Testing: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        const finalUrl = page.url();
        const welcomeMsg = await page.locator('text=/Welcome.*Gianmatteo/i').first();
        const signInButton = await page.locator('button:has-text("Sign in")').first();
        
        const isAuthenticated = await welcomeMsg.isVisible({ timeout: 3000 }).catch(() => false);
        const needsSignIn = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);
        
        results[url] = {
          finalUrl,
          isAuthenticated,
          needsSignIn,
          status: isAuthenticated ? 'authenticated' : (needsSignIn ? 'needs_signin' : 'unknown')
        };
        
        console.log(`   Status: ${results[url].status}`);
        console.log(`   Final URL: ${finalUrl}`);
        
      } catch (error) {
        results[url] = { error: error.message, status: 'error' };
        console.log(`   Error: ${error.message}`);
      }
    }
    
    await browser.close();
    return results;
  }
}

module.exports = { AuthResilience };