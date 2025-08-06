import { test as setup } from '@playwright/test';
const AuthManager = require('../../auth-manager');

setup('authenticate with Google OAuth', async ({ }) => {
  const authManager = new AuthManager();
  
  // Check if we need to re-authenticate
  const validity = await authManager.checkAuthValidity();
  
  if (validity.valid) {
    console.log(`\n✅ Using existing auth (valid for ${validity.minutesLeft} more minutes)\n`);
    return;
  }
  
  console.log('\n❌ Auth is invalid or expired. Manual authentication required.');
  console.log('\n' + '='.repeat(60));
  console.log('Please run the following command in a terminal:');
  console.log('\n   npm run auth:refresh\n');
  console.log('='.repeat(60) + '\n');
  
  throw new Error('Authentication required. Please run: npm run auth:refresh');
});