#!/usr/bin/env node

/**
 * Simple E2E test runner - uses saved auth automatically
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDczODMsImV4cCI6MjA2ODYyMzM4M30.CvnbE8w1yEX4zYHjHmxRIpTlh4O7ZClbcNSEfYFGlag';

const SESSION_FILE = path.join(__dirname, '.auth-session.json');
const TEST_RUN_DIR = path.join('/Users/gianmatteo/Documents/Arcana-Prototype/tests', `test-results-${new Date().toISOString().split('T')[0]}-${Date.now()}`);

// Colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function success(msg) { console.log(colors.green + '✅ ' + msg + colors.reset); }
function error(msg) { console.log(colors.red + '❌ ' + msg + colors.reset); }
function info(msg) { console.log(colors.blue + '📍 ' + msg + colors.reset); }
function test(msg) { console.log(colors.yellow + '🧪 ' + msg + colors.reset); }

async function loadAuth() {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    error('No authentication found!');
    console.log('\nRun this first:');
    console.log('  ' + colors.blue + 'node update-test-auth.js' + colors.reset + '\n');
    process.exit(1);
  }
}

async function screenshot(page, name) {
  const filename = `${name}.png`;
  await page.screenshot({ 
    path: path.join(TEST_RUN_DIR, filename), 
    fullPage: true 
  });
  console.log(`   📸 ${filename}`);
}

async function runTest() {
  console.log('🚀 E2E Test - Dev Toolkit with Real Data');
  console.log('=========================================\n');
  
  // Load auth
  info('Loading authentication...');
  const session = await loadAuth();
  
  if (session.user?.email) {
    success(`Authenticated as: ${session.user.email}`);
  } else {
    success('Authentication loaded');
  }
  
  // Create results directory
  await fs.mkdir(TEST_RUN_DIR, { recursive: true });
  const testDirName = path.basename(TEST_RUN_DIR);
  info(`Results will be saved to: ../tests/${testDirName}/\n`);
  
  // Launch browser
  info('Starting browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set up a post-load session restore
  await page.evaluateOnNewDocument((authData) => {
    // Store the session data for later restoration
    window.__testAuthData = {
      access_token: authData.access_token,
      refresh_token: authData.refresh_token || '',
      user: authData.user
    };
    
    console.log('🔧 Test auth data prepared for restoration');
  }, session);
  
  // Log console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('RealTimeVisualizer') || text.includes('Authenticated') || text.includes('REAL') || text.includes('Loading tasks') || text.includes('Error') || text.includes('Failed')) {
      console.log('   🔍', text.substring(0, 120));
    }
  });
  
  try {
    // Test 1: Load Dev Toolkit
    test('Loading Dev Toolkit...');
    await page.goto(`${APP_URL}/dev-toolkit-standalone`, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // Set up localStorage and trigger a custom event to force auth re-check
    info('Setting up authentication...');
    await page.evaluate((authData) => {
      // Set the auth token with the correct Supabase key format
      const supabaseKey = `sb-raenkewzlvrdqufwxjpl-auth-token`;
      const authSession = {
        access_token: authData.access_token,
        token_type: 'bearer',
        user: authData.user || null,
        expires_at: Date.now() + 3600000,
        expires_in: 3600,
        refresh_token: authData.refresh_token || null
      };
      
      localStorage.setItem(supabaseKey, JSON.stringify({
        currentSession: authSession,
        expiresAt: Date.now() + 3600000
      }));
      localStorage.setItem('supabase.auth.token', JSON.stringify(authSession));
      
      console.log('✅ Auth tokens set in localStorage');
      
      // Dispatch a custom event to force components to re-check auth
      window.dispatchEvent(new CustomEvent('forceAuthCheck'));
    }, session);
    
    await page.waitForTimeout(3000);
    
    await screenshot(page, '01-dev-toolkit');
    
    // Test 2: Check authentication
    test('Checking authentication status...');
    const authStatus = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const badges = Array.from(document.querySelectorAll('.badge, [class*="badge"]'));
      return {
        authenticated: badges.some(b => b.textContent.includes('Authenticated')),
        realBackend: bodyText.includes('Connected to real backend'),
        demoMode: bodyText.includes('Demo mode')
      };
    });
    
    if (authStatus.authenticated) {
      success('Shows "Authenticated" badge');
    }
    if (authStatus.realBackend) {
      success('Shows "Connected to real backend"');
    }
    if (!authStatus.demoMode) {
      success('Not in demo mode');
    }
    
    // Test 3: Create or select task
    test('Working with tasks...');
    
    // Check for task selector
    const hasSelector = await page.$('select');
    if (hasSelector) {
      info('Found task selector - selecting first task...');
      const options = await page.$$eval('select option', opts => opts.map(o => o.text));
      if (options.length > 1) {
        await page.select('select', 1);
        await page.waitForTimeout(2000);
      }
    } else {
      // Try to create new task
      const startButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Start New Onboarding'));
        return btn ? buttons.indexOf(btn) : -1;
      });
      
      if (startButton >= 0) {
        info('Creating new task...');
        const buttons = await page.$$('button');
        await buttons[startButton].click();
        await page.waitForTimeout(3000);
      }
    }
    
    await screenshot(page, '02-task-loaded');
    
    // Test 4: Check for real data
    test('Verifying real data...');
    const dataCheck = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.badge, [class*="badge"]'));
      return {
        hasReal: badges.some(b => b.textContent === 'Real'),
        hasDemo: badges.some(b => b.textContent === 'Demo')
      };
    });
    
    if (dataCheck.hasReal && !dataCheck.hasDemo) {
      success('Showing REAL data!');
    } else if (dataCheck.hasDemo) {
      error('Still showing demo data');
    }
    
    // Test 5: Check tabs
    test('Checking visualization tabs...');
    const tabs = ['Timeline', 'Context', 'Reasoning', 'Orchestration'];
    
    for (const tabName of tabs) {
      const tabButton = await page.evaluate((name) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tab = buttons.find(b => b.textContent.includes(name));
        return tab ? buttons.indexOf(tab) : -1;
      }, tabName);
      
      if (tabButton >= 0) {
        const buttons = await page.$$('button');
        await buttons[tabButton].click();
        await page.waitForTimeout(1000);
        info(`${tabName} tab opened`);
      }
    }
    
    await screenshot(page, '03-final-state');
    
    // Summary
    console.log('\n' + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    success('Test Complete!');
    console.log(colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    
    console.log('\n📊 Results:');
    console.log(`   • Authentication: ${authStatus.authenticated ? '✅' : '❌'}`);
    console.log(`   • Real Backend: ${authStatus.realBackend ? '✅' : '❌'}`);
    console.log(`   • Real Data: ${dataCheck.hasReal ? '✅' : '❌'}`);
    console.log(`   • No Demo Mode: ${!dataCheck.hasDemo ? '✅' : '❌'}`);
    
    const testDirName = path.basename(TEST_RUN_DIR);
    console.log('\n📁 Screenshots saved to:');
    console.log('   ' + colors.blue + `../tests/${testDirName}/` + colors.reset);
    console.log('\n💡 View screenshots with:');
    console.log('   ' + colors.blue + `open ../tests/${testDirName}/` + colors.reset + '\n');
    
  } catch (err) {
    error('Test failed: ' + err.message);
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

// Run
runTest().catch(err => {
  error('Fatal error: ' + err.message);
  process.exit(1);
});