#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🔧 E2E Test Environment Setup\n');
  
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
  }
  
  // Read example file
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example not found!');
    process.exit(1);
  }
  
  let envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  console.log('\n📧 Test Account Setup');
  console.log('Email: gianmatteo.allyn.test@gmail.com');
  
  // Get password (hidden input would be better, but keeping it simple)
  const password = await question('\nEnter password for test account: ');
  
  if (!password) {
    console.error('\n❌ Password is required');
    process.exit(1);
  }
  
  // Replace password in content
  envContent = envContent.replace(/TEST_GOOGLE_PASSWORD=your-password-here/g, `TEST_GOOGLE_PASSWORD=${password}`);
  envContent = envContent.replace(/TEST_USER_1_PASSWORD=your-password-here/g, `TEST_USER_1_PASSWORD=${password}`);
  
  // Write .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ .env file created successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Run tests with saved auth: npm test');
  console.log('2. Run fresh signup test: npm run test:oauth-flow');
  console.log('3. Run manual test: npm run test:manual-signup\n');
  
  rl.close();
}

setupEnvironment().catch(console.error);