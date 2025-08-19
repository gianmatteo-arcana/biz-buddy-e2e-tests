const { chromium } = require('playwright');
const path = require('path');

async function debugFrontendQuery() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true // Open DevTools
  });

  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('task_context_events') || text.includes('RealTimeVisualizer')) {
      console.log('📋 Frontend:', text);
    }
  });
  
  // Listen to network requests
  page.on('request', request => {
    if (request.url().includes('task_context_events')) {
      console.log('🌐 Request to:', request.url());
      console.log('   Method:', request.method());
      console.log('   Headers:', request.headers());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('task_context_events')) {
      response.text().then(body => {
        console.log('📥 Response from:', response.url());
        console.log('   Status:', response.status());
        console.log('   Body:', body.substring(0, 500));
      });
    }
  });
  
  console.log('🔍 Debugging frontend query to task_context_events...\n');
  
  await page.goto('http://localhost:8081/dev-toolkit-standalone');
  
  // Wait to see what happens
  await page.waitForTimeout(10000);
  
  // Check localStorage for auth info
  const authInfo = await page.evaluate(() => {
    const authData = localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      return {
        userId: parsed.user?.id,
        email: parsed.user?.email
      };
    }
    return null;
  });
  
  console.log('\n🔐 Auth info:', authInfo);
  
  await page.waitForTimeout(5000);
  await browser.close();
}

debugFrontendQuery().catch(console.error);