#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Function to prompt for password with hidden input
async function promptPassword(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  return new Promise((resolve) => {
    // Set up raw mode for password input
    rl.stdoutMuted = true;
    
    rl.question(prompt, (password) => {
      rl.close();
      console.log(); // New line after password
      resolve(password);
    });

    // Override _writeToOutput to hide password
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        if (stringToWrite.includes(prompt)) {
          rl.output.write(prompt);
        } else {
          // Show asterisks for each character
          const chars = stringToWrite.replace(prompt, '');
          if (chars === '\r' || chars === '\n') {
            rl.output.write(chars);
          } else if (chars.charCodeAt(0) === 127 || chars === '\b') {
            // Handle backspace
            rl.output.write('\b \b');
          } else {
            rl.output.write('*'.repeat(chars.length));
          }
        }
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

async function main() {
  console.log('🔐 BizBuddy E2E Test Credentials Setup\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Prompt for email
  const email = await new Promise((resolve) => {
    rl.question('Test Email (Google account): ', (answer) => {
      resolve(answer.trim());
    });
  });
  
  if (!email) {
    console.error('❌ Email is required');
    rl.close();
    process.exit(1);
  }
  
  console.log(`\nUsing email: ${email}\n`);
  rl.close();
  
  // Prompt for password
  const password = await promptPassword('Test Password: ');
  
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }
  
  // Create credentials object
  const credentials = {
    email,
    password,
    createdAt: Date.now(),
    expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
  };
  
  // Encrypt credentials using modern crypto API
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync('biz-buddy-test-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Store IV with encrypted data
  const encryptedData = {
    iv: iv.toString('hex'),
    data: encrypted
  };
  
  // Ensure .auth directory exists
  const authDir = path.join(__dirname, '..', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // Save encrypted credentials
  const credentialsPath = path.join(authDir, '.test-credentials');
  fs.writeFileSync(credentialsPath, JSON.stringify(encryptedData));
  fs.chmodSync(credentialsPath, 0o600); // Read/write for owner only
  
  console.log('\n✅ Credentials saved (valid for 1 hour)');
  console.log('   Run auth with: npm run auth:automated');
  console.log('   Or full flow: npm run auth');
  
  process.exit(0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

// Run the setup
main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});