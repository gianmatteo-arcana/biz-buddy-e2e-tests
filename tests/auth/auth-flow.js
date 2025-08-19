#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runAuthFlow() {
  console.log('🔐 BizBuddy Authentication Flow\n');
  
  // Check if credentials exist
  const credentialsPath = path.join(__dirname, '.auth', '.test-credentials');
  const hasCredentials = fs.existsSync(credentialsPath);
  
  if (!hasCredentials) {
    console.log('❌ No test credentials found');
    console.log('📝 Setting up credentials...\n');
    
    try {
      await execAsync('npm run setup:credentials', { stdio: 'inherit' });
    } catch (_error) {
      console.error('Failed to setup credentials');
      process.exit(1);
    }
  }
  
  // Check if auth state exists and is valid
  const authPath = path.join(__dirname, '.auth', 'user-state.json');
  const hasAuth = fs.existsSync(authPath);
  
  if (hasAuth) {
    console.log('🔍 Checking existing auth validity...');
    
    try {
      const authState = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      
      // Find auth token
      let authToken = null;
      if (authState.origins && authState.origins.length > 0) {
        const localStorage = authState.origins[0].localStorage || [];
        const tokenItem = localStorage.find(item => 
          item.name.includes('auth-token')
        );
        if (tokenItem) {
          try {
            authToken = JSON.parse(tokenItem.value);
          } catch (_e) {
            // Token might not be JSON
          }
        }
      }
      
      if (authToken && authToken.expires_at) {
        const expiresAt = new Date(authToken.expires_at * 1000);
        const now = new Date();
        const minutesLeft = Math.floor((expiresAt - now) / 1000 / 60);
        
        if (minutesLeft > 5) {
          console.log(`✅ Auth is valid for ${minutesLeft} more minutes`);
          console.log('🎯 Ready to run tests!\n');
          console.log('Run: npm test');
          return;
        } else {
          console.log(`⚠️  Auth expires in ${minutesLeft} minutes - refreshing...`);
        }
      }
    } catch (_error) {
      console.log('⚠️  Could not validate existing auth');
    }
  } else {
    console.log('📝 No existing auth state found');
  }
  
  // Run automated auth capture
  console.log('\n🚀 Running automated authentication...\n');
  
  try {
    const { stdout, stderr } = await execAsync('node auth-automated.js');
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('\n✅ Authentication complete!');
    console.log('🎯 Ready to run tests!\n');
    console.log('Run: npm test');
  } catch (_error) {
    console.error('\n❌ Authentication failed');
    console.error(error.message);
    
    // Suggest manual fallback
    console.log('\n💡 You can try manual authentication with:');
    console.log('   npm run auth:refresh');
    
    process.exit(1);
  }
}

// Run the flow
runAuthFlow().catch(console.error);