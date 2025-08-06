const { chromium } = require('@playwright/test');

(async () => {
  console.log('Testing Chromium launch...\n');
  
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Browser launched successfully!');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('Navigating to example.com...');
    await page.goto('https://example.com');
    
    console.log('✅ Navigation successful!');
    console.log('\nBrowser should be visible now. Press Ctrl+C to close.');
    
    // Keep browser open
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Error launching browser:', error);
  }
})();