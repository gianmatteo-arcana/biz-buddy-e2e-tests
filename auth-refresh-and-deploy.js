const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const AuthManager = require('./auth-manager');

/**
 * Complete auth refresh and Railway deployment workflow
 * 1. Captures new auth state
 * 2. Validates it
 * 3. Pushes to Railway
 * 4. Optionally triggers deployment
 */

class AuthRefreshDeploy {
  constructor() {
    this.authManager = new AuthManager();
  }

  async checkRailwayCLI() {
    try {
      execSync('railway --version', { stdio: 'pipe' });
      return true;
    } catch (_e) {
      console.error('\n❌ Railway CLI not installed');
      console.error('Install it with: npm install -g @railway/cli');
      console.error('Then login with: railway login\n');
      return false;
    }
  }

  async checkRailwayProject() {
    try {
      execSync('railway status', { stdio: 'pipe' });
      return true;
    } catch (_e) {
      console.error('\n❌ Not linked to a Railway project');
      console.error('Run: railway link\n');
      return false;
    }
  }

  async refreshAuth() {
    console.log('🔐 Starting auth refresh...\n');
    
    // Check current auth status
    const currentAuth = await this.authManager.checkAuthValidity();
    
    if (currentAuth.valid && currentAuth.minutesLeft > 30) {
      console.log(`✅ Current auth still valid for ${currentAuth.minutesLeft} minutes`);
      console.log('Do you want to refresh anyway? (y/n)');
      // In a real implementation, we'd read user input
      // For now, we'll proceed with the existing auth
      return true;
    }
    
    // Capture new auth
    console.log('📱 Opening browser for auth refresh...');
    await this.authManager.captureAuth();
    
    // Verify new auth
    const newAuth = await this.authManager.checkAuthValidity();
    if (!newAuth.valid) {
      console.error('❌ Auth capture failed');
      return false;
    }
    
    console.log(`\n✅ New auth captured! Valid for ${newAuth.minutesLeft} minutes`);
    return true;
  }

  async pushToRailway() {
    console.log('\n☁️  Pushing auth to Railway...\n');
    
    const authStatePath = path.join(__dirname, '.auth', 'user-state.json');
    
    if (!fs.existsSync(authStatePath)) {
      console.error('❌ No auth state file found');
      return false;
    }
    
    // Read and encode auth state
    const authState = fs.readFileSync(authStatePath, 'utf8');
    const authStateBase64 = Buffer.from(authState).toString('base64');
    
    // Update Railway variable
    try {
      console.log('🔄 Updating BIZBUDDY_AUTH_STATE in Railway...');
      execSync(`railway variables set BIZBUDDY_AUTH_STATE="${authStateBase64}"`, { 
        stdio: 'pipe' 
      });
      console.log('✅ Auth state pushed to Railway');
      return true;
    } catch (_e) {
      console.error('❌ Failed to update Railway variable:', e.message);
      return false;
    }
  }

  async triggerDeployment() {
    console.log('\n🚀 Triggering Railway deployment...\n');
    
    return new Promise((resolve) => {
      const deploy = spawn('railway', ['up'], { stdio: 'inherit' });
      
      deploy.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Deployment triggered successfully!');
          resolve(true);
        } else {
          console.error('\n❌ Deployment failed with code:', code);
          resolve(false);
        }
      });
    });
  }

  async run() {
    console.log('🔄 BizBuddy E2E Auth Refresh & Deploy\n');
    
    // 1. Check prerequisites
    if (!await this.checkRailwayCLI()) return;
    if (!await this.checkRailwayProject()) return;
    
    // 2. Check/refresh auth
    const authValid = await this.authManager.checkAuthValidity();
    
    if (!authValid.valid || authValid.minutesLeft < 30) {
      console.log(`⚠️  Auth expires in ${authValid.minutesLeft || 0} minutes`);
      if (!await this.refreshAuth()) return;
    } else {
      console.log(`✅ Auth valid for ${authValid.minutesLeft} minutes`);
    }
    
    // 3. Push to Railway
    if (!await this.pushToRailway()) return;
    
    // 4. Ask about deployment
    console.log('\n📦 Auth updated in Railway!');
    console.log('Options:');
    console.log('  1. Trigger deployment now (railway up)');
    console.log('  2. Deployment will happen on next git push');
    console.log('\nTo deploy now, run: railway up');
    
    // Could add interactive prompt here to auto-deploy
  }
}

// Create a simpler wrapper function for package.json
async function simpleAuthPush() {
  const authStatePath = path.join(__dirname, '.auth', 'user-state.json');
  
  if (!fs.existsSync(authStatePath)) {
    console.error('❌ No auth state found. Run: npm run auth:refresh');
    process.exit(1);
  }
  
  try {
    // Quick check if Railway CLI is available
    execSync('railway --version', { stdio: 'pipe' });
    
    // Encode and push
    const authState = fs.readFileSync(authStatePath, 'utf8');
    const authStateBase64 = Buffer.from(authState).toString('base64');
    
    console.log('🔄 Pushing auth to Railway...');
    execSync(`railway variables set BIZBUDDY_AUTH_STATE="${authStateBase64}"`, { 
      stdio: 'inherit' 
    });
    
    console.log('\n✅ Done! Auth state updated in Railway');
    console.log('🚀 To deploy: railway up');
    
  } catch (_e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { AuthRefreshDeploy, simpleAuthPush };

// Run if called directly
if (require.main === module) {
  // Check if we want the simple version
  if (process.argv[2] === '--push-only') {
    simpleAuthPush();
  } else {
    const workflow = new AuthRefreshDeploy();
    workflow.run().catch(console.error);
  }
}