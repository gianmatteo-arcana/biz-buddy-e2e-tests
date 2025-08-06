const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Automatically pushes local auth state to Railway
 * Requires Railway CLI to be installed and logged in
 */

async function pushAuthToRailway() {
  console.log('🚀 Pushing auth state to Railway\n');
  
  const authStatePath = path.join(__dirname, '..', '.auth', 'user-state.json');
  
  try {
    // 1. Check if Railway CLI is installed
    try {
      execSync('railway --version', { stdio: 'pipe' });
      console.log('✅ Railway CLI detected');
    } catch (e) {
      console.error('❌ Railway CLI not found. Install it with:');
      console.error('   npm install -g @railway/cli');
      console.error('   Then run: railway login');
      return false;
    }
    
    // 2. Check if auth state exists
    if (!fs.existsSync(authStatePath)) {
      console.error('❌ No auth state found. Run: npm run auth:refresh');
      return false;
    }
    
    // 3. Read and encode auth state
    console.log('📖 Reading auth state...');
    const authState = fs.readFileSync(authStatePath, 'utf8');
    const authStateBase64 = Buffer.from(authState).toString('base64');
    console.log('✅ Auth state encoded');
    
    // 4. Check if we're in a Railway project
    try {
      execSync('railway status', { stdio: 'pipe' });
    } catch (e) {
      console.error('❌ Not in a Railway project. Run: railway link');
      return false;
    }
    
    // 5. Update Railway environment variable
    console.log('\n🔄 Updating Railway environment...');
    
    // Use Railway CLI to set the variable
    const command = `railway variables set BIZBUDDY_AUTH_STATE="${authStateBase64}"`;
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Auth state pushed to Railway!');
    
    // 6. Optional: Trigger a new deployment
    console.log('\n🚀 Would you like to trigger a deployment? (y/n)');
    // In a real implementation, we'd read user input here
    // For now, we'll just show how to do it
    console.log('   To deploy: railway up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Alternative approach using Railway API directly
async function pushAuthViaAPI() {
  console.log('\n📡 Alternative: Using Railway API\n');
  
  const authStatePath = path.join(__dirname, '..', '.auth', 'user-state.json');
  const railwayToken = process.env.RAILWAY_TOKEN;
  
  if (!railwayToken) {
    console.log('To use the API approach:');
    console.log('1. Get your Railway API token from: https://railway.app/account/tokens');
    console.log('2. Set it as: export RAILWAY_TOKEN=your-token');
    console.log('3. Run this script again');
    return false;
  }
  
  // This would use the Railway API to update variables
  // Implementation depends on Railway's API endpoints
  console.log('✅ Would update via API with token:', railwayToken.substring(0, 10) + '...');
}

// Run the appropriate method
if (require.main === module) {
  pushAuthToRailway().then(success => {
    if (!success) {
      console.log('\n---');
      pushAuthViaAPI();
    }
  });
}

module.exports = { pushAuthToRailway };