const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Testing WelcomeCard Experiment...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:8081/');
  console.log('📄 Page loaded');
  
  // Wait for dashboard to load
  await page.waitForTimeout(3000);
  
  // Scroll to completed tasks section
  const completedSection = await page.$('text=Completed Tasks');
  if (completedSection) {
    await completedSection.scrollIntoViewIfNeeded();
    console.log('📜 Scrolled to Completed Tasks section');
    
    // Wait a bit more
    await page.waitForTimeout(1000);
    
    // Look for experiment section
    const experimentSection = await page.$('text=EXPERIMENT: AdvancedTaskCard');
    if (experimentSection) {
      await experimentSection.scrollIntoViewIfNeeded();
      console.log('🧪 Found AdvancedTaskCard experiment!');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'welcomecard-experiment.png',
        fullPage: false
      });
      console.log('📸 Screenshot saved: welcomecard-experiment.png');
      
      // Try to interact with it
      const welcomeCardElement = await page.$('.border-yellow-400');
      if (welcomeCardElement) {
        const box = await welcomeCardElement.boundingBox();
        console.log('📐 AdvancedTaskCard dimensions:', box);
        
        // Click on it to see if it expands
        await welcomeCardElement.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'welcomecard-experiment-clicked.png',
          fullPage: false
        });
        console.log('📸 Screenshot after click saved');
      }
    } else {
      console.log('⚠️ AdvancedTaskCard experiment not found - may need completed tasks');
    }
  } else {
    console.log('⚠️ No Completed Tasks section found');
  }
  
  // Keep browser open for inspection
  console.log('✅ Test complete - browser will stay open for 10 seconds');
  await page.waitForTimeout(10000);
  
  await browser.close();
})().catch(console.error);