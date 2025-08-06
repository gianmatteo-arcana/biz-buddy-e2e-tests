#!/usr/bin/env node

const { exec } = require('child_process');
const AuthManager = require('./auth-manager');

async function runTests() {
  const authManager = new AuthManager();
  
  // Check if auth is valid
  const isValid = await authManager.ensureValidAuth();
  
  if (!isValid) {
    console.log('❌ Cannot run tests without valid authentication.');
    console.log('   Please run: npm run auth:refresh');
    process.exit(1);
  }
  
  // Auth is valid, run the tests
  console.log('🚀 Running tests...\n');
  
  // Get the test command from arguments or use default
  const testCommand = process.argv.slice(2).join(' ') || '';
  const fullCommand = `npx playwright test ${testCommand}`;
  
  console.log(`Executing: ${fullCommand}\n`);
  
  const testProcess = exec(fullCommand, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    if (error) {
      console.error(`Test execution failed: ${error.message}`);
      process.exit(1);
    }
  });
  
  // Pipe output in real-time
  testProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  testProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
}

runTests().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});