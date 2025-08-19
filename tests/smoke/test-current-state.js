#!/usr/bin/env node

/**
 * Test current state of the application
 * Checks all the reported issues
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const SESSION_FILE = path.join(__dirname, '.auth-session.json');
const TEST_RUN_DIR = path.join('/Users/gianmatteo/Documents/Arcana-Prototype/tests', `current-state-${Date.now()}`);

async function screenshot(page, name) {
  await page.screenshot({ 
    path: path.join(TEST_RUN_DIR, `${name}.png`), 
    fullPage: true 
  });
  console.log(`📸 ${name}.png`);
}

async function testCurrentState() {
  console.log('🔍 Testing Current Application State');
  console.log('=====================================\n');
  
  await fs.mkdir(TEST_RUN_DIR, { recursive: true });
  
  // Check for auth
  let session = null;
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf8');
    session = JSON.parse(data);
    console.log('✅ Found saved authentication');
  } catch (e) {
    console.log('⚠️  No saved auth - testing as anonymous');
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Inject auth if available
  if (session) {
    await page.evaluateOnNewDocument((authData) => {
      // Set the auth token with the correct Supabase key format
      const supabaseKey = `sb-raenkewzlvrdqufwxjpl-auth-token`;
      const authSession = {
        access_token: authData.access_token,
        token_type: 'bearer',
        user: authData.user || null,
        expires_at: Date.now() + 3600000, // 1 hour from now
        expires_in: 3600,
        refresh_token: authData.refresh_token || null
      };
      localStorage.setItem(supabaseKey, JSON.stringify({
        currentSession: authSession,
        expiresAt: Date.now() + 3600000
      }));
      // Also set the generic token key for compatibility
      localStorage.setItem('supabase.auth.token', JSON.stringify(authSession));
    }, session);
  }
  
  // Track console logs
  page.on('console', msg => {
    if (msg.text().includes('Error') || msg.text().includes('Warning')) {
      console.log('🔍 Console:', msg.text().substring(0, 100));
    }
  });
  
  try {
    // Test 1: Main Dashboard
    console.log('📍 Test 1: Dashboard');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    await screenshot(page, '01-dashboard');
    
    const dashboardCheck = await page.evaluate(() => {
      return {
        hasOnboardingCard: document.body.textContent.includes('onboarding') || 
                          document.body.textContent.includes('Onboarding'),
        hasTaskCards: document.querySelectorAll('[class*="card"]').length > 0,
        isAuthenticated: !!localStorage.getItem('supabase.auth.token'),
        visibleText: document.querySelector('h1')?.textContent || 'No header found'
      };
    });
    
    console.log('  Onboarding card:', dashboardCheck.hasOnboardingCard ? '✅' : '❌');
    console.log('  Task cards:', dashboardCheck.hasTaskCards ? '✅' : '❌');
    console.log('  Authenticated:', dashboardCheck.isAuthenticated ? '✅' : '❌');
    console.log('  Page header:', dashboardCheck.visibleText);
    
    // Test 2: Dev Toolkit Route
    console.log('\n📍 Test 2: Dev Toolkit');
    const devToolkitResponse = await page.goto(`${APP_URL}/dev-toolkit-standalone`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    if (devToolkitResponse.status() === 404) {
      console.log('  ❌ Dev Toolkit returns 404');
    } else {
      console.log('  ✅ Dev Toolkit loaded (status:', devToolkitResponse.status() + ')');
      await page.waitForTimeout(3000);
      await screenshot(page, '02-dev-toolkit');
      
      const devToolkitCheck = await page.evaluate(() => {
        const bodyText = document.body.textContent;
        return {
          hasVisualizer: bodyText.includes('Visualizer') || bodyText.includes('Agent'),
          hasAuthenticated: bodyText.includes('Authenticated'),
          hasRealData: bodyText.includes('Real') && !bodyText.includes('Demo'),
          hasTaskSelector: !!document.querySelector('select'),
          hasStartButton: Array.from(document.querySelectorAll('button'))
            .some(b => b.textContent.includes('Start') || b.textContent.includes('Onboarding'))
        };
      });
      
      console.log('  Has visualizer:', devToolkitCheck.hasVisualizer ? '✅' : '❌');
      console.log('  Shows authenticated:', devToolkitCheck.hasAuthenticated ? '✅' : '❌');
      console.log('  Has real data:', devToolkitCheck.hasRealData ? '✅' : '❌');
      console.log('  Has task selector:', devToolkitCheck.hasTaskSelector ? '✅' : '❌');
      console.log('  Has start button:', devToolkitCheck.hasStartButton ? '✅' : '❌');
    }
    
    // Test 3: Check authentication persistence
    console.log('\n📍 Test 3: Authentication Persistence');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    
    const authCheck = await page.evaluate(() => {
      // Check both possible keys
      const supabaseKey = `sb-raenkewzlvrdqufwxjpl-auth-token`;
      let storage = localStorage.getItem(supabaseKey);
      
      if (!storage) {
        storage = localStorage.getItem('supabase.auth.token');
      }
      
      if (!storage) return { hasToken: false };
      
      try {
        const parsed = JSON.parse(storage);
        const session = parsed.currentSession || parsed;
        return {
          hasToken: true,
          hasAccessToken: !!session.access_token,
          tokenLength: session.access_token ? session.access_token.length : 0,
          hasUser: !!session.user
        };
      } catch (e) {
        return { hasToken: false, error: e.message };
      }
    });
    
    if (authCheck.hasToken) {
      console.log('  ✅ Auth token present');
      console.log('  Token valid:', authCheck.hasAccessToken ? '✅' : '❌');
    } else {
      console.log('  ❌ No auth token found');
    }
    
    // Test 4: Check for task visualization components
    console.log('\n📍 Test 4: Task Visualization Components');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    const componentCheck = await page.evaluate(() => {
      return {
        hasTabs: document.querySelectorAll('[role="tab"], button[class*="tab"]').length > 0,
        hasTimeline: document.body.textContent.includes('Timeline'),
        hasContext: document.body.textContent.includes('Context'),
        hasReasoning: document.body.textContent.includes('Reasoning'),
        hasOrchestration: document.body.textContent.includes('Orchestration'),
        tabCount: document.querySelectorAll('[role="tab"], button[class*="tab"]').length
      };
    });
    
    console.log('  Has tabs:', componentCheck.hasTabs ? '✅' : '❌');
    console.log('  Timeline tab:', componentCheck.hasTimeline ? '✅' : '❌');
    console.log('  Context tab:', componentCheck.hasContext ? '✅' : '❌');
    console.log('  Reasoning tab:', componentCheck.hasReasoning ? '✅' : '❌');
    console.log('  Orchestration tab:', componentCheck.hasOrchestration ? '✅' : '❌');
    console.log('  Total tabs found:', componentCheck.tabCount);
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log('Dashboard:');
    console.log('  • Onboarding card:', dashboardCheck.hasOnboardingCard ? '✅ Present' : '❌ Missing');
    console.log('  • Task cards:', dashboardCheck.hasTaskCards ? '✅ Present' : '❌ Missing');
    console.log('\nDev Toolkit:');
    console.log('  • Route works:', devToolkitResponse.status() !== 404 ? '✅ Yes' : '❌ No');
    console.log('  • Shows real data:', session ? '🔍 Check screenshots' : '⚠️ Need auth');
    console.log('\nAuthentication:');
    console.log('  • Token saved:', authCheck.hasToken ? '✅ Yes' : '❌ No');
    console.log('  • Persists:', authCheck.hasToken ? '✅ Yes' : '❌ No');
    console.log('\nVisualization:');
    console.log('  • Components present:', componentCheck.hasTabs ? '✅ Yes' : '❌ No');
    
    console.log('\n📁 Screenshots saved to:');
    console.log(`   ../tests/${path.basename(TEST_RUN_DIR)}/`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
}

// Polyfill
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}

testCurrentState().catch(console.error);