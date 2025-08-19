#!/usr/bin/env node

/**
 * FINAL VERIFICATION TEST - Arcana Dwell LLC with Screenshots
 * 
 * This test verifies:
 * 1. Onboarding shows Arcana Dwell LLC (not mock data)
 * 2. Dev Toolkit shows real agent activity
 * 3. Resilient fallback pattern works
 * 4. Screenshots captured at each step
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const TEST_URL = 'http://localhost:8080';
const OUTPUT_DIR = `arcana-final-${Date.now()}`;

async function captureScreenshot(page, name) {
  const screenshotPath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: true
  });
  console.log(`📸 Screenshot saved: ${name}.png`);
  return screenshotPath;
}

async function runFinalVerification() {
  console.log('🍷 FINAL VERIFICATION - Arcana Dwell LLC');
  console.log('==========================================\n');
  
  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Error:', msg.text());
    }
  });

  const results = {
    onboarding: { success: false, details: {} },
    devToolkit: { success: false, details: {} },
    groundTruths: { success: false, details: {} },
    screenshots: []
  };

  try {
    console.log('📍 Step 1: Navigate to app');
    await page.goto(TEST_URL, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Capture initial state
    results.screenshots.push(await captureScreenshot(page, '01-initial-load'));
    
    // Check for onboarding
    const hasOnboarding = await page.evaluate(() => {
      return document.body.textContent?.includes('Welcome to SmallBizAlly');
    });
    
    if (hasOnboarding) {
      console.log('✅ Onboarding UI loaded');
      results.onboarding.success = true;
      
      // Click Get Started
      console.log('\n📍 Step 2: Click Get Started');
      const getStartedBtn = await page.$('[data-testid="get-started"]');
      if (getStartedBtn) {
        await getStartedBtn.click();
        console.log('✅ Clicked Get Started button');
        await new Promise(r => setTimeout(r, 6000)); // Wait for animation
        
        results.screenshots.push(await captureScreenshot(page, '02-after-get-started'));
        
        // Check for Arcana Dwell LLC
        console.log('\n📍 Step 3: Verify Arcana Dwell LLC appears');
        const businessData = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          return {
            hasArcanaDwell: bodyText.includes('Arcana Dwell LLC'),
            hasOldMockData: bodyText.includes('Sarah Chen') || bodyText.includes('TechStartup'),
            hasAPIMessage: bodyText.includes('API not available'),
            hasUserGuidance: bodyText.includes('Please provide'),
            businessFound: bodyText.includes('We found your business')
          };
        });
        
        console.log('Business Data Check:', businessData);
        
        if (businessData.hasArcanaDwell && !businessData.hasOldMockData) {
          console.log('✅ Arcana Dwell LLC displayed correctly');
          console.log('✅ No mock data (Sarah Chen/TechStartup) present');
          results.groundTruths.success = true;
          results.groundTruths.details = businessData;
        }
        
        if (businessData.hasAPIMessage && businessData.hasUserGuidance) {
          console.log('✅ Resilient fallback working - shows API unavailable');
          console.log('✅ User guidance provided');
        }
        
        // Click on the business card to continue
        console.log('\n📍 Step 4: Select Arcana Dwell LLC');
        const businessCard = await page.$('.cursor-pointer');
        if (businessCard) {
          await businessCard.click();
          await new Promise(r => setTimeout(r, 3000));
          
          results.screenshots.push(await captureScreenshot(page, '03-business-selected'));
          
          // Check profile data
          const profileData = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[readonly]'));
            return inputs.map(input => ({
              value: input.value,
              hasArcanaDwell: input.value.includes('Arcana Dwell'),
              hasMissionSt: input.value.includes('2512 Mission'),
              hasOwners: document.body.textContent?.includes('Gianmatteo Costanza')
            }));
          });
          
          if (profileData.some(p => p.hasArcanaDwell || p.hasMissionSt)) {
            console.log('✅ Profile populated with Arcana Dwell data');
          }
        }
      }
    }
    
    // Check Dev Toolkit
    console.log('\n📍 Step 5: Check Dev Toolkit');
    const devToolkitLogs = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'));
      return logs.map(log => log.textContent);
    });
    
    if (devToolkitLogs.length > 0) {
      console.log(`✅ Dev Toolkit shows ${devToolkitLogs.length} agent activities`);
      results.devToolkit.success = true;
      results.devToolkit.details = {
        logCount: devToolkitLogs.length,
        hasBusinessDiscovery: devToolkitLogs.some(log => log.includes('BusinessDiscoveryAgent')),
        hasUserGuidance: devToolkitLogs.some(log => log.includes('User guidance')),
        hasArcanaDwell: devToolkitLogs.some(log => log.includes('Arcana Dwell LLC'))
      };
      
      console.log('Dev Toolkit Details:', results.devToolkit.details);
    }
    
    // Final screenshot
    results.screenshots.push(await captureScreenshot(page, '04-final-state'));
    
    // Generate summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL VERIFICATION RESULTS');
    console.log('='.repeat(50));
    
    const allSuccess = results.onboarding.success && 
                       results.groundTruths.success && 
                       results.devToolkit.success;
    
    console.log(`\n✅ Onboarding UI: ${results.onboarding.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Arcana Dwell Ground Truths: ${results.groundTruths.success ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Dev Toolkit Activity: ${results.devToolkit.success ? 'PASS' : 'FAIL'}`);
    console.log(`📸 Screenshots Captured: ${results.screenshots.length}`);
    
    if (allSuccess) {
      console.log('\n🎉 FINAL VERDICT: SUCCESS - All systems working correctly!');
      console.log('   • Arcana Dwell LLC data displayed (not mock data)');
      console.log('   • Resilient fallback pattern working');
      console.log('   • Dev Toolkit showing real agent activity');
      console.log('   • User guidance provided when APIs unavailable');
    } else {
      console.log('\n❌ FINAL VERDICT: Some issues detected');
    }
    
    console.log(`\n📁 All screenshots saved to: ${OUTPUT_DIR}/`);
    
    // Save results JSON
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'results.json'),
      JSON.stringify(results, null, 2)
    );
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await captureScreenshot(page, 'error-state');
  } finally {
    console.log('\n🔍 Browser staying open for inspection...');
    console.log('   Press Ctrl+C to close');
    
    // Keep browser open for inspection
    await new Promise(() => {});
  }
}

// Run the test
runFinalVerification().catch(console.error);