const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const SESSION_FILE = path.join(__dirname, '.auth-session.json');

async function debugAuth() {
  console.log('🔍 Debug Auth - Checking localStorage injection');
  console.log('===============================================\\n');
  
  // Load auth
  const data = await fs.readFile(SESSION_FILE, 'utf8');
  const session = JSON.parse(data);
  
  console.log('📄 Saved session:', {
    hasAccessToken: !!session.access_token,
    hasRefreshToken: !!session.refresh_token,
    hasUser: !!session.user,
    userEmail: session.user?.email
  });
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Track console logs
  page.on('console', msg => {
    console.log('   🖥️ ', msg.text());
  });
  
  // Inject auth - same as test
  await page.evaluateOnNewDocument((authData) => {
    const supabaseKey = `sb-raenkewzlvrdqufwxjpl-auth-token`;
    const authSession = {
      access_token: authData.access_token,
      token_type: 'bearer',
      user: authData.user || null,
      expires_at: Date.now() + 3600000,
      expires_in: 3600,
      refresh_token: authData.refresh_token || null
    };
    
    console.log('🔧 Injecting auth:', { hasToken: !!authSession.access_token, userEmail: authSession.user?.email });
    
    localStorage.setItem(supabaseKey, JSON.stringify({
      currentSession: authSession,
      expiresAt: Date.now() + 3600000
    }));
    localStorage.setItem('supabase.auth.token', JSON.stringify(authSession));
    console.log('✅ localStorage set, keys:', Object.keys(localStorage));
  }, session);
  
  console.log('\\n📍 Loading page...');
  await page.goto(APP_URL);
  
  // Check what's actually in localStorage
  console.log('\\n📍 Checking localStorage content...');
  const localStorageContent = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    console.log('🔍 localStorage keys found:', keys);
    
    const result = {};
    for (const key of keys) {
      const value = localStorage.getItem(key);
      result[key] = value;
      
      if (key.includes('supabase') || key.includes('auth')) {
        console.log(`📝 ${key}:`, value.substring(0, 100));
      }
    }
    
    return result;
  });
  
  console.log('\\n📋 Browser localStorage summary:');
  Object.keys(localStorageContent).forEach(key => {
    console.log(`  - ${key}: ${localStorageContent[key] ? 'SET' : 'EMPTY'}`);
  });
  
  await page.waitForTimeout(5000);
  await browser.close();
}

debugAuth().catch(console.error);