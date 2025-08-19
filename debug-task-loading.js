const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function debugTaskLoading() {
  console.log('🔍 Debugging Task Loading Issue\n');
  console.log('================================\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true, // Open DevTools automatically
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log('❌ Console Error:', text);
    } else if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
      console.log('⚠️ Console Warning:', text);
    } else if (text.includes('Backend') || text.includes('tasks') || text.includes('API')) {
      console.log('📝 Console:', text);
    }
  });

  // Monitor network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('supabase')) {
      console.log('📤 Request:', request.method(), url.substring(0, 100));
    }
  });

  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    if (url.includes('/api/') || url.includes('supabase')) {
      console.log(`📥 Response: ${status} ${url.substring(0, 100)}`);
      
      // Log error responses
      if (status >= 400) {
        response.text().then(text => {
          console.log('   Error Body:', text.substring(0, 200));
        }).catch(() => {});
      }
    }
  });

  try {
    console.log('1️⃣ Navigating to localhost:8081...\n');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
    
    // Check if we're on the login page
    const signInButton = await page.$('button:has-text("Sign in with Google")');
    if (signInButton) {
      console.log('✅ On login page\n');
      
      // Click sign in
      console.log('2️⃣ Clicking Sign in with Google...\n');
      await signInButton.click();
      
      // Wait for OAuth redirect
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
      
      // Check if we're on Google OAuth
      if (page.url().includes('accounts.google.com')) {
        console.log('📧 On Google OAuth page - Please complete authentication manually\n');
        console.log('   Waiting for redirect back to app...\n');
        
        // Wait for redirect back
        await page.waitForFunction(
          () => !window.location.href.includes('accounts.google.com'),
          { timeout: 60000 }
        );
      }
    }
    
    // Check if we're authenticated
    console.log('3️⃣ Checking authentication status...\n');
    
    // Wait a moment for the page to settle
    await page.waitForTimeout(2000);
    
    // Check for dashboard elements
    const isDashboard = await page.$('.dashboard-container, [data-testid="dashboard"]');
    if (isDashboard) {
      console.log('✅ On dashboard\n');
    }
    
    // Check for error messages
    const errorElement = await page.$('.text-destructive, [class*="error"]');
    if (errorElement) {
      const errorText = await errorElement.evaluate(el => el.textContent);
      console.log('❌ Error on page:', errorText, '\n');
    }
    
    // Check localStorage for auth token
    const authData = await page.evaluate(() => {
      const session = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          return {
            hasToken: !!parsed.access_token,
            tokenLength: parsed.access_token ? parsed.access_token.length : 0,
            expiresAt: parsed.expires_at,
            user: parsed.user ? { email: parsed.user.email, id: parsed.user.id } : null
          };
        } catch (e) {
          return { error: 'Failed to parse session' };
        }
      }
      return null;
    });
    
    console.log('4️⃣ Auth Status:\n');
    if (authData) {
      console.log('   ✅ Has auth token:', authData.hasToken);
      console.log('   Token length:', authData.tokenLength);
      console.log('   User:', authData.user);
      console.log('   Expires:', new Date(authData.expiresAt * 1000).toLocaleString());
    } else {
      console.log('   ❌ No auth token found');
    }
    
    // Check network tab for API calls
    console.log('\n5️⃣ Checking for API calls...\n');
    
    // Wait for any pending API calls
    await page.waitForTimeout(3000);
    
    // Check if tasks are in the DOM
    const taskElements = await page.$$('[class*="task"], [data-testid*="task"]');
    console.log(`   Found ${taskElements.length} task elements in DOM\n`);
    
    // Try to manually trigger a task fetch
    console.log('6️⃣ Attempting manual task fetch...\n');
    const apiResult = await page.evaluate(async () => {
      try {
        // Get the auth token
        const sessionData = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
        if (!sessionData) return { error: 'No auth token' };
        
        const session = JSON.parse(sessionData);
        if (!session.access_token) return { error: 'No access token in session' };
        
        // Try to fetch tasks directly
        const response = await fetch('/api/tasks', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          data = responseText;
        }
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: data
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('   API Result:', JSON.stringify(apiResult, null, 2));
    
    // Take a screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: `debug-tasks-${timestamp}.png`, fullPage: true });
    console.log(`\n📸 Screenshot saved: debug-tasks-${timestamp}.png`);
    
    console.log('\n🔍 Debugging complete. Browser remains open for manual inspection.');
    console.log('Press Ctrl+C to exit.\n');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugTaskLoading();