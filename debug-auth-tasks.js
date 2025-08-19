const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function debugAuthAndTasks() {
  console.log('🔍 Debugging Authentication and Task Loading\n');
  console.log('=' .repeat(50) + '\n');
  
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  try {
    // Use stored auth state
    const context = await browser.newContext({
      storageState: '.auth/user-state.json'
    });
    
    const page = await context.newPage();
    
    // Log console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('error') || text.includes('Error')) {
        console.log('❌ Console Error:', text);
      } else if (text.includes('Backend') || text.includes('tasks') || text.includes('useTasks')) {
        console.log('📝', text);
      }
    });
    
    // Log network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        const headers = request.headers();
        console.log('\n📤 API Request:', request.method(), url);
        if (headers.authorization) {
          console.log('   Auth Header:', headers.authorization.substring(0, 50) + '...');
        } else {
          console.log('   ⚠️ No Authorization header!');
        }
      }
    });
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/')) {
        const status = response.status();
        console.log(`📥 API Response: ${status} ${url}`);
        
        if (status >= 400) {
          try {
            const body = await response.text();
            console.log('   Error Body:', body.substring(0, 200));
          } catch (e) {}
        } else if (url.includes('/api/tasks')) {
          try {
            const body = await response.json();
            console.log('   Success! Tasks data:', JSON.stringify(body).substring(0, 100));
          } catch (e) {}
        }
      }
    });
    
    // Navigate to the app
    console.log('1️⃣ Navigating to http://localhost:8081...\n');
    await page.goto('http://localhost:8081', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Check authentication status
    console.log('\n2️⃣ Checking authentication status...\n');
    
    const authData = await page.evaluate(() => {
      const storageData = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
      if (storageData) {
        const parsed = JSON.parse(storageData);
        return {
          hasToken: !!parsed.access_token,
          tokenPreview: parsed.access_token ? parsed.access_token.substring(0, 50) : null,
          user: parsed.user ? { email: parsed.user.email, id: parsed.user.id } : null,
          expiresAt: parsed.expires_at
        };
      }
      return null;
    });
    
    if (authData) {
      console.log('✅ Authentication found:');
      console.log('   User:', authData.user);
      console.log('   Token preview:', authData.tokenPreview + '...');
      console.log('   Expires:', new Date(authData.expiresAt * 1000).toLocaleString());
    } else {
      console.log('❌ No authentication found');
    }
    
    // Wait for API calls to complete
    console.log('\n3️⃣ Waiting for API calls to complete...\n');
    await page.waitForTimeout(5000);
    
    // Check for error messages in UI
    const errorElements = await page.$$('text=/error|failed|Error loading tasks/i');
    if (errorElements.length > 0) {
      console.log('\n❌ Error messages found in UI:');
      for (const el of errorElements) {
        const text = await el.textContent();
        console.log('   -', text);
      }
    }
    
    // Check for tasks in the DOM
    const taskElements = await page.$$('[data-testid*="task"], .task-card, [class*="task"]');
    console.log(`\n📊 Found ${taskElements.length} task elements in DOM`);
    
    // Try to manually call the backend
    console.log('\n4️⃣ Testing direct backend call...\n');
    const manualTest = await page.evaluate(async () => {
      try {
        const sessionData = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
        if (!sessionData) return { error: 'No session data' };
        
        const session = JSON.parse(sessionData);
        if (!session.access_token) return { error: 'No access token' };
        
        console.log('Making request with token:', session.access_token.substring(0, 50));
        
        const response = await fetch('/api/tasks', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
        
        return {
          status: response.status,
          data: data,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Manual API test result:', JSON.stringify(manualTest, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'debug-auth-tasks.png', fullPage: true });
    console.log('\n📸 Screenshot saved: debug-auth-tasks.png');
    
    console.log('\n✅ Debug session complete. Browser remains open.');
    console.log('Check the DevTools Network tab for more details.');
    console.log('Press Ctrl+C to exit.\n');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error);
    await browser.close();
  }
}

debugAuthAndTasks().catch(console.error);