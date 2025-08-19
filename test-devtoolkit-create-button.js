const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Testing Dev Toolkit Create Button...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  const page = await context.newPage();
  
  // Go to dev toolkit
  await page.goto('http://localhost:8081/dev-toolkit-standalone');
  console.log('📄 Navigated to Dev Toolkit');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check if authenticated
  const authDisplay = await page.$('[data-testid="auth-display"]');
  if (authDisplay) {
    const email = await page.$eval('[data-testid="auth-email"]', el => el.textContent);
    console.log('✅ Authenticated as:', email);
  } else {
    console.log('⚠️ Not authenticated');
  }
  
  // Look for the template dropdown
  const templateDropdown = await page.$('button[role="combobox"]');
  if (templateDropdown) {
    console.log('📋 Found template dropdown');
    
    // Click to open dropdown
    await templateDropdown.click();
    await page.waitForTimeout(500);
    
    // Select "Onboarding" option
    const onboardingOption = await page.$('text=Onboarding');
    if (onboardingOption) {
      await onboardingOption.click();
      console.log('✅ Selected Onboarding template');
      await page.waitForTimeout(500);
    }
    
    // Look for Create button
    const createButton = await page.$('button:has-text("Create")');
    if (createButton) {
      console.log('✅ Found Create button!');
      
      // Check if button is enabled
      const isDisabled = await createButton.evaluate(btn => btn.disabled);
      if (isDisabled) {
        console.log('⚠️ Create button is disabled');
      } else {
        console.log('✅ Create button is enabled');
        
        // Take screenshot before clicking
        await page.screenshot({ 
          path: 'devtoolkit-before-create.png',
          fullPage: false
        });
        
        // Click Create button
        await createButton.click();
        console.log('🎯 Clicked Create button');
        
        // Wait for task creation
        await page.waitForTimeout(3000);
        
        // Take screenshot after
        await page.screenshot({ 
          path: 'devtoolkit-after-create.png',
          fullPage: false
        });
        
        // Check for success or error messages
        const toastMessage = await page.$('.toast-message, [data-radix-collection-item]');
        if (toastMessage) {
          const message = await toastMessage.textContent();
          console.log('📝 Toast message:', message);
        }
      }
    } else {
      console.log('❌ Create button not found - checking if it exists anywhere');
      const allButtons = await page.$$eval('button', buttons => 
        buttons.map(btn => btn.textContent)
      );
      console.log('All buttons found:', allButtons);
    }
  } else {
    console.log('❌ Template dropdown not found');
  }
  
  console.log('✅ Test complete - browser will stay open for 10 seconds');
  await page.waitForTimeout(10000);
  
  await browser.close();
})().catch(console.error);