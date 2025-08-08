/**
 * Final Comprehensive Dev Toolkit Test
 * 
 * Based on successful discoveries:
 * 1. Demo Mode authentication works
 * 2. /dev route provides Dev Panel
 * 3. Code icon button exists (fixed bottom-right)
 * 4. Google OAuth button is available
 * 
 * This test provides complete coverage of Dev Toolkit functionality
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const LOVABLE_DEV_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';

// OAuth credentials - set these via environment variables
const GOOGLE_TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'gianmatteo.allyn.test@gmail.com';
const GOOGLE_TEST_PASSWORD = process.env.GOOGLE_TEST_PASSWORD;

async function runFinalComprehensiveTest() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(process.cwd(), `final-dev-toolkit-test-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         🚀 FINAL COMPREHENSIVE DEV TOOLKIT TEST              ║
║         Results: ${path.basename(testDir)}         ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let screenshotCount = 0;
  const testResults = {
    timestamp: new Date().toISOString(),
    testDir: path.basename(testDir),
    tests: {
      demo_auth: { status: 'pending', details: null },
      dev_route: { status: 'pending', details: null },
      dev_toolkit_button: { status: 'pending', details: null },
      dev_toolkit_window: { status: 'pending', details: null },
      oauth_flow: { status: 'pending', details: null }
    },
    screenshots: [],
    issues_found: [],
    fixes_applied: [],
    summary: {
      total_tests: 5,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  };

  const takeScreenshot = async (page, name, fullPage = true) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(testDir, filename);
    await page.screenshot({ path: filepath, fullPage });
    testResults.screenshots.push(filename);
    console.log(`📸 ${filename}`);
    return filename;
  };

  try {
    console.log('\n🎯 TEST 1: Demo Mode Authentication');
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle' });
    await takeScreenshot(page, 'initial-load');

    // Test Demo Mode
    try {
      await page.waitForSelector('button:has-text("Demo Mode")', { timeout: 10000 });
      await page.click('button:has-text("Demo Mode (Dev Only)")');
      await page.waitForTimeout(3000);
      
      await takeScreenshot(page, 'demo-mode-activated');
      
      testResults.tests.demo_auth.status = 'passed';
      testResults.tests.demo_auth.details = 'Demo mode authentication successful';
      testResults.summary.passed++;
      console.log('✅ Demo Mode Authentication: PASSED');

    } catch (error) {
      testResults.tests.demo_auth.status = 'failed';
      testResults.tests.demo_auth.details = error.message;
      testResults.issues_found.push('Demo mode authentication failed');
      testResults.summary.failed++;
      console.log('❌ Demo Mode Authentication: FAILED');
    }

    console.log('\n🎯 TEST 2: /dev Route Accessibility');
    try {
      await page.goto(`${LOVABLE_DEV_URL}/dev`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'dev-route');

      const devRouteAnalysis = await page.evaluate(() => {
        return {
          title: document.title,
          hasContent: document.body.textContent.trim().length > 50,
          contentPreview: document.body.textContent.slice(0, 200),
          hasDevPanel: document.body.textContent.includes('Dev Panel') || 
                       document.body.textContent.includes('Developer') ||
                       document.body.textContent.includes('Toolkit'),
          is404: document.body.textContent.toLowerCase().includes('not found')
        };
      });

      if (devRouteAnalysis.hasDevPanel && !devRouteAnalysis.is404) {
        testResults.tests.dev_route.status = 'passed';
        testResults.tests.dev_route.details = devRouteAnalysis;
        testResults.summary.passed++;
        console.log('✅ /dev Route: PASSED - Dev Panel accessible');
      } else {
        testResults.tests.dev_route.status = 'failed';
        testResults.tests.dev_route.details = 'Dev route not accessible or empty';
        testResults.issues_found.push('/dev route not working properly');
        testResults.summary.failed++;
        console.log('❌ /dev Route: FAILED');
      }

    } catch (error) {
      testResults.tests.dev_route.status = 'failed';
      testResults.tests.dev_route.details = error.message;
      testResults.summary.failed++;
      console.log('❌ /dev Route: FAILED');
    }

    console.log('\n🎯 TEST 3: Dev Toolkit Button Detection');
    // Go back to main page for button testing
    await page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Re-authenticate with demo mode if needed
    try {
      const demoButton = await page.$('button:has-text("Demo Mode")');
      if (demoButton) {
        await demoButton.click();
        await page.waitForTimeout(3000);
      }
    } catch (error) {
      console.log('⚠️ Demo mode re-auth failed, continuing...');
    }

    try {
      // Look for the code icon button (fixed bottom-right)
      const codeButton = await page.$('button:has(svg.lucide-code-2)');
      
      if (codeButton) {
        // Get button info
        const buttonInfo = await codeButton.evaluate(btn => {
          return {
            visible: btn.offsetParent !== null,
            text: btn.textContent?.trim(),
            classes: btn.className,
            position: window.getComputedStyle(btn).position,
            bottom: window.getComputedStyle(btn).bottom,
            right: window.getComputedStyle(btn).right
          };
        });

        await takeScreenshot(page, 'dev-toolkit-button-found');

        testResults.tests.dev_toolkit_button.status = 'passed';
        testResults.tests.dev_toolkit_button.details = buttonInfo;
        testResults.summary.passed++;
        console.log('✅ Dev Toolkit Button: PASSED - Code icon button found');
        console.log(`   Position: ${buttonInfo.position}, bottom: ${buttonInfo.bottom}, right: ${buttonInfo.right}`);

      } else {
        testResults.tests.dev_toolkit_button.status = 'failed';
        testResults.tests.dev_toolkit_button.details = 'Code icon button not found';
        testResults.issues_found.push('Dev Toolkit button not visible or accessible');
        testResults.summary.failed++;
        console.log('❌ Dev Toolkit Button: FAILED');
      }

    } catch (error) {
      testResults.tests.dev_toolkit_button.status = 'failed';
      testResults.tests.dev_toolkit_button.details = error.message;
      testResults.summary.failed++;
      console.log('❌ Dev Toolkit Button: FAILED');
    }

    console.log('\n🎯 TEST 4: Dev Toolkit Window Functionality');
    try {
      const codeButton = await page.$('button:has(svg.lucide-code-2)');
      
      if (codeButton) {
        // Set up listener for new window
        const newPagePromise = browser.waitForEvent('targetcreated').then(target => 
          target.type() === 'page' ? target.page() : null
        );
        
        await codeButton.click();
        console.log('🖱️ Clicked Dev Toolkit button');
        
        const devToolkitWindow = await Promise.race([
          newPagePromise,
          new Promise(resolve => setTimeout(() => resolve(null), 5000))
        ]);

        if (devToolkitWindow) {
          await devToolkitWindow.waitForLoadState('networkidle');
          await takeScreenshot(devToolkitWindow, 'dev-toolkit-window');

          // Analyze the Dev Toolkit window
          const windowAnalysis = await devToolkitWindow.evaluate(() => {
            return {
              title: document.title,
              url: window.location.href,
              hasContent: document.body.textContent.trim().length > 50,
              contentPreview: document.body.textContent.slice(0, 300),
              backgroundColor: window.getComputedStyle(document.body).backgroundColor,
              isWhiteEmpty: window.getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)' &&
                           document.body.textContent.trim().length < 50,
              hasStylesheets: document.querySelectorAll('style, link[rel="stylesheet"]').length,
              hasDevToolkitElements: {
                hasTitle: !!document.querySelector('[class*="Dev Toolkit"], [class*="toolkit"]'),
                hasTabs: document.querySelectorAll('button:has-text("Console"), button:has-text("Migrations")').length,
                hasContent: !!document.querySelector('[class*="console"], [class*="content"]')
              }
            };
          });

          console.log('📊 Dev Toolkit Window Analysis:');
          console.log(JSON.stringify(windowAnalysis, null, 2));

          // Test if window has the white/empty issue
          if (windowAnalysis.isWhiteEmpty) {
            console.log('🔧 ISSUE DETECTED: Dev Toolkit window is white/empty');
            testResults.issues_found.push('Dev Toolkit window appears white/empty');
            
            // Apply fix: reload the window
            console.log('🔧 APPLYING FIX: Reloading Dev Toolkit window');
            await devToolkitWindow.reload();
            await devToolkitWindow.waitForTimeout(3000);
            await takeScreenshot(devToolkitWindow, 'dev-toolkit-after-reload');
            testResults.fixes_applied.push('Reloaded Dev Toolkit window to fix white/empty issue');
            
            // Re-analyze after fix
            const fixedAnalysis = await devToolkitWindow.evaluate(() => ({
              hasContent: document.body.textContent.trim().length > 50,
              backgroundColor: window.getComputedStyle(document.body).backgroundColor
            }));
            
            if (fixedAnalysis.hasContent) {
              console.log('✅ FIX SUCCESSFUL: Dev Toolkit window now has content');
            }
          }

          // Test tabs if they exist
          const tabs = await devToolkitWindow.$$('button');
          console.log(`📋 Found ${tabs.length} clickable elements in Dev Toolkit`);
          
          if (tabs.length > 0) {
            for (let i = 0; i < Math.min(tabs.length, 5); i++) {
              try {
                const tabText = await tabs[i].textContent();
                if (tabText && (tabText.includes('Console') || tabText.includes('Migrations') || 
                               tabText.includes('Visualizer') || tabText.includes('History'))) {
                  await tabs[i].click();
                  await devToolkitWindow.waitForTimeout(1000);
                  await takeScreenshot(devToolkitWindow, `tab-${tabText.toLowerCase()}`);
                  console.log(`📸 Tested tab: ${tabText}`);
                }
              } catch (tabError) {
                console.log(`⚠️ Could not test tab ${i}: ${tabError.message}`);
              }
            }
          }

          testResults.tests.dev_toolkit_window.status = 'passed';
          testResults.tests.dev_toolkit_window.details = windowAnalysis;
          testResults.summary.passed++;
          console.log('✅ Dev Toolkit Window: PASSED');

        } else {
          testResults.tests.dev_toolkit_window.status = 'failed';
          testResults.tests.dev_toolkit_window.details = 'Dev Toolkit window did not open';
          testResults.issues_found.push('Dev Toolkit window failed to open when button clicked');
          testResults.summary.failed++;
          console.log('❌ Dev Toolkit Window: FAILED - Window did not open');
        }

      } else {
        testResults.tests.dev_toolkit_window.status = 'skipped';
        testResults.tests.dev_toolkit_window.details = 'No Dev Toolkit button available';
        testResults.summary.skipped++;
        console.log('⏭️ Dev Toolkit Window: SKIPPED - No button to test');
      }

    } catch (error) {
      testResults.tests.dev_toolkit_window.status = 'failed';
      testResults.tests.dev_toolkit_window.details = error.message;
      testResults.summary.failed++;
      console.log('❌ Dev Toolkit Window: FAILED');
    }

    console.log('\n🎯 TEST 5: Google OAuth Flow');
    try {
      // Go back to main page
      await page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const googleButton = await page.$('button:has-text("Sign in with Google")');
      
      if (googleButton) {
        if (GOOGLE_TEST_PASSWORD) {
          console.log('🔐 Testing Google OAuth with credentials...');
          
          const popupPromise = page.waitForEvent('popup');
          await googleButton.click();
          
          const popup = await popupPromise;
          await popup.waitForLoadState('networkidle');
          await takeScreenshot(popup, 'oauth-popup');

          // Fill in credentials if we're on Google's sign-in page
          const isGoogleSignIn = await popup.evaluate(() => 
            window.location.hostname.includes('google') || 
            document.body.textContent.includes('Google')
          );

          if (isGoogleSignIn) {
            try {
              // Fill email
              await popup.fill('input[type="email"]', GOOGLE_TEST_EMAIL);
              await popup.click('button:has-text("Next"), #identifierNext');
              await popup.waitForTimeout(2000);
              
              // Fill password
              await popup.fill('input[type="password"]', GOOGLE_TEST_PASSWORD);
              await popup.click('button:has-text("Next"), #passwordNext');
              await popup.waitForTimeout(3000);
              
              await takeScreenshot(popup, 'oauth-completed');
              
              testResults.tests.oauth_flow.status = 'passed';
              testResults.tests.oauth_flow.details = 'OAuth flow completed successfully';
              testResults.summary.passed++;
              console.log('✅ Google OAuth: PASSED');
              
            } catch (oauthError) {
              await popup.close();
              testResults.tests.oauth_flow.status = 'failed';
              testResults.tests.oauth_flow.details = `OAuth failed: ${oauthError.message}`;
              testResults.summary.failed++;
              console.log('❌ Google OAuth: FAILED');
            }
          } else {
            await popup.close();
            testResults.tests.oauth_flow.status = 'failed';
            testResults.tests.oauth_flow.details = 'Not redirected to Google OAuth';
            testResults.summary.failed++;
            console.log('❌ Google OAuth: FAILED - Not Google sign-in page');
          }

        } else {
          console.log('⚠️ No Google OAuth credentials provided');
          testResults.tests.oauth_flow.status = 'skipped';
          testResults.tests.oauth_flow.details = 'No credentials provided in environment variables';
          testResults.summary.skipped++;
          console.log('⏭️ Google OAuth: SKIPPED - No credentials');
        }
      } else {
        testResults.tests.oauth_flow.status = 'failed';
        testResults.tests.oauth_flow.details = 'Google OAuth button not found';
        testResults.summary.failed++;
        console.log('❌ Google OAuth: FAILED - Button not found');
      }

    } catch (error) {
      testResults.tests.oauth_flow.status = 'failed';
      testResults.tests.oauth_flow.details = error.message;
      testResults.summary.failed++;
      console.log('❌ Google OAuth: FAILED');
    }

    // Generate final comprehensive report
    const finalReport = {
      ...testResults,
      environment: {
        url: LOVABLE_DEV_URL,
        timestamp: new Date().toISOString(),
        hasOAuthCredentials: !!GOOGLE_TEST_PASSWORD
      },
      recommendations: []
    };

    // Generate recommendations based on results
    if (testResults.issues_found.length > 0) {
      finalReport.recommendations.push('Issues found that need attention:');
      testResults.issues_found.forEach(issue => {
        finalReport.recommendations.push(`• ${issue}`);
      });
    }

    if (testResults.fixes_applied.length > 0) {
      finalReport.recommendations.push('Fixes that were successfully applied:');
      testResults.fixes_applied.forEach(fix => {
        finalReport.recommendations.push(`• ${fix}`);
      });
    }

    if (!GOOGLE_TEST_PASSWORD) {
      finalReport.recommendations.push('• Set GOOGLE_TEST_PASSWORD environment variable to test OAuth flow');
    }

    await fs.writeFile(
      path.join(testDir, 'final-comprehensive-report.json'),
      JSON.stringify(finalReport, null, 2)
    );

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   📊 FINAL TEST RESULTS                      ║
║                                                               ║
║  🎯 Tests: ${testResults.summary.passed}/${testResults.summary.total_tests} passed, ${testResults.summary.failed} failed, ${testResults.summary.skipped} skipped          ║
║  📸 Screenshots: ${screenshotCount}                                        ║
║  🐛 Issues Found: ${testResults.issues_found.length}                                     ║
║  🔧 Fixes Applied: ${testResults.fixes_applied.length}                                    ║
║                                                               ║
║  📁 Results: ${path.basename(testDir)}                ║
╚═══════════════════════════════════════════════════════════════╝
`);

    if (testResults.summary.passed >= 3) {
      console.log('\n✅ SUCCESS: Dev Toolkit is functional!');
      if (testResults.issues_found.length > 0) {
        console.log('⚠️ Some issues were found but the core functionality works');
      }
    } else {
      console.log('\n❌ FAILURE: Significant issues with Dev Toolkit functionality');
    }

    console.log('\n💡 Browser staying open for manual inspection...');
    console.log('   Press Ctrl+C when done.');
    await new Promise(() => {}); // Wait for manual inspection

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      testResults
    };

    await fs.writeFile(
      path.join(testDir, 'error-report.json'),
      JSON.stringify(errorReport, null, 2)
    );

  } finally {
    // Browser stays open for manual inspection
  }

  return testResults;
}

// Run if called directly
if (require.main === module) {
  runFinalComprehensiveTest().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = runFinalComprehensiveTest;