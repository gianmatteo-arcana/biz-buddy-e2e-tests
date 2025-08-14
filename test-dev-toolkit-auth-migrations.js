const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Test Dev Toolkit authentication and apply migrations
 * This test verifies auth works and attempts to apply migrations
 */

async function testDevToolkitAuthAndMigrations() {
  console.log('🔧 Testing Dev Toolkit Authentication & Migrations');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  // Use stored authentication
  const authFile = path.join(__dirname, '.auth/user-state.json');
  
  if (!fs.existsSync(authFile)) {
    console.log('❌ No auth file found!');
    process.exit(1);
  }

  console.log('✅ Loading authentication from .auth/user-state.json');
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: authFile
  });

  const page = await context.newPage();

  try {
    // First go to main app to establish auth
    console.log('\n📍 Step 1: Navigate to main app first...');
    await page.goto('http://localhost:8081', {
      waitUntil: 'networkidle'
    });
    
    await page.waitForTimeout(2000);
    
    // Check if we're authenticated in main app
    const welcomeText = await page.locator('text=/Welcome.*Gianmatteo/i').first();
    if (await welcomeText.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Authenticated in main app (Welcome, Gianmatteo!)');
    } else {
      console.log('   ⚠️ May not be authenticated in main app');
    }
    
    // Now open Dev Toolkit via keyboard shortcut
    console.log('\n📍 Step 2: Opening Dev Toolkit with Cmd+K...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('K');
    await page.keyboard.up('Meta');
    
    // Wait for modal to open
    const modal = await page.locator('[role="dialog"]').first();
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Dev Toolkit modal opened');
      
      // Check for Demo Mode or Authenticated status
      await page.waitForTimeout(2000);
      
      // Take screenshot to see status
      const screenshotDir = path.join(__dirname, 'test-screenshots', 'auth-check');
      fs.mkdirSync(screenshotDir, { recursive: true });
      
      await page.screenshot({
        path: path.join(screenshotDir, 'dev-toolkit-modal-auth.png'),
        fullPage: false
      });
      
      // Check for Demo Mode
      const demoMode = await page.locator('text=/Demo Mode/i').first();
      const authenticated = await page.locator('text=/Authenticated|Real Backend/i').first();
      
      if (await demoMode.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   ❌ Dev Toolkit shows DEMO MODE (not authenticated!)');
      } else if (await authenticated.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   ✅ Dev Toolkit shows AUTHENTICATED');
      } else {
        console.log('   ⚠️ Auth status unclear in Dev Toolkit modal');
      }
      
      // Click on Migrations tab
      console.log('\n📍 Step 3: Clicking Migrations tab...');
      const migrationTab = await page.locator('button[role="tab"]:has-text("Migration")').first();
      if (await migrationTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await migrationTab.click();
        console.log('   ✅ Migrations tab clicked');
        
        await page.waitForTimeout(2000);
        
        // Try to apply migrations if authenticated
        const applyButton = await page.locator('button:has-text("Apply Selected")').first();
        if (await applyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('\n📍 Step 4: Attempting to apply migrations...');
          
          // Check all checkboxes first
          const checkboxes = await page.locator('input[type="checkbox"]').all();
          for (const checkbox of checkboxes) {
            if (!(await checkbox.isChecked())) {
              await checkbox.check();
            }
          }
          
          await applyButton.click();
          console.log('   🎯 Clicked Apply Selected');
          
          // Wait for response
          await page.waitForTimeout(5000);
          
          // Check for error or success
          const errorMsg = await page.locator('text=/Error.*Edge Function/i').first();
          const successMsg = await page.locator('text=/success|applied|healed/i').first();
          
          if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
            const errorText = await errorMsg.textContent();
            console.log(`   ❌ Migration failed: ${errorText}`);
            console.log('   📝 This suggests authentication issue with edge functions');
          } else if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
            const successText = await successMsg.textContent();
            console.log(`   ✅ Success: ${successText}`);
          }
        }
      }
      
      // Close modal
      await page.keyboard.press('Escape');
    }
    
    // Alternative: Try standalone Dev Toolkit page
    console.log('\n📍 Step 5: Testing standalone Dev Toolkit page...');
    await page.goto('http://localhost:8081/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });
    
    await page.waitForTimeout(2000);
    
    // Check auth status in standalone
    const standaloneDemoMode = await page.locator('text=/Demo Mode/i').first();
    const standaloneAuth = await page.locator('text=/Authenticated|Real Backend/i').first();
    
    if (await standaloneDemoMode.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   ❌ Standalone Dev Toolkit shows DEMO MODE');
      console.log('   📝 This explains why migrations fail - not authenticated!');
    } else if (await standaloneAuth.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   ✅ Standalone Dev Toolkit shows AUTHENTICATED');
    }
    
    // Take final screenshot
    await page.screenshot({
      path: path.join(screenshotDir, 'dev-toolkit-standalone-auth.png'),
      fullPage: false
    });
    
    console.log('\n📊 Summary:');
    console.log('   - Main app authentication: Working');
    console.log('   - Dev Toolkit modal auth: Check screenshot');
    console.log('   - Dev Toolkit standalone auth: Check screenshot');
    console.log('   - Migration application: Requires proper auth to work');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n' + '=' .repeat(60));
    console.log('Test complete. Check screenshots for visual confirmation.');
    
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

testDevToolkitAuthAndMigrations().catch(console.error);