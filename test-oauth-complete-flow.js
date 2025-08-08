/**
 * Complete OAuth Flow Test with Test Account
 * This test attempts to complete the full OAuth flow and captures all diagnostics
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/?__lovable_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOVdvb0s1Q2UyUGFjN2tIM3RTSzBNdTFYT1ZJMiIsInByb2plY3RfaWQiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJyb2xlIjoib3duZXIiLCJub25jZSI6ImJjY2ZiN2U2YTVkMzZiZTExYWQwNzgxMmU4NmZkYTBlIiwiaXNzIjoibG92YWJsZS1hcGkiLCJzdWIiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJhdWQiOlsibG92YWJsZS1hcHAiXSwiZXhwIjoxNzU1MjE4MjUyLCJuYmYiOjE3NTQ2MTM0NTIsImlhdCI6MTc1NDYxMzQ1Mn0.D6dTZcv5SpAWyscO3U9SXVDN5r6lBcv1F0_FNBZ-Exw';

// Test account credentials
const TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
const TEST_PASSWORD = process.env.GOOGLE_TEST_PASSWORD || '';

async function testCompleteOAuthFlow() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(process.cwd(), `oauth-complete-test-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║     🔐 COMPLETE OAUTH FLOW TEST WITH DIAGNOSTICS                  ║
╚════════════════════════════════════════════════════════════════════╝

📧 Test Account: ${TEST_EMAIL}
📁 Results Directory: ${path.basename(testDir)}
`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Comprehensive logging setup
  const logs = {
    console: [],
    network: [],
    errors: [],
    redirects: []
  };

  // Console logging
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    logs.console.push(logEntry);
    
    // Log important messages
    if (msg.text().includes('auth') || msg.text().includes('Auth') || 
        msg.text().includes('error') || msg.text().includes('403')) {
      console.log(`🌐 [${msg.type()}] ${msg.text()}`);
    }
  });

  // Network logging
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') || url.includes('google') || url.includes('auth')) {
      const logEntry = {
        type: 'request',
        method: request.method(),
        url: url,
        headers: request.headers(),
        timestamp: new Date().toISOString()
      };
      logs.network.push(logEntry);
      console.log(`📤 ${request.method()} ${url.substring(0, 80)}...`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('google') || url.includes('auth')) {
      const logEntry = {
        type: 'response',
        status: response.status(),
        statusText: response.statusText(),
        url: url,
        headers: response.headers(),
        timestamp: new Date().toISOString()
      };
      logs.network.push(logEntry);
      
      // Highlight important responses
      const statusColor = response.status() >= 400 ? '❌' : response.status() >= 300 ? '↩️' : '✅';
      console.log(`📥 ${statusColor} ${response.status()} ${url.substring(0, 70)}...`);
      
      // Track redirects
      if (response.status() >= 300 && response.status() < 400) {
        const location = response.headers()['location'];
        if (location) {
          logs.redirects.push({
            from: url,
            to: location,
            status: response.status(),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  });

  // Error logging
  page.on('pageerror', error => {
    logs.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.log(`❌ Page Error: ${error.message}`);
  });

  let screenshotCount = 0;
  const takeScreenshot = async (name) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ 
      path: path.join(testDir, filename), 
      fullPage: true 
    });
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
  };

  try {
    // Step 1: Navigate to the app
    console.log('\n═══ STEP 1: NAVIGATING TO APP ═══');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await takeScreenshot('initial-load');

    // Check initial state
    const initialState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const hasGoogleButton = buttons.some(btn => btn.textContent?.includes('Sign in with Google'));
      const localStorage = Object.keys(window.localStorage).reduce((acc, key) => {
        acc[key] = window.localStorage.getItem(key);
        return acc;
      }, {});
      
      return {
        url: window.location.href,
        hasGoogleButton,
        localStorage: Object.keys(localStorage),
        cookies: document.cookie
      };
    });

    console.log('\n📊 Initial State:');
    console.log(`  URL: ${initialState.url}`);
    console.log(`  Has Google Button: ${initialState.hasGoogleButton ? '✅' : '❌'}`);
    console.log(`  LocalStorage Keys: ${initialState.localStorage.join(', ') || 'None'}`);

    if (!initialState.hasGoogleButton) {
      console.log('❌ No Google Sign-in button found!');
      await takeScreenshot('no-google-button');
      throw new Error('Google Sign-in button not found');
    }

    // Step 2: Click Sign in with Google
    console.log('\n═══ STEP 2: CLICKING SIGN IN WITH GOOGLE ═══');
    
    // Set up listener for new pages (popups)
    const popupPromise = new Promise((resolve) => {
      context.on('page', page => {
        console.log('🪟 New window/popup detected!');
        resolve(page);
      });
      setTimeout(() => resolve(null), 15000);
    });

    // Click the button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const googleBtn = buttons.find(btn => btn.textContent?.includes('Sign in with Google'));
      if (googleBtn) {
        console.log('Clicking Google button:', googleBtn.outerHTML);
        googleBtn.click();
      }
    });

    console.log('✅ Clicked Google Sign-in button');
    await page.waitForTimeout(2000);

    // Check if we got a popup or navigation
    const popup = await popupPromise;
    let authPage = popup || page;

    // Step 3: Handle Google OAuth
    console.log('\n═══ STEP 3: HANDLING GOOGLE OAUTH ═══');
    
    // Wait for navigation or popup to load
    await authPage.waitForLoadState('domcontentloaded');
    const authUrl = authPage.url();
    console.log(`📍 Auth Page URL: ${authUrl}`);
    
    await takeScreenshot('oauth-page');

    // Check if we're on Google's sign-in page
    if (authUrl.includes('accounts.google.com')) {
      console.log('✅ Reached Google sign-in page');
      
      // Extract OAuth parameters
      const urlObj = new URL(authUrl);
      const clientId = urlObj.searchParams.get('client_id');
      const redirectUri = urlObj.searchParams.get('redirect_uri');
      const scope = urlObj.searchParams.get('scope');
      const state = urlObj.searchParams.get('state');
      
      console.log('\n📋 OAuth Parameters:');
      console.log(`  Client ID: ${clientId}`);
      console.log(`  Redirect URI: ${redirectUri}`);
      console.log(`  Scope: ${scope}`);
      console.log(`  State: ${state?.substring(0, 50)}...`);

      // Check for any error messages
      const errorCheck = await authPage.evaluate(() => {
        const bodyText = document.body.innerText;
        const title = document.title;
        
        // Check for common error indicators
        const hasError = bodyText.includes('Error 403') || 
                        bodyText.includes('403') ||
                        bodyText.includes('Access blocked') ||
                        bodyText.includes('This app is blocked') ||
                        title.includes('403') ||
                        title.includes('Error');
        
        return {
          hasError,
          title,
          bodyPreview: bodyText.substring(0, 500)
        };
      });

      if (errorCheck.hasError) {
        console.log('\n❌ ERROR DETECTED ON GOOGLE PAGE!');
        console.log(`  Title: ${errorCheck.title}`);
        console.log(`  Content Preview: ${errorCheck.bodyPreview}`);
        await takeScreenshot('google-error');
      } else {
        console.log('✅ No immediate errors on Google page');
        
        // Try to sign in with test account if password is provided
        if (TEST_PASSWORD) {
          console.log('\n═══ STEP 4: ATTEMPTING SIGN IN ═══');
          
          try {
            // Enter email
            const emailInput = await authPage.$('input[type="email"]');
            if (emailInput) {
              await emailInput.fill(TEST_EMAIL);
              console.log(`✅ Entered email: ${TEST_EMAIL}`);
              await takeScreenshot('email-entered');
              
              // Click next
              const nextButton = await authPage.$('button:has-text("Next")') || 
                                await authPage.$('#identifierNext');
              if (nextButton) {
                await nextButton.click();
                console.log('✅ Clicked Next');
                await authPage.waitForTimeout(3000);
                await takeScreenshot('after-email-next');
              }
              
              // Enter password
              const passwordInput = await authPage.$('input[type="password"]');
              if (passwordInput) {
                await passwordInput.fill(TEST_PASSWORD);
                console.log('✅ Entered password');
                await takeScreenshot('password-entered');
                
                // Click sign in
                const signInButton = await authPage.$('button:has-text("Next")') || 
                                    await authPage.$('#passwordNext');
                if (signInButton) {
                  await signInButton.click();
                  console.log('✅ Clicked Sign In');
                  await authPage.waitForTimeout(5000);
                  await takeScreenshot('after-sign-in');
                }
              }
            }
          } catch (signInError) {
            console.log(`⚠️ Sign-in attempt failed: ${signInError.message}`);
          }
        } else {
          console.log('ℹ️ No password provided, skipping sign-in attempt');
        }
      }
    } else if (authUrl.includes('error') || authUrl.includes('403')) {
      console.log('❌ Error page detected!');
      const errorContent = await authPage.evaluate(() => ({
        title: document.title,
        body: document.body.innerText,
        url: window.location.href
      }));
      console.log('Error details:', errorContent);
      await takeScreenshot('error-page');
    }

    // Step 5: Check final state
    console.log('\n═══ STEP 5: CHECKING FINAL STATE ═══');
    await page.waitForTimeout(5000);
    
    const finalState = await page.evaluate(() => {
      const localStorage = Object.keys(window.localStorage).reduce((acc, key) => {
        acc[key] = window.localStorage.getItem(key);
        return acc;
      }, {});
      
      return {
        url: window.location.href,
        hasAuth: !!localStorage['sb-raenkewzlvrdqufwxjpl-auth-token'],
        localStorage: Object.keys(localStorage),
        userEmail: localStorage['sb-raenkewzlvrdqufwxjpl-auth-token'] ? 
          JSON.parse(localStorage['sb-raenkewzlvrdqufwxjpl-auth-token'])?.user?.email : null
      };
    });

    console.log('\n📊 Final State:');
    console.log(`  URL: ${finalState.url}`);
    console.log(`  Authenticated: ${finalState.hasAuth ? '✅' : '❌'}`);
    console.log(`  User Email: ${finalState.userEmail || 'None'}`);
    
    await takeScreenshot('final-state');

    // Save all logs
    console.log('\n═══ SAVING DIAGNOSTIC DATA ═══');
    
    await fs.writeFile(
      path.join(testDir, 'complete-logs.json'),
      JSON.stringify(logs, null, 2)
    );

    await fs.writeFile(
      path.join(testDir, 'redirects.json'),
      JSON.stringify(logs.redirects, null, 2)
    );

    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      testAccount: TEST_EMAIL,
      results: {
        googlePageReached: authUrl.includes('accounts.google.com'),
        errorDetected: authUrl.includes('403') || authUrl.includes('error'),
        authCompleted: finalState.hasAuth,
        finalUrl: finalState.url
      },
      stats: {
        totalRequests: logs.network.filter(l => l.type === 'request').length,
        totalResponses: logs.network.filter(l => l.type === 'response').length,
        totalRedirects: logs.redirects.length,
        totalErrors: logs.errors.length,
        totalScreenshots: screenshotCount
      },
      oauthParameters: {
        clientId: authUrl.includes('client_id') ? new URL(authUrl).searchParams.get('client_id') : null,
        redirectUri: authUrl.includes('redirect_uri') ? new URL(authUrl).searchParams.get('redirect_uri') : null
      }
    };

    await fs.writeFile(
      path.join(testDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                         TEST SUMMARY                              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(`  Google Page Reached: ${summary.results.googlePageReached ? '✅ YES' : '❌ NO'}`);
    console.log(`  Error Detected: ${summary.results.errorDetected ? '❌ YES' : '✅ NO'}`);
    console.log(`  Auth Completed: ${summary.results.authCompleted ? '✅ YES' : '❌ NO'}`);
    console.log(`  Total Redirects: ${summary.stats.totalRedirects}`);
    console.log(`  Total Errors: ${summary.stats.totalErrors}`);
    console.log(`\n📁 Full results saved to: ${testDir}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await takeScreenshot('test-error');
    
    // Save error details
    await fs.writeFile(
      path.join(testDir, 'error.json'),
      JSON.stringify({
        message: error.message,
        stack: error.stack,
        logs
      }, null, 2)
    );
  } finally {
    // Close popup if it exists
    if (popup && !popup.isClosed()) {
      await popup.close();
    }
    
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testCompleteOAuthFlow().catch(console.error);
}

module.exports = testCompleteOAuthFlow;