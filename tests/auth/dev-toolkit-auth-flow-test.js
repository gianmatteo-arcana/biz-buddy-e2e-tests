/**
 * Dev Toolkit Auth Flow Test
 * 
 * This test properly handles authentication flow and then looks for Dev Toolkit
 * Based on findings from debug test:
 * - Demo Mode (Dev Only) button is available
 * - Sign in with Google button is available
 * - Need to wait for proper UI state after auth
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const LOVABLE_DEV_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';

async function testDevToolkitWithAuth() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(process.cwd(), `dev-toolkit-auth-test-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🔧 DEV TOOLKIT AUTHENTICATION FLOW TEST            ║
║           Results: ${path.basename(testDir)}            ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  let screenshotCount = 0;
  const takeScreenshot = async (name, fullPage = true) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(testDir, filename);
    await page.screenshot({ path: filepath, fullPage });
    console.log(`📸 ${filename}`);
    return filename;
  };

  // Test results tracking
  const testResults = {
    timestamp: new Date().toISOString(),
    phases: {},
    screenshots: [],
    devToolkitFound: false,
    authMethod: null,
    devToolkitAnalysis: null
  };

  try {
    console.log('\n📍 Phase 1: Loading and initial analysis...');
    await page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await takeScreenshot('01-initial-load');

    console.log('\n📍 Phase 2: Authenticating with Demo Mode...');
    
    // Wait for Demo Mode button to be ready and click it
    console.log('🎭 Clicking Demo Mode button...');
    await page.waitForSelector('button:has-text("Demo Mode")', { timeout: 10000 });
    await page.click('button:has-text("Demo Mode (Dev Only)")');
    testResults.authMethod = 'demo_mode';
    
    // Wait for page to transition after demo mode activation
    console.log('⏳ Waiting for demo mode to activate...');
    await page.waitForTimeout(3000);
    
    // Wait for one of these indicators that we're in the app
    try {
      await page.waitForSelector([
        '[data-testid="dashboard"]',
        '.dashboard',
        'h1:has-text("Dashboard")',
        'h1:has-text("Welcome")',
        '.card',
        'button:has-text("New")',
        'button:has-text("Create")'
      ].join(', '), { timeout: 15000 });
      console.log('✅ App dashboard loaded after demo mode');
    } catch (error) {
      console.log('⚠️ Dashboard selectors not found, but continuing...');
    }

    await takeScreenshot('02-demo-mode-activated');

    console.log('\n📍 Phase 3: Searching for Dev Toolkit after authentication...');
    
    // Comprehensive search for Dev Toolkit elements
    const devToolkitSearch = await page.evaluate(() => {
      const searchResults = {
        buttons: [],
        devElements: [],
        codeIcons: [],
        devRoutes: [],
        consoleElements: []
      };

      // Search all buttons for dev-related content
      const allButtons = Array.from(document.querySelectorAll('button'));
      allButtons.forEach((btn, index) => {
        const text = btn.textContent?.trim().toLowerCase() || '';
        const classes = (btn.className && typeof btn.className === 'string') ? btn.className.toLowerCase() : '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        if (text.includes('dev') || text.includes('toolkit') || text.includes('debug') ||
            classes.includes('dev') || classes.includes('toolkit') || 
            ariaLabel.includes('dev') || ariaLabel.includes('toolkit')) {
          
          searchResults.buttons.push({
            index,
            text: btn.textContent?.trim(),
            classes: btn.className,
            ariaLabel: btn.getAttribute('aria-label'),
            id: btn.id,
            visible: btn.offsetParent !== null,
            hasCodeIcon: !!btn.querySelector('svg.lucide-code-2, svg[data-name*="code"]')
          });
        }
      });

      // Search for code-related icons
      const codeIcons = Array.from(document.querySelectorAll('svg.lucide-code-2, svg[class*="code"], svg[data-name*="code"]'));
      codeIcons.forEach(icon => {
        const button = icon.closest('button');
        if (button) {
          searchResults.codeIcons.push({
            buttonText: button.textContent?.trim(),
            buttonClasses: button.className,
            iconClasses: icon.className,
            visible: button.offsetParent !== null
          });
        }
      });

      // Look for any dev-related elements
      const devElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const classes = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
        const id = (el.id && typeof el.id === 'string') ? el.id.toLowerCase() : '';
        
        return (text.includes('dev toolkit') || text.includes('developer') ||
                classes.includes('dev-toolkit') || classes.includes('developer') ||
                id.includes('dev-toolkit') || id.includes('developer')) &&
               el.offsetParent !== null; // Only visible elements
      }).slice(0, 10); // Limit to first 10

      devElements.forEach(el => {
        searchResults.devElements.push({
          tagName: el.tagName,
          text: el.textContent?.slice(0, 100),
          classes: (el.className && typeof el.className === 'string') ? el.className : '',
          id: (el.id && typeof el.id === 'string') ? el.id : '',
          clickable: el.tagName === 'BUTTON' || el.onclick !== null
        });
      });

      return searchResults;
    });

    console.log('🔍 Dev Toolkit Search Results:');
    console.log(JSON.stringify(devToolkitSearch, null, 2));

    await takeScreenshot('03-dev-toolkit-search');

    // Try clicking any found dev toolkit buttons
    if (devToolkitSearch.buttons.length > 0) {
      console.log('🖱️ Found dev toolkit buttons, testing them...');
      
      for (let i = 0; i < devToolkitSearch.buttons.length; i++) {
        const btnInfo = devToolkitSearch.buttons[i];
        console.log(`🖱️ Testing button ${i + 1}: "${btnInfo.text}"`);
        
        try {
          // Set up listener for new window
          const newPagePromise = browser.waitForEvent('targetcreated').then(target => 
            target.type() === 'page' ? target.page() : null
          ).catch(() => null);
          
          // Click the button
          const buttons = await page.$$('button');
          if (buttons[btnInfo.index]) {
            await buttons[btnInfo.index].click();
            console.log(`✅ Clicked button: "${btnInfo.text}"`);
            
            // Wait for new window or content change
            const newWindow = await Promise.race([
              newPagePromise,
              new Promise(resolve => setTimeout(() => resolve(null), 3000))
            ]);

            if (newWindow) {
              console.log('🆕 New window opened!');
              await takeScreenshot('04-dev-toolkit-window-found');
              
              // Analyze the new window
              await newWindow.waitForLoadState('networkidle');
              const windowAnalysis = await newWindow.evaluate(() => {
                return {
                  title: document.title,
                  url: window.location.href,
                  hasContent: document.body.textContent.trim().length > 50,
                  contentPreview: document.body.textContent.slice(0, 200),
                  backgroundColor: window.getComputedStyle(document.body).backgroundColor,
                  hasDevToolkitContent: document.body.textContent.toLowerCase().includes('dev toolkit') ||
                                       document.body.textContent.toLowerCase().includes('console') ||
                                       document.body.textContent.toLowerCase().includes('developer')
                };
              });

              console.log('📊 Dev Toolkit Window Analysis:');
              console.log(JSON.stringify(windowAnalysis, null, 2));

              testResults.devToolkitFound = true;
              testResults.devToolkitAnalysis = windowAnalysis;

              // Take screenshot of the dev toolkit window
              await newWindow.screenshot({ 
                path: path.join(testDir, '05-dev-toolkit-content.png'),
                fullPage: true 
              });

              // Test tabs if they exist
              const tabs = await newWindow.$$('button:has-text("Console"), button:has-text("Migrations"), button:has-text("Visualizer"), button:has-text("History")');
              console.log(`📋 Found ${tabs.length} tabs in Dev Toolkit`);

              for (let tabIndex = 0; tabIndex < Math.min(tabs.length, 4); tabIndex++) {
                try {
                  await tabs[tabIndex].click();
                  await newWindow.waitForTimeout(1000);
                  await newWindow.screenshot({ 
                    path: path.join(testDir, `06-tab-${tabIndex + 1}.png`),
                    fullPage: true 
                  });
                  console.log(`📸 Tab ${tabIndex + 1} screenshot taken`);
                } catch (tabError) {
                  console.log(`⚠️ Could not test tab ${tabIndex + 1}: ${tabError.message}`);
                }
              }

              // Keep the dev toolkit window open and return to main page
              break;
            } else {
              console.log('❌ No new window opened');
              await takeScreenshot(`04-button-${i + 1}-no-window`);
            }

          }
        } catch (error) {
          console.log(`❌ Error clicking button ${i + 1}: ${error.message}`);
        }
      }
    }

    // Try code icon buttons if we haven't found dev toolkit yet
    if (!testResults.devToolkitFound && devToolkitSearch.codeIcons.length > 0) {
      console.log('🖱️ Testing code icon buttons...');
      
      for (const iconInfo of devToolkitSearch.codeIcons.slice(0, 3)) {
        try {
          const codeButton = await page.$(`button:has(svg.lucide-code-2)`);
          if (codeButton) {
            console.log(`🖱️ Clicking code icon button: "${iconInfo.buttonText}"`);
            
            const newPagePromise = browser.waitForEvent('targetcreated').then(target => 
              target.type() === 'page' ? target.page() : null
            ).catch(() => null);
            
            await codeButton.click();
            
            const newWindow = await Promise.race([
              newPagePromise,
              new Promise(resolve => setTimeout(() => resolve(null), 3000))
            ]);

            if (newWindow) {
              console.log('✅ Code icon opened Dev Toolkit window!');
              testResults.devToolkitFound = true;
              
              await newWindow.screenshot({ 
                path: path.join(testDir, '07-dev-toolkit-from-icon.png'),
                fullPage: true 
              });
              break;
            }
          }
        } catch (error) {
          console.log(`❌ Error with code icon: ${error.message}`);
        }
      }
    }

    console.log('\n📍 Phase 4: Testing /dev route...');
    
    try {
      await page.goto(`${LOVABLE_DEV_URL}/dev`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await takeScreenshot('08-dev-route');

      const devRouteCheck = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          hasContent: document.body.textContent.trim().length > 100,
          contentPreview: document.body.textContent.slice(0, 300),
          is404: document.body.textContent.toLowerCase().includes('not found') ||
                 document.body.textContent.toLowerCase().includes('404'),
          hasDevContent: document.body.textContent.toLowerCase().includes('dev') ||
                        document.body.textContent.toLowerCase().includes('developer') ||
                        document.body.textContent.toLowerCase().includes('toolkit')
        };
      });

      console.log('📊 /dev Route Analysis:');
      console.log(JSON.stringify(devRouteCheck, null, 2));

      if (devRouteCheck.hasDevContent && !devRouteCheck.is404) {
        console.log('✅ /dev route has dev content!');
        testResults.devToolkitFound = true;
        testResults.devToolkitAnalysis = devRouteCheck;
      }

    } catch (error) {
      console.log(`❌ Error testing /dev route: ${error.message}`);
    }

    console.log('\n📍 Phase 5: Testing Google OAuth as alternative...');
    
    // Go back to main page and try OAuth
    await page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    try {
      const googleButton = await page.$('button:has-text("Sign in with Google")');
      if (googleButton) {
        console.log('🔐 Found Google OAuth button, testing...');
        
        const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
        await googleButton.click();
        
        const popup = await popupPromise;
        if (popup) {
          console.log('🆕 OAuth popup opened');
          await takeScreenshot('09-oauth-popup');
          
          // For E2E testing, we'll just document that OAuth is available
          await popup.close();
          console.log('✅ OAuth flow is available (closed for E2E testing)');
        }
      }
    } catch (error) {
      console.log(`❌ OAuth test error: ${error.message}`);
    }

    // Generate final report
    const finalReport = {
      ...testResults,
      success: testResults.devToolkitFound,
      totalScreenshots: screenshotCount,
      searchResults: devToolkitSearch,
      summary: testResults.devToolkitFound 
        ? 'Dev Toolkit successfully found and tested'
        : 'Dev Toolkit not found - may require specific authentication or user permissions'
    };

    await fs.writeFile(
      path.join(testDir, 'test-report.json'),
      JSON.stringify(finalReport, null, 2)
    );

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   📊 TEST RESULTS                            ║
║                                                               ║
║  🎯 Dev Toolkit Found: ${testResults.devToolkitFound ? 'YES ✅' : 'NO ❌'}                          ║
║  🔐 Auth Method: ${testResults.authMethod || 'None'}                                   ║
║  📸 Screenshots: ${screenshotCount}                                        ║
║  📁 Results: ${path.basename(testDir)}                          ║
║                                                               ║
║  ${testResults.devToolkitFound ? '✅ SUCCESS: Dev Toolkit is working!' : '❌ ISSUE: Dev Toolkit not accessible'}               ║
╚═══════════════════════════════════════════════════════════════╝
`);

    // Keep browser open if dev toolkit was found for manual inspection
    if (testResults.devToolkitFound) {
      console.log('\n💡 Dev Toolkit found! Browser staying open for manual inspection...');
      console.log('   Press Ctrl+C when done.');
      await new Promise(() => {}); // Wait indefinitely
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    await takeScreenshot('error-state');
    
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      screenshots: screenshotCount
    };

    await fs.writeFile(
      path.join(testDir, 'error-report.json'),
      JSON.stringify(errorReport, null, 2)
    );

  } finally {
    if (!testResults.devToolkitFound) {
      await browser.close();
    }
  }

  return testResults;
}

// Run if called directly
if (require.main === module) {
  testDevToolkitWithAuth().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = testDevToolkitWithAuth;