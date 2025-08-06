const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getTestCredentials() {
  const credentialsPath = path.join(__dirname, '..', '.auth', '.test-credentials');
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error('No test credentials found. Run: npm run setup:credentials');
  }
  
  // Read encrypted credentials
  const encryptedData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  // Decrypt using modern crypto API
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync('biz-buddy-test-key', 'salt', 32);
  const iv = Buffer.from(encryptedData.iv, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  const credentials = JSON.parse(decrypted);
  
  // Check if expired
  if (Date.now() > credentials.expiresAt) {
    fs.unlinkSync(credentialsPath);
    throw new Error('Test credentials expired. Run: npm run setup:credentials');
  }
  
  return {
    email: credentials.email,
    password: credentials.password
  };
}

module.exports = { getTestCredentials };