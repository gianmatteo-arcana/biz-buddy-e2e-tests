#!/usr/bin/env node

/**
 * Refresh authentication by using existing Supabase session
 * This properly stores the credentials you provide
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function refreshAuth() {
  console.log('🔄 Refreshing Authentication');
  console.log('═'.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  try {
    // Start with existing auth state if available
    let context;
    if (fs.existsSync('.auth/user-state.json')) {
      console.log('📂 Found existing auth state, loading...');
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        storageState: '.auth/user-state.json'
      });
    } else {
      console.log('📂 No auth state found, starting fresh...');
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });
    }
    
    const page = await context.newPage();
    
    // Go to the app
    console.log('🌐 Navigating to app...');
    await page.goto('http://localhost:8081', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for page to stabilize
    await page.waitForTimeout(3000);
    
    // Check if authenticated
    const isAuthenticated = await page.evaluate(() => {
      const authToken = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      if (authToken) {
        try {
          const parsed = JSON.parse(authToken);
          const exp = parsed.expiresAt || (parsed.expires_at * 1000);
          const isValid = exp > Date.now();
          return {
            authenticated: isValid,
            email: parsed.user?.email,
            expiresAt: new Date(exp).toISOString()
          };
        } catch (e) {
          return { authenticated: false };
        }
      }
      return { authenticated: false };
    });
    
    if (isAuthenticated.authenticated) {
      console.log('✅ Already authenticated as:', isAuthenticated.email);
      console.log('   Token expires:', isAuthenticated.expiresAt);
      
      // Save the current state
      console.log('\n💾 Saving authentication state...');
      await context.storageState({ path: '.auth/user-state.json' });
      console.log('✅ Auth state saved to .auth/user-state.json');
      
      // Extract and display the token for manual use if needed
      const tokenInfo = await page.evaluate(() => {
        const authToken = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
        const parsed = JSON.parse(authToken);
        return {
          accessToken: parsed.access_token,
          userId: parsed.user?.id
        };
      });
      
      console.log('\n📋 Current Authentication Details:');
      console.log('   User ID:', tokenInfo.userId);
      console.log('   Access Token (first 50 chars):', tokenInfo.accessToken.substring(0, 50) + '...');
      
    } else {
      console.log('⚠️ Not authenticated or token expired');
      console.log('\n📝 MANUAL AUTHENTICATION REQUIRED:');
      console.log('   1. Click "Sign in with Google" in the browser');
      console.log('   2. Complete the OAuth flow');
      console.log('   3. Once authenticated, press Enter in this terminal');
      console.log('\n⏳ Waiting for you to authenticate manually...');
      
      // Wait for user to complete auth
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // Check again after manual auth
      const afterAuth = await page.evaluate(() => {
        const authToken = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
        if (authToken) {
          const parsed = JSON.parse(authToken);
          return {
            authenticated: true,
            email: parsed.user?.email,
            userId: parsed.user?.id,
            accessToken: parsed.access_token
          };
        }
        return { authenticated: false };
      });
      
      if (afterAuth.authenticated) {
        console.log('\n✅ Successfully authenticated as:', afterAuth.email);
        
        // Save the state
        await context.storageState({ path: '.auth/user-state.json' });
        console.log('💾 Auth state saved!');
        
        console.log('\n📋 New Authentication Details:');
        console.log('   User ID:', afterAuth.userId);
        console.log('   Access Token (first 50 chars):', afterAuth.accessToken.substring(0, 50) + '...');
      } else {
        console.log('❌ Authentication failed or was cancelled');
      }
    }
    
    console.log('\n✅ Authentication refresh complete!');
    console.log('📂 Auth state is saved in .auth/user-state.json');
    console.log('🔄 This will be used for all subsequent E2E tests');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n⏰ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Handle input for manual auth
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

refreshAuth().catch(console.error);