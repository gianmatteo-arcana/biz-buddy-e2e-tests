/**
 * Debug Dev Toolkit Step-by-Step
 * 
 * This test specifically focuses on:
 * 1. Understanding what's on the page
 * 2. Finding authentication options
 * 3. Locating the Dev Toolkit
 * 4. Testing OAuth and Demo mode
 * 5. Capturing comprehensive screenshots for analysis
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const LOVABLE_DEV_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';

async function debugDevToolkitStepByStep() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(process.cwd(), `debug-dev-toolkit-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║               🔍 DEBUG DEV TOOLKIT STEP-BY-STEP              ║
║               Results: ${path.basename(testDir)}              ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 1000 // Slow motion for better debugging
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  let screenshotCount = 0;
  const takeScreenshot = async (name, fullPage = true) => {
    screenshotCount++;
    const filename = `${String(screenshotCount).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(testDir, filename);
    await page.screenshot({ path: filepath, fullPage });
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
  };

  try {
    console.log('\n🚀 Step 1: Loading the application...');
    await page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await takeScreenshot('initial-load');

    console.log('\n🔍 Step 2: Analyzing page structure...');
    const pageAnalysis = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim(),
        classes: btn.className,
        id: btn.id,
        ariaLabel: btn.getAttribute('aria-label'),
        hasCodeIcon: btn.querySelector('svg.lucide-code-2') ? true : false,
        hasDevText: btn.textContent?.toLowerCase().includes('dev') || false
      }));

      const allLinks = Array.from(document.querySelectorAll('a')).map(link => ({
        text: link.textContent?.trim(),
        href: link.href,
        hasAuth: link.href?.includes('auth') || link.textContent?.toLowerCase().includes('sign') || false
      }));

      return {
        title: document.title,
        url: window.location.href,
        hasUser: !!document.querySelector('[class*="user"], [class*="profile"], [class*="avatar"]'),
        hasAuthButton: Array.from(document.querySelectorAll('button')).some(btn => 
          btn.textContent?.toLowerCase().includes('sign') || 
          btn.textContent?.toLowerCase().includes('google') || 
          btn.textContent?.toLowerCase().includes('login')
        ),
        hasDemoButton: Array.from(document.querySelectorAll('button')).some(btn => 
          btn.textContent?.toLowerCase().includes('demo')
        ),
        buttons: allButtons.filter(btn => btn.text && btn.text.length > 0),
        authLinks: allLinks.filter(link => link.hasAuth),
        bodyClasses: document.body.className,
        mainContent: document.body.textContent.slice(0, 500),
        authState: {
          localStorage_auth: Object.keys(localStorage).filter(k => k.includes('auth')),
          sessionStorage_auth: Object.keys(sessionStorage).filter(k => k.includes('auth')),
          cookies: document.cookie.split(';').filter(c => c.includes('auth')).length
        }
      };
    });

    console.log('📊 Page Analysis:');
    console.log(JSON.stringify(pageAnalysis, null, 2));

    await takeScreenshot('page-analysis');

    console.log('\n👤 Step 3: Attempting authentication...');
    
    // Try Demo Mode first
    if (pageAnalysis.hasDemoButton) {
      console.log('🎭 Found Demo Mode button, clicking...');
      const demoButton = await page.locator('button').filter({ hasText: /demo/i }).first();
      await demoButton.click();
      await page.waitForTimeout(3000);
      await takeScreenshot('demo-mode-activated');
    } else {
      console.log('❌ No Demo Mode button found');
    }

    // Try OAuth if available
    if (pageAnalysis.hasAuthButton) {
      console.log('🔐 Found auth button, attempting OAuth...');
      
      // Listen for popup or navigation
      const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
      
      try {
        const authButton = await page.locator('button').filter({ hasText: /sign|google|login/i }).first();
        await authButton.click();
        const popup = await popupPromise;
        
        if (popup) {
          console.log('🆕 OAuth popup opened');
          await takeScreenshot('oauth-popup-opened');
          
          // For E2E testing, we'll close the popup
          await popup.close();
          console.log('🚫 Closed OAuth popup (E2E testing limitation)');
        } else {
          console.log('❌ No OAuth popup appeared');
        }
        
        await page.waitForTimeout(2000);
        await takeScreenshot('after-oauth-attempt');
        
      } catch (error) {
        console.log('❌ OAuth attempt failed:', error.message);
      }
    }

    // Try enabling dev mode via localStorage
    console.log('\n🛠️ Step 4: Enabling dev mode...');
    await page.evaluate(() => {
      localStorage.setItem('devMode', 'true');
      localStorage.setItem('developer', 'true');
      localStorage.setItem('debug', 'true');
      console.log('🔧 Dev mode flags set in localStorage');
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await takeScreenshot('after-dev-mode-reload');

    console.log('\n🔍 Step 5: Searching for Dev Toolkit with exhaustive selectors...');
    const devToolkitSearch = await page.evaluate(() => {
      const selectors = [
        'button[aria-label*="toolkit" i]',
        'button[aria-label*="dev" i]',
        'button:has(svg.lucide-code-2)',
        'button:has(svg.lucide-code)',
        'button:has-text("Dev Toolkit")',
        'button:has-text("Developer")',
        'button:has-text("Dev")',
        '[data-testid="dev-toolkit-button"]',
        '[data-testid*="dev"]',
        'button[class*="dev"]',
        'button[id*="dev"]',
        '.dev-toolkit-button',
        '#dev-toolkit-button'
      ];

      const results = selectors.map(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          return {
            selector,
            found: elements.length > 0,
            count: elements.length,
            elements: Array.from(elements).map(el => ({
              tagName: el.tagName,
              text: el.textContent?.trim(),
              classes: el.className,
              id: el.id,
              ariaLabel: el.getAttribute('aria-label')
            }))
          };
        } catch (error) {
          return { selector, error: error.message };
        }
      });

      // Also search for any buttons with code-related icons
      const allButtonsWithIcons = Array.from(document.querySelectorAll('button svg')).map(svg => ({
        buttonText: svg.closest('button')?.textContent?.trim(),
        buttonClasses: svg.closest('button')?.className,
        svgClasses: svg.className,
        svgDataName: svg.getAttribute('data-name') || svg.getAttribute('data-icon'),
        parentButton: {
          outerHTML: svg.closest('button')?.outerHTML.slice(0, 200)
        }
      }));

      return {
        selectorResults: results,
        allButtonsWithIcons,
        totalButtons: document.querySelectorAll('button').length,
        hasAnyCodeIcon: !!document.querySelector('svg[class*="code"], svg[data-name*="code"]')
      };
    });

    console.log('📋 Dev Toolkit Search Results:');
    console.log(JSON.stringify(devToolkitSearch, null, 2));

    await takeScreenshot('dev-toolkit-search');

    // Try navigating to /dev route
    console.log('\n🚀 Step 6: Trying /dev route...');
    await page.goto(`${LOVABLE_DEV_URL}/dev`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await takeScreenshot('dev-route');

    const devRouteAnalysis = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasContent: document.body.textContent.trim().length > 100,
        contentPreview: document.body.textContent.slice(0, 300),
        hasDevToolkit: !!document.querySelector('[class*="dev"], [class*="toolkit"]'),
        has404: document.body.textContent.toLowerCase().includes('not found') || 
                document.body.textContent.toLowerCase().includes('404')
      };
    });

    console.log('📊 /dev Route Analysis:');
    console.log(JSON.stringify(devRouteAnalysis, null, 2));

    // Go back to main page and try one more comprehensive search
    console.log('\n🔄 Step 7: Final comprehensive search...');
    await page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Try to find any development-related functionality
    const finalSearch = await page.evaluate(() => {
      // Look for any development panels or debug info
      const devElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const className = el.className?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        
        return text.includes('dev') || text.includes('debug') || text.includes('toolkit') ||
               className.includes('dev') || className.includes('debug') || className.includes('toolkit') ||
               id.includes('dev') || id.includes('debug') || id.includes('toolkit');
      }).map(el => ({
        tagName: el.tagName,
        text: el.textContent?.slice(0, 100),
        className: el.className,
        id: el.id
      }));

      // Check for console commands or hidden dev features
      const hasConsoleDevTools = typeof window.__DEV__ !== 'undefined' || 
                                typeof window.devtools !== 'undefined' ||
                                typeof window.debug !== 'undefined';

      return {
        devElements,
        hasConsoleDevTools,
        windowKeys: Object.keys(window).filter(key => 
          key.toLowerCase().includes('dev') || 
          key.toLowerCase().includes('debug') ||
          key.toLowerCase().includes('toolkit')
        )
      };
    });

    console.log('📊 Final Dev Search:');
    console.log(JSON.stringify(finalSearch, null, 2));

    await takeScreenshot('final-search');

    console.log('\n🧪 Step 8: Testing OAuth flow one more time...');
    
    // Try to trigger OAuth programmatically
    const oauthResult = await page.evaluate(() => {
      try {
        // Check if Supabase is available
        if (typeof window.supabase !== 'undefined') {
          console.log('🔧 Supabase found, attempting OAuth...');
          // Don't actually trigger OAuth in automated test, just check availability
          return {
            supabaseAvailable: true,
            authMethods: typeof window.supabase.auth,
            hasOAuth: typeof window.supabase.auth?.signInWithOAuth === 'function'
          };
        }
        
        // Look for other auth libraries
        const authLibraries = {
          hasAuth0: typeof window.auth0 !== 'undefined',
          hasFirebase: typeof window.firebase !== 'undefined',
          hasGoogleAuth: typeof window.google !== 'undefined'
        };
        
        return { supabaseAvailable: false, authLibraries };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('📊 OAuth Analysis:');
    console.log(JSON.stringify(oauthResult, null, 2));

    await takeScreenshot('oauth-analysis');

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      testDirectory: testDir,
      phases: {
        pageAnalysis,
        devToolkitSearch,
        devRouteAnalysis,
        finalSearch,
        oauthResult
      },
      screenshots: screenshotCount,
      summary: {
        appLoaded: pageAnalysis.hasUser || pageAnalysis.mainContent.length > 100,
        devToolkitFound: devToolkitSearch.selectorResults.some(r => r.found),
        authAvailable: pageAnalysis.hasAuthButton || pageAnalysis.hasDemoButton,
        devRouteAccessible: !devRouteAnalysis.has404,
        recommendations: []
      }
    };

    // Generate recommendations based on findings
    if (!report.summary.devToolkitFound) {
      report.summary.recommendations.push('Dev Toolkit button not found - may need authentication or specific user role');
    }
    
    if (!report.summary.authAvailable) {
      report.summary.recommendations.push('No auth buttons found - check authentication flow');
    }
    
    if (devRouteAnalysis.has404) {
      report.summary.recommendations.push('/dev route returns 404 - dev tools may be disabled');
    }

    await fs.writeFile(
      path.join(testDir, 'debug-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     📋 DEBUG COMPLETE                        ║
║                                                               ║
║  📊 Results:                                                  ║
║    • App loaded: ${report.summary.appLoaded ? 'YES' : 'NO'}                                    ║
║    • Dev Toolkit found: ${report.summary.devToolkitFound ? 'YES' : 'NO'}                          ║
║    • Auth available: ${report.summary.authAvailable ? 'YES' : 'NO'}                             ║
║    • /dev route works: ${report.summary.devRouteAccessible ? 'YES' : 'NO'}                        ║
║    • Screenshots taken: ${screenshotCount}                               ║
║                                                               ║
║  📁 Results saved to: ${path.basename(testDir)}                 ║
╚═══════════════════════════════════════════════════════════════╝
`);

    // Keep browser open for manual inspection
    console.log('\n💡 Browser staying open for manual inspection...');
    console.log('   Press Ctrl+C when done.');
    
    // Wait indefinitely for manual inspection
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    await takeScreenshot('debug-error');
    
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
    // Browser will stay open for manual inspection
    // User can close it manually
  }
}

// Run if called directly
if (require.main === module) {
  debugDevToolkitStepByStep().catch(error => {
    console.error('❌ Debug runner failed:', error);
    process.exit(1);
  });
}

module.exports = debugDevToolkitStepByStep;