#!/usr/bin/env node

/**
 * Direct auth test - manually inject session and force recognition
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const SESSION_FILE = path.join(__dirname, '.auth-session.json');

async function testDirectAuth() {
  console.log('🧪 Direct Auth Test');
  console.log('==================\\n');
  
  // Load session
  const data = await fs.readFile(SESSION_FILE, 'utf8');
  const session = JSON.parse(data);
  
  console.log('📄 Using session for:', session.user?.email);
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Track all console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('RealTimeVisualizer') || text.includes('auth') || text.includes('Auth') || text.includes('user') || text.includes('User') || text.includes('token')) {
      console.log('   🔍', text.substring(0, 150));
    }
  });
  
  await page.goto(`${APP_URL}/dev-toolkit-standalone`);
  
  // Wait for initial load
  await page.waitForTimeout(3000);
  
  console.log('\\n📍 Step 1: Check initial state');
  const initialState = await page.evaluate(() => {
    return {
      localStorageKeys: Object.keys(localStorage),
      hasSupabaseClient: typeof window.supabase !== 'undefined',
      bodyText: document.body.textContent.includes('Demo mode')
    };
  });
  
  console.log('   • localStorage keys:', initialState.localStorageKeys.length);
  console.log('   • Has Supabase client:', initialState.hasSupabaseClient);
  console.log('   • Shows demo mode:', initialState.bodyText);
  
  console.log('\\n📍 Step 2: Inject authentication session');
  await page.evaluate((authData) => {
    console.log('🔧 DIRECT AUTH: Injecting session data');
    
    // Store auth data for manual restoration
    window.__directAuth = {
      access_token: authData.access_token,
      refresh_token: authData.refresh_token || '',
      user: authData.user
    };
    
    // Set localStorage with proper Supabase format
    const supabaseKey = `sb-raenkewzlvrdqufwxjpl-auth-token`;
    const authSession = {
      access_token: authData.access_token,
      refresh_token: authData.refresh_token || '',
      token_type: 'bearer',
      user: authData.user,
      expires_at: Date.now() + 3600000,
      expires_in: 3600
    };
    
    localStorage.setItem(supabaseKey, JSON.stringify({
      currentSession: authSession,
      expiresAt: Date.now() + 3600000
    }));
    
    console.log('✅ DIRECT AUTH: Session data stored in localStorage');
    
    // Force immediate auth check in React components
    setTimeout(() => {
      console.log('🔄 DIRECT AUTH: Dispatching forceAuthCheck event');
      window.dispatchEvent(new CustomEvent('forceAuthCheck'));
    }, 1000);
    
  }, session);
  
  // Wait for the auth check to complete
  await page.waitForTimeout(5000);
  
  console.log('\\n📍 Step 3: Verify authentication took effect');
  const authState = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const authKeys = keys.filter(k => k.includes('supabase') || k.includes('auth'));
    const bodyText = document.body.textContent;
    
    return {
      authKeys: authKeys.length,
      hasAuthToken: authKeys.some(key => {
        const value = localStorage.getItem(key);
        return value && value.includes('access_token');
      }),
      showsDemo: bodyText.includes('Demo mode'),
      showsAuthenticated: bodyText.includes('Authenticated'),
      showsReal: bodyText.includes('Real') && !bodyText.includes('Demo'),
      currentTaskText: document.querySelector('[data-testid="current-task"], .current-task')?.textContent || 'No task element found'
    };
  });
  
  console.log('   • Auth keys in localStorage:', authState.authKeys);
  console.log('   • Has access token:', authState.hasAuthToken);
  console.log('   • Shows demo mode:', authState.showsDemo);
  console.log('   • Shows authenticated:', authState.showsAuthenticated);
  console.log('   • Shows real data:', authState.showsReal);
  console.log('   • Current task:', authState.currentTaskText);
  
  // Take a screenshot
  const timestamp = Date.now();
  const screenshotPath = path.join('/Users/gianmatteo/Documents/Arcana-Prototype/tests', `direct-auth-test-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('\\n📸 Screenshot saved:', screenshotPath);
  
  // Keep browser open for manual inspection
  console.log('\\n⏸️  Browser kept open for manual inspection...');
  console.log('   Press Ctrl+C to close');
  
  // Wait indefinitely
  await new Promise(() => {});
}

testDirectAuth().catch(console.error);