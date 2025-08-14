const fs = require('fs');
const path = require('path');

const uploadDir = 'uploaded-screenshots/issue-19/20250814-043646';
const testFile = '01-initial-load.png';

try {
  const filePath = path.join(uploadDir, testFile);
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  
  console.log('## 📸 Base64 Screenshot Test\n');
  console.log(`### 📸 ${testFile}`);
  console.log(`![${testFile}](${dataUrl})\n`);
  console.log('✅ **Base64 embedding test** - If you can see the screenshot above, the base64 approach works!');
} catch (err) {
  console.log('❌ Error:', err.message);
}