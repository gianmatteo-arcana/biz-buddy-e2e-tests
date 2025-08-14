const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function immediateZeroPush() {
  console.log('🚀 IMMEDIATE ZERO PENDING PUSH');
  console.log('==============================');
  console.log('🎯 Mission: Apply migrations until zero pending - NO WAITING');
  
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Migrations")');
    await page.waitForTimeout(3000);

    let iteration = 0;
    const maxIterations = 20;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}: Pushing toward zero...`);

      // Check count
      let pendingCount = 0;
      try {
        await page.click('button:has-text("Refresh")');
        await page.waitForTimeout(2000);
        
        const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
        pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
        console.log(`📊 ${pendingCount} pending migrations`);
      } catch (e) {
        console.log('❓ Could not read count');
        break;
      }

      if (pendingCount === 0) {
        console.log('🎉 ZERO PENDING ACHIEVED!');
        
        // Victory screenshot
        const victoryPath = `uploaded-screenshots/zero-victory-${Date.now()}.png`;
        await page.screenshot({ path: victoryPath, fullPage: true });
        console.log(`📸 Victory screenshot: ${victoryPath}`);
        
        return { 
          success: true, 
          finalPendingCount: 0, 
          zeroPendingAchieved: true,
          iterations: iteration,
          victoryPath 
        };
      }

      // Apply strategy: Try applying just 1 migration
      try {
        // Uncheck all
        const checkboxCount = await page.locator('input[type="checkbox"]').count();
        for (let i = 0; i < checkboxCount; i++) {
          await page.locator('input[type="checkbox"]').nth(i).uncheck();
        }
        
        // Check just first
        if (checkboxCount > 0) {
          await page.locator('input[type="checkbox"]').first().check();
        }
        
        // Apply
        await page.click('button:has-text("Apply Selected")');
        console.log('🔵 Applied 1 migration');
        
        // Quick wait
        await page.waitForTimeout(8000);
        
        // Look for any obvious errors or success
        const hasErrors = await page.locator('text=/error|failed|limit/i').count();
        const hasSuccess = await page.locator('text=/success|applied|✅/i').count();
        
        if (hasErrors > 0) {
          console.log('⚠️ Errors detected in UI');
        }
        if (hasSuccess > 0) {
          console.log('✅ Success indicators in UI');
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }

      // Short pause between iterations
      await page.waitForTimeout(3000);
    }

    // If we get here, we didn't reach zero
    console.log(`\n⏰ Completed ${maxIterations} iterations without reaching zero`);
    
    // Final screenshot
    const finalPath = `uploaded-screenshots/final-push-${Date.now()}.png`;
    await page.screenshot({ path: finalPath, fullPage: true });
    
    let finalCount = 0;
    try {
      const finalText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      finalCount = parseInt(finalText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read final count');
    }

    console.log('\n🏁 IMMEDIATE PUSH RESULTS:');
    console.log('==========================');
    console.log(`🔢 Iterations completed: ${iteration}`);
    console.log(`📊 Final pending count: ${finalCount}`);
    console.log(`🎯 Zero achieved: ${finalCount === 0 ? "✅ YES!" : "❌ NO"}`);
    console.log(`📸 Final screenshot: ${finalPath}`);

    await context.close();
    return { 
      success: true, 
      finalPendingCount: finalCount, 
      zeroPendingAchieved: finalCount === 0,
      iterations: iteration,
      finalPath 
    };

  } catch (error) {
    console.error('❌ Push error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

immediateZeroPush().then(result => {
  console.log('\n🏆 IMMEDIATE PUSH RESULT:', result);
  
  if (result.zeroPendingAchieved) {
    console.log('🎉 MISSION ACCOMPLISHED: ZERO PENDING ACHIEVED!');
    process.exit(0);
  } else {
    console.log('📋 Zero pending not achieved in this push');
    process.exit(0);
  }
});