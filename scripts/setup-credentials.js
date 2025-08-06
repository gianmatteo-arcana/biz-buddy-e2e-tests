#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create readline interface for password input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for password with hidden input
function promptPassword(prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    // Save the current settings
    const wasRaw = stdin.isRaw;

    // Disable echoing (hide password input)
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    stdout.write(prompt);

    let password = '';
    
    stdin.on('data', (char) => {
      char = char.toString('utf8');

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          // End of input
          if (stdin.isTTY) {
            stdin.setRawMode(wasRaw);
          }
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          // Ctrl+C
          if (stdin.isTTY) {
            stdin.setRawMode(wasRaw);
          }
          stdout.write('\n');
          process.exit();
          break;
        case '\u007f':
        case '\b':
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          // Add character to password
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function main() {
  console.log('🔐 BizBuddy E2E Test Credentials Setup\n');
  
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
  
  // Prompt for password
  const password = await promptPassword('Test Password: ');
  
  // Create a temporary credentials file (expires after 1 hour)
  const credentialsPath = path.join(__dirname, '..', '.auth', '.test-credentials');
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
  fs.writeFileSync(credentialsPath, JSON.stringify(encryptedData));
  fs.chmodSync(credentialsPath, 0o600); // Read/write for owner only
  
  console.log('\n✅ Credentials saved (valid for 1 hour)');
  console.log('   Run tests with: npm test');
  
  rl.close();
}

// Run the setup
main().catch(console.error);