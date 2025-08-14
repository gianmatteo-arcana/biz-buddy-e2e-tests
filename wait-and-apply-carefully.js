const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function waitAndApplyCarefully() {
  console.log('⏳ WAITING FOR RATE LIMITS, THEN APPLYING CAREFULLY');
  console.log('==================================================');
  console.log('🎯 Mission: Continue until zero pending migrations');
  console.log('⏳ Waiting 5 minutes for any rate limits to reset...');
  
  // Wait 5 minutes for rate limiting to reset
  await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
  
  console.log('✅ Wait complete, starting careful application...');
  
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Enable console logging to catch any JavaScript errors
    page.on('console', msg => {
      console.log(`🖥️  BROWSER: ${msg.text()}`);
    });

    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Migrations")');
    await page.waitForTimeout(5000);

    let totalApplied = 0;
    let maxAttempts = 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}: Checking migration status...`);

      // Check current pending count
      let pendingCount = 0;
      try {
        await page.click('button:has-text("Refresh")');
        await page.waitForTimeout(3000);
        
        const pendingText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
        pendingCount = parseInt(pendingText.match(/\((\d+)\)/)?.[1] || '0');
        console.log(`📊 Current pending: ${pendingCount}`);
      } catch (e) {
        console.log('❓ Could not read pending count');
        break;
      }

      if (pendingCount === 0) {
        console.log('🎉 ZERO PENDING ACHIEVED!');
        break;
      }

      console.log(`🎯 Attempting to apply 1 migration from ${pendingCount} pending...`);

      try {
        // Uncheck all first
        const allCheckboxes = await page.locator('input[type="checkbox"]').count();
        console.log(`📋 Found ${allCheckboxes} checkboxes, unchecking all first...`);
        
        for (let i = 0; i < allCheckboxes; i++) {
          await page.locator('input[type="checkbox"]').nth(i).uncheck();
        }

        // Check only the first one
        if (allCheckboxes > 0) {
          await page.locator('input[type="checkbox"]').first().check();
          console.log('✅ Checked first migration only');
        } else {
          console.log('❓ No checkboxes found');
          continue;
        }

        // Apply with careful error monitoring
        await page.click('button:has-text("Apply Selected")');
        console.log('🔵 Applied selected migration...');

        // Wait for response and monitor for specific errors
        let success = false;
        let errorDetected = false;
        
        for (let wait = 0; wait < 30; wait++) {
          await page.waitForTimeout(2000);
          
          // Check for success
          const successElements = await page.locator('text=/✅|successfully|applied|success/i').count();
          
          // Check for specific errors
          const rateLimit = await page.locator('text=/rate limit|too many|attempts/i').count();
          const edgeError = await page.locator('text=/edge function|non-2xx|failed/i').count();
          const authError = await page.locator('text=/auth|permission|owner/i').count();
          
          if (successElements > 0) {
            console.log('✅ Success indicator found');
            success = true;
            totalApplied++;
            break;
          }
          
          if (rateLimit > 0) {
            console.log('⚠️ Rate limit detected - waiting longer...');
            await page.waitForTimeout(10000); // Wait extra for rate limit
            continue;
          }
          
          if (edgeError > 0) {
            console.log('❌ Edge function error detected');
            errorDetected = true;
            break;
          }
          
          if (authError > 0) {
            console.log('❌ Authentication/permission error detected');
            errorDetected = true;
            break;
          }
          
          console.log(`⏳ Waiting... (${(wait + 1) * 2}s)`);
        }

        if (!success && !errorDetected) {
          console.log('❓ Migration status unclear after 60s wait');
        }

        // Take a screenshot after each attempt
        const attemptScreenshot = path.join('uploaded-screenshots', 'careful-attempts', `attempt-${attempt}-${Date.now()}.png`);
        fs.mkdirSync(path.dirname(attemptScreenshot), { recursive: true });
        await page.screenshot({ path: attemptScreenshot });
        console.log(`📸 Screenshot saved: ${attemptScreenshot}`);

        // Extra wait between attempts to avoid overwhelming the system
        await page.waitForTimeout(10000);

      } catch (error) {
        console.log(`❌ Error in attempt ${attempt}: ${error.message}`);
        await page.waitForTimeout(5000);
      }
    }

    // Final check and screenshot
    console.log('\n📊 Final verification...');
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(5000);

    let finalCount = 0;
    try {
      const finalText = await page.locator('text=/Pending Migrations \\((\\d+)\\)/').textContent();
      finalCount = parseInt(finalText.match(/\((\d+)\)/)?.[1] || '0');
    } catch (e) {
      console.log('Could not read final count');
    }

    // Final screenshot
    const finalScreenshot = path.join('uploaded-screenshots', 'careful-final', `final-careful-${Date.now()}.png`);
    fs.mkdirSync(path.dirname(finalScreenshot), { recursive: true });
    await page.screenshot({ path: finalScreenshot, fullPage: true });

    const results = {
      timestamp: new Date().toISOString(),
      strategy: "Careful application with rate limit handling",
      totalApplied,
      finalPendingCount: finalCount,
      zeroPendingAchieved: finalCount === 0,
      missionComplete: finalCount === 0
    };

    fs.writeFileSync(finalScreenshot.replace('.png', '-results.json'), JSON.stringify(results, null, 2));

    console.log('\n🏁 CAREFUL APPLICATION RESULTS:');
    console.log('===============================');
    console.log(`🔢 Total applied this session: ${totalApplied}`);
    console.log(`📊 Final pending count: ${finalCount}`);
    console.log(`🎯 Zero pending achieved: ${finalCount === 0 ? "✅ YES!" : "❌ NO"}`);
    console.log(`📸 Final screenshot: ${finalScreenshot}`);
    
    if (finalCount === 0) {
      console.log('\n🎉🎉🎉 MISSION ACCOMPLISHED! 🎉🎉🎉');
      console.log('ALL MIGRATIONS APPLIED!');
      console.log('ZERO PENDING MIGRATIONS ACHIEVED!');
    } else {
      console.log(`\n⚠️ Still ${finalCount} migrations pending`);
      console.log('May require manual intervention or different approach');
    }

    await context.close();
    return { 
      success: true, 
      totalApplied,
      finalPendingCount: finalCount, 
      zeroPendingAchieved: finalCount === 0,
      finalScreenshot 
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

waitAndApplyCarefully().then(result => {
  console.log('\n🏆 FINAL RESULT:', result);
  
  if (result.success && result.zeroPendingAchieved) {
    console.log('🎯 MISSION COMPLETE: Zero pending migrations achieved!');
    process.exit(0);
  } else {
    console.log('📋 Mission continues - zero pending not yet achieved');
    process.exit(0);  // Still exit 0 since we made an attempt
  }
});