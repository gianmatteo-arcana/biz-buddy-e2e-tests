/**
 * Detailed OAuth Flow Test
 * This test captures the exact error when clicking Sign in with Google
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/?__lovable_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOVdvb0s1Q2UyUGFjN2tIM3RTSzBNdTFYT1ZJMiIsInByb2plY3RfaWQiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJyb2xlIjoib3duZXIiLCJub25jZSI6ImJjY2ZiN2U2YTVkMzZiZTExYWQwNzgxMmU4NmZkYTBlIiwiaXNzIjoibG92YWJsZS1hcGkiLCJzdWIiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJhdWQiOlsibG92YWJsZS1hcHAiXSwiZXhwIjoxNzU1MjE4MjUyLCJuYmYiOjE3NTQ2MTM0NTIsImlhdCI6MTc1NDYxMzQ1Mn0.D6dTZcv5SpAWyscO3U9SXVDN5r6lBcv1F0_FNBZ-Exw';

async function testOAuthFlow() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(process.cwd(), `oauth-test-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           🔐 TESTING GOOGLE OAUTH FLOW                            ║
╚════════════════════════════════════════════════════════════════════╝
`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Set up network request logging
  const networkLogs = [];
  page.on('request', request => {
    if (request.url().includes('supabase') || request.url().includes('google')) {
      networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
      console.log(`📤 ${request.method()} ${request.url().substring(0, 100)}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('supabase') || response.url().includes('google')) {
      networkLogs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });
      console.log(`📥 ${response.status()} ${response.url().substring(0, 100)}`);
    }
  });

  // Set up console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('auth') || text.includes('Auth') || text.includes('OAuth') || text.includes('error')) {
      console.log(`🌐 Console: ${text}`);
    }
  });

  try {
    // Navigate to app
    console.log('📍 Navigating to Lovable dev environment...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: path.join(testDir, '01-initial.png'), fullPage: true });

    // Check current auth state
    const authState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const hasGoogleButton = buttons.some(btn => btn.textContent?.includes('Sign in with Google'));
      const supabaseAuth = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      return {
        hasGoogleButton,
        hasSupabaseAuth: !!supabaseAuth,
        currentUrl: window.location.href,
        origin: window.location.origin
      };
    });

    console.log('\n📊 Auth State:', JSON.stringify(authState, null, 2));

    if (authState.hasGoogleButton) {
      console.log('\n🔍 Found Google Sign-in button, attempting to click...');
      
      // Listen for popup
      const popupPromise = new Promise((resolve) => {
        context.on('page', page => {
          console.log('🪟 New window/popup detected!');
          resolve(page);
        });
        setTimeout(() => resolve(null), 10000);
      });

      // Click the button
      const googleButton = await page.$('button:text("Sign in with Google")');
      if (googleButton) {
        await googleButton.click();
        console.log('✅ Clicked Google Sign-in button');
      } else {
        // Fallback: find button by text content
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const googleBtn = buttons.find(btn => btn.textContent?.includes('Sign in with Google'));
          if (googleBtn) googleBtn.click();
        });
        console.log('✅ Clicked Google Sign-in button (via evaluate)');
      }

      // Wait for popup or navigation
      const popup = await popupPromise;

      if (popup) {
        console.log('\n🔐 OAuth popup opened');
        await popup.waitForLoadState('domcontentloaded');
        
        const popupUrl = popup.url();
        console.log(`📍 Popup URL: ${popupUrl}`);
        
        // Take screenshot of popup
        await popup.screenshot({ path: path.join(testDir, '02-oauth-popup.png'), fullPage: true });
        
        // Get page content
        const pageTitle = await popup.title();
        const pageContent = await popup.content();
        
        console.log(`📄 Page title: ${pageTitle}`);
        
        // Check for errors
        if (pageContent.includes('Error 403') || pageContent.includes('403.') || pageTitle.includes('403')) {
          console.log('\n❌ ERROR 403 DETECTED!');
          
          // Extract error details
          const errorDetails = await popup.evaluate(() => {
            const bodyText = document.body.innerText;
            const title = document.title;
            return { title, bodyText: bodyText.substring(0, 1000) };
          });
          
          console.log('Error details:', errorDetails);
          
          // Save error details
          await fs.writeFile(
            path.join(testDir, 'error-details.json'),
            JSON.stringify({ ...errorDetails, url: popupUrl, networkLogs }, null, 2)
          );
          
          // Check the exact redirect URL that was attempted
          const redirectUrl = new URL(popupUrl);
          const redirectUri = redirectUrl.searchParams.get('redirect_uri');
          const clientId = redirectUrl.searchParams.get('client_id');
          const scope = redirectUrl.searchParams.get('scope');
          
          console.log('\n🔍 OAuth Request Parameters:');
          console.log(`  Client ID: ${clientId}`);
          console.log(`  Redirect URI: ${redirectUri}`);
          console.log(`  Scope: ${scope}`);
          
          if (redirectUri) {
            console.log('\n⚠️ The redirect URI being used is:');
            console.log(`  ${redirectUri}`);
            console.log('\n  Make sure this EXACT URL is in your Google Console OAuth configuration.');
          }
        } else if (popupUrl.includes('accounts.google.com')) {
          console.log('✅ Successfully reached Google OAuth page!');
          
          // Get OAuth parameters
          const oauthUrl = new URL(popupUrl);
          const redirectUri = oauthUrl.searchParams.get('redirect_uri');
          const clientId = oauthUrl.searchParams.get('client_id');
          
          console.log('\n✅ OAuth is working with:');
          console.log(`  Client ID: ${clientId}`);
          console.log(`  Redirect URI: ${redirectUri}`);
        }
        
        await popup.close();
      } else {
        console.log('⚠️ No popup detected, checking for inline navigation...');
        
        // Check if main page navigated
        const currentUrl = page.url();
        if (currentUrl !== APP_URL) {
          console.log(`📍 Page navigated to: ${currentUrl}`);
          
          if (currentUrl.includes('error') || currentUrl.includes('403')) {
            const pageContent = await page.content();
            console.log('❌ Error page detected');
            await page.screenshot({ path: path.join(testDir, '02-error-page.png'), fullPage: true });
          }
        }
      }
    } else {
      console.log('ℹ️ No Google Sign-in button found - user might be authenticated');
      
      // Try to sign out first
      const signOutButton = await page.$('button:text("Sign out")');
      if (signOutButton) {
        console.log('Found sign out button, clicking to test OAuth from fresh state...');
        await signOutButton.click();
        await page.waitForTimeout(2000);
        await page.reload();
        console.log('Rerun this test to test OAuth flow');
      } else {
        // Check for user menu or other sign out options
        const userButtons = await page.$$('button');
        for (const btn of userButtons) {
          const text = await btn.textContent();
          if (text && text.toLowerCase().includes('sign out')) {
            console.log('Found sign out option, clicking...');
            await btn.click();
            await page.waitForTimeout(2000);
            await page.reload();
            console.log('Rerun this test to test OAuth flow');
            break;
          }
        }
      }
    }

    // Save network logs
    await fs.writeFile(
      path.join(testDir, 'network-logs.json'),
      JSON.stringify(networkLogs, null, 2)
    );

    console.log(`\n💾 Test results saved to: ${testDir}`);

  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: path.join(testDir, 'error-screenshot.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testOAuthFlow().catch(console.error);