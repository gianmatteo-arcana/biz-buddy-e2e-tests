const fs = require('fs');
const path = require('path');

/**
 * Prepares auth state for CI/CD environments like Railway
 * 
 * In CI environments, we need to:
 * 1. Read auth state from environment variable (base64 encoded)
 * 2. Write it to the expected location
 * 3. Verify it's valid before running tests
 */

async function prepareAuthForCI() {
  console.log('🔐 Preparing auth state for CI environment\n');
  
  const authStatePath = path.join(__dirname, '..', '.auth', 'user-state.json');
  const authDir = path.dirname(authStatePath);
  
  // Check if we're in CI environment
  if (!process.env.CI && !process.env.RAILWAY_ENVIRONMENT) {
    console.log('✅ Not in CI environment, using local auth state');
    
    // Check if local auth exists
    if (fs.existsSync(authStatePath)) {
      console.log('✅ Local auth state found at:', authStatePath);
      return true;
    } else {
      console.error('❌ No local auth state found. Run: npm run auth:refresh');
      return false;
    }
  }
  
  // In CI environment, get auth from env var
  const authStateBase64 = process.env.BIZBUDDY_AUTH_STATE;
  
  if (!authStateBase64) {
    console.error('❌ BIZBUDDY_AUTH_STATE environment variable not found');
    console.error('   Set it with: base64 -i .auth/user-state.json');
    return false;
  }
  
  try {
    // Create .auth directory if it doesn't exist
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
      console.log('📁 Created .auth directory');
    }
    
    // Decode and write auth state
    const authStateJson = Buffer.from(authStateBase64, 'base64').toString('utf-8');
    const authState = JSON.parse(authStateJson); // Validate JSON
    
    fs.writeFileSync(authStatePath, JSON.stringify(authState, null, 2));
    console.log('✅ Auth state written to:', authStatePath);
    
    // Quick validation
    const cookies = authState.cookies || [];
    const hasLocalStorage = authState.origins && authState.origins.length > 0;
    
    console.log(`\n📊 Auth State Summary:`);
    console.log(`- Cookies: ${cookies.length}`);
    console.log(`- Has localStorage: ${hasLocalStorage}`);
    
    if (cookies.length === 0 || !hasLocalStorage) {
      console.error('\n❌ Auth state appears invalid');
      return false;
    }
    
    console.log('\n✅ Auth state prepared successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to prepare auth state:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  prepareAuthForCI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { prepareAuthForCI };