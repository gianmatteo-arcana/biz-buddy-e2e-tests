const fs = require('fs');

// Create a simple base64 test with smaller content
const filePath = 'uploaded-screenshots/issue-19/20250814-043646/01-initial-load.png';

if (fs.existsSync(filePath)) {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  
  // Only show first 200 chars to test if the approach works
  const shortBase64 = base64.substring(0, 1000);
  const testData = `data:image/png;base64,${shortBase64}`;
  
  console.log('📸 Testing small base64 approach:');
  console.log(`File size: ${Math.round(buffer.length/1024)}KB`);
  console.log(`Base64 size: ${Math.round(base64.length/1024)}KB`);
  console.log(`\nMarkdown test:\n![test](${testData})`);
} else {
  console.log('File not found');
}