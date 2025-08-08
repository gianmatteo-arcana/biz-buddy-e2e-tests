/**
 * Extract OAuth Configuration from Dev Toolkit
 * This test extracts the exact OAuth URLs needed for Google Console configuration
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/?__lovable_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOVdvb0s1Q2UyUGFjN2tIM3RTSzBNdTFYT1ZJMiIsInByb2plY3RfaWQiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJyb2xlIjoib3duZXIiLCJub25jZSI6ImJjY2ZiN2U2YTVkMzZiZTExYWQwNzgxMmU4NmZkYTBlIiwiaXNzIjoibG92YWJsZS1hcGkiLCJzdWIiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJhdWQiOlsibG92YWJsZS1hcHAiXSwiZXhwIjoxNzU1MjE4MjUyLCJuYmYiOjE3NTQ2MTM0NTIsImlhdCI6MTc1NDYxMzQ1Mn0.D6dTZcv5SpAWyscO3U9SXVDN5r6lBcv1F0_FNBZ-Exw';

async function extractOAuthConfig() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           📋 EXTRACTING OAUTH CONFIGURATION                       ║
╚════════════════════════════════════════════════════════════════════╝
`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    // Navigate to app
    console.log('📍 Navigating to Lovable dev environment...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Extract OAuth configuration directly from the page
    console.log('🔍 Extracting OAuth configuration...\n');
    
    const oauthConfig = await page.evaluate(() => {
      // Get current environment info
      const origin = window.location.origin;
      const hostname = window.location.hostname;
      const href = window.location.href;
      
      // Extract project ID from lovableproject.com URL
      const projectIdMatch = hostname.match(/^([a-f0-9-]+)\.lovableproject\.com$/);
      const projectId = projectIdMatch ? projectIdMatch[1] : null;
      
      // Supabase URL (from your project)
      const supabaseUrl = 'https://raenkewzlvrdqufwxjpl.supabase.co';
      
      return {
        environment: {
          origin,
          hostname,
          href,
          projectId,
          isLovableProject: hostname.includes('lovableproject.com'),
          hasToken: href.includes('__lovable_token=')
        },
        requiredUrls: {
          javascriptOrigin: origin,
          redirectUri: `${origin}/auth/callback`,
          supabaseRedirectUri: `${supabaseUrl}/auth/v1/callback`
        },
        googleConsoleUrls: {
          authorizedJavaScriptOrigins: [
            origin
          ],
          authorizedRedirectURIs: [
            `${origin}/auth/callback`,
            `${supabaseUrl}/auth/v1/callback`
          ]
        },
        supabaseDashboard: {
          siteURL: origin
        }
      };
    });

    // Display the configuration
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('🌍 CURRENT ENVIRONMENT');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log(`Origin:     ${oauthConfig.environment.origin}`);
    console.log(`Hostname:   ${oauthConfig.environment.hostname}`);
    console.log(`Project ID: ${oauthConfig.environment.projectId || 'N/A'}`);
    console.log(`Has Token:  ${oauthConfig.environment.hasToken ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('🔑 GOOGLE CLOUD CONSOLE CONFIGURATION');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('Add these to your OAuth 2.0 Client ID:\n');
    
    console.log('📌 Authorized JavaScript origins:');
    oauthConfig.googleConsoleUrls.authorizedJavaScriptOrigins.forEach(url => {
      console.log(`   ${url}`);
    });
    
    console.log('\n📌 Authorized redirect URIs:');
    oauthConfig.googleConsoleUrls.authorizedRedirectURIs.forEach(url => {
      console.log(`   ${url}`);
    });
    
    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('🔧 SUPABASE DASHBOARD CONFIGURATION');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('Site URL:');
    console.log(`   ${oauthConfig.supabaseDashboard.siteURL}`);
    
    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('📋 COPY-PASTE READY URLS');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('\nFor Google Cloud Console:');
    console.log('-------------------------');
    console.log('JavaScript Origins:');
    console.log(oauthConfig.googleConsoleUrls.authorizedJavaScriptOrigins.join('\n'));
    console.log('\nRedirect URIs:');
    console.log(oauthConfig.googleConsoleUrls.authorizedRedirectURIs.join('\n'));
    
    console.log('\nFor Supabase:');
    console.log('-------------');
    console.log(oauthConfig.supabaseDashboard.siteURL);

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `oauth-config-${timestamp}.json`;
    await fs.writeFile(filename, JSON.stringify(oauthConfig, null, 2));
    console.log(`\n💾 Configuration saved to: ${filename}`);

    // Now test the OAuth flow
    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('🧪 TESTING OAUTH FLOW');
    console.log('════════════════════════════════════════════════════════════════════');
    
    // Check if sign in button exists
    const hasSignInButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent?.includes('Sign in with Google'));
    });
    
    if (hasSignInButton) {
      console.log('✅ Google Sign-in button found');
      
      // Click the sign in button and capture the error
      const newPagePromise = new Promise((resolve) => {
        page.context().on('page', resolve);
        setTimeout(() => resolve(null), 5000);
      });
      
      await page.click('button:has-text("Sign in with Google")');
      console.log('🖱️ Clicked Google Sign-in button');
      
      const newPage = await newPagePromise;
      
      if (newPage) {
        await newPage.waitForLoadState('domcontentloaded');
        const googleUrl = newPage.url();
        console.log(`🌐 Redirected to: ${googleUrl}`);
        
        // Check for 403 error
        const pageContent = await newPage.content();
        if (pageContent.includes('403') || pageContent.includes('Error 403')) {
          console.log('❌ Google OAuth returned 403 error');
          console.log('   This means the OAuth URLs are not configured correctly in Google Console');
        } else if (googleUrl.includes('accounts.google.com')) {
          console.log('✅ Successfully reached Google OAuth page');
        }
        
        await newPage.close();
      } else {
        console.log('⚠️ No OAuth redirect detected - popup might be blocked');
      }
    } else {
      console.log('ℹ️ No Google Sign-in button found (user might be authenticated)');
    }

    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('✨ EXTRACTION COMPLETE');
    console.log('════════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the extraction
extractOAuthConfig().catch(console.error);