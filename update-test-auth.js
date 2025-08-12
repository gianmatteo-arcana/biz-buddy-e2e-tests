#!/usr/bin/env node

/**
 * Simple auth updater - just run this when you need to authenticate
 * It handles everything automatically
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const SUPABASE_URL = 'https://raenkewzlvrdqufwxjpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW5rZXd6bHZyZHF1Znd4anBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDczODMsImV4cCI6MjA2ODYyMzM4M30.CvnbE8w1yEX4zYHjHmxRIpTlh4O7ZClbcNSEfYFGlag';

const SESSION_FILE = path.join(__dirname, '.auth-session.json');

// Color output
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
function warn(msg) { console.log(colors.yellow + '⚠️  ' + msg + colors.reset); }

async function checkExistingAuth() {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf8');
    const session = JSON.parse(data);
    
    if (session?.access_token) {
      // Validate it
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      });
      
      const { data: userData, error: authError } = await supabase.auth.getUser(session.access_token);
      
      if (!authError && userData?.user) {
        success(`Already authenticated as: ${userData.user.email}`);
        console.log('\nYou can run tests with:');
        console.log('  node run-e2e-test.js\n');
        return true;
      }
    }
  } catch (e) {
    // No existing session or invalid
  }
  return false;
}

async function waitForEnter(message = 'Press Enter to continue...') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function updateAuth() {
  console.log('🔐 Auth Setup for E2E Tests');
  console.log('===========================\n');
  
  // Check if already authenticated
  info('Checking existing authentication...');
  if (await checkExistingAuth()) {
    const answer = await waitForEnter('Want to update auth? (y/N): ');
    if (!answer || answer.toLowerCase() !== 'y') {
      console.log('Keeping existing auth. Bye!');
      process.exit(0);
    }
  }
  
  console.log('\n📝 Instructions:');
  console.log('1. A browser will open');
  console.log('2. Sign in with Google or email');
  console.log('3. Come back here and press Enter');
  console.log('4. That\'s it!\n');
  
  await waitForEnter('Ready? Press Enter to start...');
  
  info('Opening browser...');
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    info('Loading app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    
    console.log('\n' + colors.yellow + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    console.log(colors.yellow + '   GO TO THE BROWSER AND SIGN IN' + colors.reset);
    console.log(colors.yellow + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset + '\n');
    
    await waitForEnter('After signing in, press Enter here...');
    
    info('Extracting authentication...');
    
    // Extract auth token
    const authData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.includes('supabase') || key.includes('auth')) {
          const value = localStorage.getItem(key);
          try {
            const parsed = JSON.parse(value);
            if (parsed.access_token) {
              return {
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token || null,
                user: parsed.user || null
              };
            }
            if (parsed.currentSession?.access_token) {
              return {
                access_token: parsed.currentSession.access_token,
                refresh_token: parsed.currentSession.refresh_token || null,
                user: parsed.currentSession.user || null
              };
            }
          } catch (e) {}
        }
      }
      return null;
    });
    
    if (!authData?.access_token) {
      error('Could not find authentication token');
      console.log('\nMake sure you:');
      console.log('  • Successfully signed in');
      console.log('  • Can see the dashboard');
      console.log('  • Didn\'t close the browser too early\n');
      await browser.close();
      process.exit(1);
    }
    
    // Save session
    const session = {
      access_token: authData.access_token,
      refresh_token: authData.refresh_token || null,
      token_type: 'bearer',
      user: authData.user,
      updated_at: new Date().toISOString()
    };
    
    await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2));
    
    await browser.close();
    
    console.log('\n' + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    success('Authentication saved successfully!');
    if (session.user?.email) {
      success(`Signed in as: ${session.user.email}`);
    }
    console.log(colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    
    console.log('\n📋 Next step:');
    console.log('  Run your E2E tests with:');
    console.log('  ' + colors.blue + 'node run-e2e-test.js' + colors.reset);
    console.log('\n💡 Auth will persist - no need to sign in again!\n');
    
  } catch (err) {
    error('Something went wrong: ' + err.message);
    await browser.close();
    process.exit(1);
  }
  
  process.exit(0);
}

// Polyfill
if (!puppeteer.Page.prototype.waitForTimeout) {
  puppeteer.Page.prototype.waitForTimeout = function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
}

// Run
updateAuth().catch(err => {
  error('Fatal error: ' + err.message);
  process.exit(1);
});