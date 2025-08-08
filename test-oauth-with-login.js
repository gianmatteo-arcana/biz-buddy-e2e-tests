/**
 * Complete OAuth Flow Test with Login
 * This test completes the full OAuth flow with actual login
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/?__lovable_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOVdvb0s1Q2UyUGFjN2tIM3RTSzBNdTFYT1ZJMiIsInByb2plY3RfaWQiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJyb2xlIjoib3duZXIiLCJub25jZSI6ImJjY2ZiN2U2YTVkMzZiZTExYWQwNzgxMmU4NmZkYTBlIiwiaXNzIjoibG92YWJsZS1hcGkiLCJzdWIiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJhdWQiOlsibG92YWJsZS1hcHAiXSwiZXhwIjoxNzU1MjE4MjUyLCJuYmYiOjE3NTQ2MTM0NTIsImlhdCI6MTc1NDYxMzQ1Mn0.D6dTZcv5SpAWyscO3U9SXVDN5r6lBcv1F0_FNBZ-Exw';

const TEST_EMAIL = 'gianmatteo.allyn.test@gmail.com';
const TEST_PASSWORD = 'myO329Vfi9j5kcRE7TKyYyXZ8Yq3';

async function testOAuthWithLogin() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(process.cwd(), `oauth-login-test-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║     🔐 COMPLETE OAUTH LOGIN TEST                                  ║
╚════════════════════════════════════════════════════════════════════╝

📧 Test Account: ${TEST_EMAIL}
📁 Results: ${path.basename(testDir)}
`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  
  let screenshotCount = 0;
  const takeScreenshot = async (name) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ 
      path: path.join(testDir, filename), 
      fullPage: true 
    });
    console.log(`📸 ${filename}`);
    return filename;
  };

  // Track all network requests
  const networkLog = [];
  page.on('response', response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('google') || url.includes('auth') || response.status() >= 400) {
      networkLog.push({
        url: url.substring(0, 100),
        status: response.status(),
        statusText: response.statusText()
      });
      
      if (response.status() >= 400) {
        console.log(`❌ Error ${response.status()}: ${url.substring(0, 80)}`);
      }
    }
  });

  try {
    // Step 1: Navigate to app
    console.log('\n🚀 STEP 1: Navigate to app');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for loading to complete
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Check if still loading
    const isLoading = await page.evaluate(() => {
      const loadingText = document.body.innerText.includes('Loading');
      return loadingText;
    });
    
    if (isLoading) {
      console.log('⏳ Still loading, waiting more...');
      await page.waitForTimeout(5000);
    }
    
    await takeScreenshot('01-initial-load');

    // Check for Google button
    const hasGoogleButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent?.includes('Sign in with Google'));
    });

    if (!hasGoogleButton) {
      throw new Error('No Google Sign-in button found');
    }

    console.log('✅ Found Google Sign-in button');

    // Step 2: Click Sign in with Google
    console.log('\n🔐 STEP 2: Click Sign in with Google');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const googleBtn = buttons.find(btn => btn.textContent?.includes('Sign in with Google'));
      if (googleBtn) googleBtn.click();
    });

    // Wait for navigation to Google
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await takeScreenshot('02-google-signin-page');

    const googleUrl = page.url();
    console.log('📍 Navigated to:', googleUrl.substring(0, 50) + '...');

    if (googleUrl.includes('accounts.google.com')) {
      console.log('✅ Reached Google sign-in page');

      // Step 3: Enter email
      console.log('\n📧 STEP 3: Enter email');
      const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await emailInput.fill(TEST_EMAIL);
      await takeScreenshot('03-email-entered');

      // Click Next
      const nextButton = await page.$('#identifierNext');
      if (nextButton) {
        await nextButton.click();
        console.log('✅ Clicked Next after email');
      }

      // Wait for password field
      await page.waitForTimeout(3000);
      await takeScreenshot('04-password-page');

      // Step 4: Enter password
      console.log('\n🔑 STEP 4: Enter password');
      const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await passwordInput.fill(TEST_PASSWORD);
      await takeScreenshot('05-password-entered');

      // Click Next/Sign in
      const passwordNext = await page.$('#passwordNext');
      if (passwordNext) {
        await passwordNext.click();
        console.log('✅ Clicked Sign In');
      }

      // Step 5: Wait for OAuth consent or redirect
      console.log('\n⏳ STEP 5: Waiting for OAuth response...');
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl.substring(0, 80) + '...');
      await takeScreenshot('06-after-signin');
      
      // Check if we're on the "signing back in" page
      const pageContent = await page.evaluate(() => document.body.innerText);
      if (pageContent.includes("You're signing back in") || pageContent.includes("signing back")) {
        console.log('📋 OAuth re-authentication page detected');
        
        // Look for Continue button
        const continueButton = await page.$('button:has-text("Continue")') || 
                              await page.$('text=Continue >> xpath=ancestor::button');
        if (continueButton) {
          console.log('✅ Found Continue button, clicking...');
          await continueButton.click();
          await page.waitForTimeout(5000);
          await takeScreenshot('07-after-continue');
        } else {
          // Try alternative selector
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const continueBtn = buttons.find(btn => btn.textContent?.includes('Continue'));
            if (continueBtn) continueBtn.click();
          });
          console.log('✅ Clicked Continue (via evaluate)');
          await page.waitForTimeout(5000);
          await takeScreenshot('07-after-continue');
        }
        
        // Check where we ended up
        const newUrl = page.url();
        console.log('📍 After Continue URL:', newUrl.substring(0, 80) + '...');
      }

      // Check if we hit an error
      if (currentUrl.includes('403') || currentUrl.includes('error')) {
        console.log('❌ ERROR PAGE DETECTED');
        const pageContent = await page.evaluate(() => ({
          title: document.title,
          bodyText: document.body.innerText.substring(0, 1000),
          url: window.location.href
        }));
        
        console.log('\n❌ ERROR DETAILS:');
        console.log('Title:', pageContent.title);
        console.log('URL:', pageContent.url);
        console.log('Content:', pageContent.bodyText);
        
        await fs.writeFile(
          path.join(testDir, 'error-details.json'),
          JSON.stringify(pageContent, null, 2)
        );
      } else if (currentUrl.includes('consent')) {
        console.log('📋 OAuth consent screen appeared');
        await takeScreenshot('07-consent-screen');
        
        // Look for Continue/Allow button
        const continueButton = await page.$('button:has-text("Continue")') || 
                              await page.$('button:has-text("Allow")');
        if (continueButton) {
          await continueButton.click();
          console.log('✅ Clicked Continue/Allow');
          await page.waitForTimeout(5000);
          await takeScreenshot('08-after-consent');
        }
      } else if (currentUrl.includes('lovableproject.com')) {
        console.log('✅ Redirected back to app!');
        
        // Check if we're authenticated
        const authState = await page.evaluate(() => {
          const token = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
          if (token) {
            const parsed = JSON.parse(token);
            return {
              authenticated: true,
              userEmail: parsed.user?.email,
              userId: parsed.user?.id
            };
          }
          return { authenticated: false };
        });
        
        console.log('\n🎯 AUTHENTICATION RESULT:');
        console.log('  Authenticated:', authState.authenticated ? '✅ YES' : '❌ NO');
        if (authState.authenticated) {
          console.log('  User Email:', authState.userEmail);
          console.log('  User ID:', authState.userId);
        }
        
        await takeScreenshot('09-final-app-state');
      }
      
      // Check for any 403 errors that appeared
      const errorResponses = networkLog.filter(r => r.status === 403);
      if (errorResponses.length > 0) {
        console.log('\n❌ 403 ERRORS DETECTED IN NETWORK:');
        errorResponses.forEach(r => {
          console.log(`  - ${r.url}`);
        });
      }

    } else {
      console.log('❌ Did not reach Google sign-in page');
      console.log('Current URL:', googleUrl);
    }

    // Final check
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    const finalAuth = await page.evaluate(() => {
      const token = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      return !!token;
    });

    console.log('\n📊 FINAL STATUS:');
    console.log('  Final URL:', finalUrl.substring(0, 80) + '...');
    console.log('  Authenticated:', finalAuth ? '✅ YES' : '❌ NO');
    
    await takeScreenshot('10-final-state');

    // Save network log
    await fs.writeFile(
      path.join(testDir, 'network-log.json'),
      JSON.stringify(networkLog, null, 2)
    );

    console.log(`\n📁 All results saved to: ${testDir}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await takeScreenshot('error-state');
  } finally {
    // Keep browser open for 10 seconds to observe
    console.log('\n⏸️ Keeping browser open for observation...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testOAuthWithLogin().catch(console.error);