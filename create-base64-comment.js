const fs = require('fs');
const path = require('path');

const uploadDir = 'uploaded-screenshots/issue-19/20250814-043646';

console.log('## 📸 Test Screenshots Uploaded - Base64 Embedded\n');
console.log('**Test Name**: Migration Fix Screenshots - Base64 Embedded');
console.log('**Uploaded**: ' + new Date().toISOString() + '\n');

try {
  const files = fs.readdirSync(uploadDir);
  const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg')).sort();
  
  imageFiles.forEach(file => {
    try {
      const filePath = path.join(uploadDir, file);
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      console.log(`### 📸 ${file}`);
      console.log(`![${file}](${dataUrl})\n`);
    } catch (err) {
      console.log(`### 📸 ${file}`);
      console.log(`⚠️ Error loading image: ${file}\n`);
    }
  });
} catch (error) {
  console.log('⚠️ Screenshots were uploaded but could not be embedded. Check the repository for files.\n');
}

console.log('---');
console.log(`📁 **Repository Path**: \`${uploadDir}\``);
console.log('🧹 **Auto-cleanup**: Screenshots older than 10 days are automatically removed');
console.log('✅ **Immediate Access**: Screenshots are embedded above for instant viewing');