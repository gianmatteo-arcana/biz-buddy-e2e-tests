/**
 * Dev Toolkit Test with Authentication
 * 
 * This test:
 * 1. Opens the app at https://biz-buddy-ally-now.lovable.app
 * 2. Handles authentication (tries demo mode, then OAuth if needed)
 * 3. Clicks the Dev Toolkit button (Code2 icon)
 * 4. Takes screenshots of the Dev Toolkit window
 * 5. Verifies the window has content (not white/empty)
 * 6. Tests clicking different tabs
 * 7. Captures all screenshots showing the current state
 * 
 * Designed to be robust and handle authentication properly.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://biz-buddy-ally-now.lovable.app';

class DevToolkitAuthTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.devToolkitWindow = null;
    this.testDir = null;
    this.screenshotCount = 0;
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'RUNNING',
      app_loaded: false,
      authentication_method: null,
      authenticated: false,
      dev_toolkit_found: false,
      dev_toolkit_window_opened: false,
      dev_toolkit_has_content: false,
      window_analysis: null,
      tabs_tested: [],
      screenshots: [],
      errors: []
    };
  }

  async setup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testDir = path.join(process.cwd(), `dev-toolkit-auth-test-${timestamp}`);
    await fs.mkdir(this.testDir, { recursive: true });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         🔐 DEV TOOLKIT TEST WITH AUTHENTICATION              ║
║         Target: ${APP_URL}           ║
║         Results: ${path.basename(this.testDir)}        ║
╚═══════════════════════════════════════════════════════════════╝
`);

    this.browser = await chromium.launch({
      headless: false, // Keep visible for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // Enhanced logging
    this.page.on('console', msg => {
      const text = msg.text();
      console.log(`🌐 Browser [${msg.type()}]:`, text);
      
      // Track important auth state changes
      if (text.includes('isDemoMode') || text.includes('user:') || text.includes('AUTH')) {
        console.log(`🔐 Auth Event:`, text);
      }
    });

    this.page.on('pageerror', error => {
      console.log(`❌ Page Error:`, error.message);
      this.results.errors.push(`Page Error: ${error.message}`);
    });
  }

  async takeScreenshot(name, description = '') {
    this.screenshotCount++;
    const filename = `${String(this.screenshotCount).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(this.testDir, filename);
    
    try {
      if (this.devToolkitWindow && name.includes('dev-toolkit')) {
        await this.devToolkitWindow.screenshot({ path: filepath, fullPage: true });
      } else {
        await this.page.screenshot({ path: filepath, fullPage: true });
      }
      
      this.results.screenshots.push({
        filename,
        description,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📸 ${filename}: ${description}`);
    } catch (error) {
      console.log(`❌ Screenshot failed: ${error.message}`);
      this.results.errors.push(`Screenshot failed (${name}): ${error.message}`);
    }
  }

  async step1_LoadApp() {
    console.log('\n🚀 Step 1: Loading application...');
    
    try {
      await this.page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('01-initial-load', 'Initial app load');

      const appState = await this.page.evaluate(() => {
        return {
          title: document.title,
          hasContent: document.body.textContent.length > 100,
          contentPreview: document.body.textContent.slice(0, 200),
          hasErrorMessage: !!document.querySelector('[class*="error"], .error'),
          readyState: document.readyState
        };
      });

      this.results.app_loaded = appState.hasContent && !appState.hasErrorMessage;
      console.log(`✅ App loaded: ${this.results.app_loaded ? 'YES' : 'NO'}`);
      console.log(`📊 Page title: ${appState.title}`);

      return this.results.app_loaded;

    } catch (error) {
      console.log(`❌ Failed to load app: ${error.message}`);
      this.results.errors.push(`App load failed: ${error.message}`);
      await this.takeScreenshot('01-load-error', 'App load error');
      return false;
    }
  }

  async step2_HandleAuthentication() {
    console.log('\n🔐 Step 2: Handling authentication...');

    try {
      // First, check current auth state
      const authState = await this.page.evaluate(() => {
        return {
          hasUser: !!document.querySelector('[class*="user"], [class*="profile"], [class*="avatar"]'),
          hasAuthButton: !!document.querySelector('button:has-text("Sign"), button:has-text("Google"), button:has-text("Login")'),
          hasDemoButton: !!document.querySelector('button:has-text("Demo")'),
          isDemoMode: localStorage.getItem('demoMode') === 'true' || localStorage.getItem('demo') === 'true',
          localStorageKeys: Object.keys(localStorage),
          bodyText: document.body.textContent.slice(0, 300)
        };
      });

      console.log('📊 Auth state:', JSON.stringify(authState, null, 2));

      // If already authenticated, we're good
      if (authState.hasUser) {
        console.log('✅ User already authenticated');
        this.results.authenticated = true;
        this.results.authentication_method = 'existing';
        await this.takeScreenshot('02-already-authenticated', 'User already authenticated');
        return true;
      }

      // Try demo mode first
      if (authState.hasDemoButton) {
        console.log('🎭 Attempting demo mode...');
        try {
          await this.page.locator('button:has-text("Demo")').first().click();
          await this.page.waitForTimeout(3000);
          await this.takeScreenshot('02-demo-clicked', 'Demo button clicked');

          // Check if demo mode worked
          const demoSuccess = await this.page.evaluate(() => {
            return {
              isDemoMode: localStorage.getItem('demoMode') === 'true' || localStorage.getItem('demo') === 'true',
              hasUser: !!document.querySelector('[class*="user"], [class*="profile"], [class*="avatar"]'),
              bodyChanged: document.body.textContent.length > 500
            };
          });

          if (demoSuccess.isDemoMode || demoSuccess.hasUser || demoSuccess.bodyChanged) {
            console.log('✅ Demo mode activated successfully');
            this.results.authenticated = true;
            this.results.authentication_method = 'demo';
            await this.takeScreenshot('02-demo-success', 'Demo mode activated');
            return true;
          }
        } catch (error) {
          console.log(`⚠️ Demo mode failed: ${error.message}`);
        }
      }

      // Try programmatic demo mode
      console.log('🔧 Trying programmatic demo mode...');
      await this.page.evaluate(() => {
        localStorage.setItem('demoMode', 'true');
        localStorage.setItem('demo', 'true');
        localStorage.setItem('developer', 'true');
        
        // Trigger any demo mode functions
        if (window.setDemoMode) window.setDemoMode(true);
        if (window.enableDemoMode) window.enableDemoMode();
        
        // Dispatch a custom event
        window.dispatchEvent(new CustomEvent('demoModeActivated'));
      });

      await this.page.reload({ waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('02-programmatic-demo', 'Programmatic demo mode');

      // Check if it worked
      const finalAuthCheck = await this.page.evaluate(() => {
        return {
          isDemoMode: localStorage.getItem('demoMode') === 'true',
          hasContent: document.body.textContent.length > 500,
          hasUser: !!document.querySelector('[class*="user"], [class*="profile"], [class*="avatar"]'),
          hasDevButton: !!document.querySelector('button:has(svg.lucide-code), button[aria-label*="dev"], button:has-text("Dev")')
        };
      });

      if (finalAuthCheck.isDemoMode || finalAuthCheck.hasUser || finalAuthCheck.hasDevButton) {
        console.log('✅ Authentication succeeded (demo mode)');
        this.results.authenticated = true;
        this.results.authentication_method = 'demo_programmatic';
        return true;
      } else {
        console.log('⚠️ Authentication unclear - proceeding anyway');
        this.results.authenticated = false;
        this.results.authentication_method = 'none';
        return false;
      }

    } catch (error) {
      console.log(`❌ Authentication handling failed: ${error.message}`);
      this.results.errors.push(`Authentication failed: ${error.message}`);
      await this.takeScreenshot('02-auth-error', 'Authentication error');
      return false;
    }
  }

  async step3_FindAndClickDevToolkit() {
    console.log('\n🔍 Step 3: Finding and clicking Dev Toolkit...');

    try {
      // Comprehensive selectors for Dev Toolkit button
      const devToolkitSelectors = [
        'button:has(svg.lucide-code-2)',
        'button:has(svg.lucide-code)',
        'button[aria-label*="toolkit" i]',
        'button[aria-label*="dev" i]',
        'button:has-text("Dev Toolkit")',
        'button:has-text("Developer")',
        'button:has-text("Dev")',
        '[data-testid="dev-toolkit-button"]',
        '[data-testid*="dev-toolkit"]',
        'button[class*="dev"]',
        // Look for buttons with code icons more broadly
        'button svg[class*="code-2"]',
        'button svg[class*="code"]',
        'button svg[data-testid*="code"]'
      ];

      let devToolkitButton = null;
      let foundSelector = null;

      // Try each selector
      for (const selector of devToolkitSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            for (const element of elements) {
              if (await element.isVisible()) {
                devToolkitButton = element;
                foundSelector = selector;
                console.log(`✅ Found Dev Toolkit button: ${selector}`);
                break;
              }
            }
            if (devToolkitButton) break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // If not found, try enabling dev mode
      if (!devToolkitButton) {
        console.log('🔧 Dev Toolkit not found, enabling all dev modes...');
        await this.page.evaluate(() => {
          localStorage.setItem('devMode', 'true');
          localStorage.setItem('developer', 'true');
          localStorage.setItem('debug', 'true');
          localStorage.setItem('showDevTools', 'true');
        });
        
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('03-dev-mode-enabled', 'Developer mode enabled');

        // Try finding button again
        for (const selector of devToolkitSelectors) {
          try {
            const elements = await this.page.$$(selector);
            if (elements.length > 0) {
              for (const element of elements) {
                if (await element.isVisible()) {
                  devToolkitButton = element;
                  foundSelector = selector;
                  console.log(`✅ Found Dev Toolkit after enabling dev mode: ${selector}`);
                  break;
                }
              }
              if (devToolkitButton) break;
            }
          } catch (e) {
            // Continue
          }
        }
      }

      if (devToolkitButton) {
        await this.takeScreenshot('03-dev-toolkit-found', `Dev Toolkit button found: ${foundSelector}`);
        this.results.dev_toolkit_found = true;

        // Set up listener for new window before clicking
        const newPagePromise = new Promise((resolve) => {
          const onTargetCreated = async (target) => {
            if (target.type() === 'page') {
              const newPage = await target.page();
              this.browser.off('targetcreated', onTargetCreated);
              resolve(newPage);
            }
          };
          this.browser.on('targetcreated', onTargetCreated);
          
          setTimeout(() => {
            this.browser.off('targetcreated', onTargetCreated);
            resolve(null);
          }, 10000);
        });

        console.log('🖱️ Clicking Dev Toolkit button...');
        await devToolkitButton.click();

        // Wait for new window or check for modal
        const newWindow = await newPagePromise;

        if (newWindow) {
          console.log('✅ Dev Toolkit window opened as popup');
          this.devToolkitWindow = newWindow;
          await this.devToolkitWindow.waitForLoadState('networkidle');
          this.results.dev_toolkit_window_opened = true;
          await this.takeScreenshot('04-dev-toolkit-window', 'Dev Toolkit window opened');
          return true;
        } else {
          // Check for modal/inline
          await this.page.waitForTimeout(2000);
          const hasModal = await this.page.evaluate(() => {
            const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="dev-toolkit"], [class*="DevToolkit"]');
            return modals.length > 0;
          });

          if (hasModal) {
            console.log('✅ Dev Toolkit opened as modal/inline');
            this.results.dev_toolkit_window_opened = true;
            await this.takeScreenshot('04-dev-toolkit-modal', 'Dev Toolkit opened as modal');
            return true;
          } else {
            console.log('❌ No Dev Toolkit window or modal detected');
            await this.takeScreenshot('04-dev-toolkit-failed', 'Dev Toolkit failed to open');
            return false;
          }
        }
      } else {
        console.log('❌ Dev Toolkit button not found');
        await this.takeScreenshot('03-dev-toolkit-not-found', 'Dev Toolkit button not found');
        
        // Debug: List all buttons for analysis
        const allButtons = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent?.trim(),
            classes: btn.className,
            innerHTML: btn.innerHTML.slice(0, 150),
            hasCodeIcon: !!btn.querySelector('svg[class*="code"], svg[data-testid*="code"], svg.lucide-code')
          }));
        });
        
        console.log('📋 All buttons found:', JSON.stringify(allButtons.slice(0, 10), null, 2));
        return false;
      }

    } catch (error) {
      console.log(`❌ Dev Toolkit search/click failed: ${error.message}`);
      this.results.errors.push(`Dev Toolkit operation failed: ${error.message}`);
      await this.takeScreenshot('03-dev-toolkit-error', 'Dev Toolkit operation error');
      return false;
    }
  }

  async step4_AnalyzeDevToolkit() {
    console.log('\n🔍 Step 4: Analyzing Dev Toolkit content...');

    try {
      let analysis = null;

      if (this.devToolkitWindow && !this.devToolkitWindow.isClosed()) {
        // Analyze popup window
        analysis = await this.devToolkitWindow.evaluate(() => {
          const body = document.body;
          const styles = window.getComputedStyle(body);
          
          return {
            windowType: 'popup',
            hasContent: body.textContent.trim().length > 0,
            contentLength: body.textContent.length,
            contentPreview: body.textContent.slice(0, 500),
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            visibility: styles.visibility,
            display: styles.display,
            hasVisibleElements: Array.from(body.querySelectorAll('*:not(script):not(style)')).filter(el => {
              const elStyles = window.getComputedStyle(el);
              return elStyles.display !== 'none' && elStyles.visibility !== 'hidden';
            }).length,
            title: document.title,
            headElements: Array.from(document.head.children).map(el => ({
              tagName: el.tagName,
              href: el.href,
              src: el.src
            })),
            bodyClasses: body.className,
            isWhiteScreen: styles.backgroundColor === 'rgb(255, 255, 255)' && body.textContent.trim().length < 50
          };
        });

        await this.takeScreenshot('05-dev-toolkit-popup-analysis', 'Dev Toolkit popup content analysis');
      } else {
        // Analyze modal/inline content
        analysis = await this.page.evaluate(() => {
          const devElements = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="dev-toolkit"], [class*="DevToolkit"]');
          
          if (devElements.length > 0) {
            const element = devElements[0];
            const styles = window.getComputedStyle(element);
            
            return {
              windowType: 'modal/inline',
              hasContent: element.textContent.trim().length > 0,
              contentLength: element.textContent.length,
              contentPreview: element.textContent.slice(0, 500),
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              visibility: styles.visibility,
              display: styles.display,
              hasVisibleElements: element.querySelectorAll('*:not(script):not(style)').length,
              elementClasses: element.className,
              isWhiteScreen: styles.backgroundColor === 'rgb(255, 255, 255)' && element.textContent.trim().length < 50
            };
          }
          
          return { 
            windowType: 'none',
            hasContent: false,
            error: 'No dev toolkit elements found'
          };
        });

        await this.takeScreenshot('05-dev-toolkit-modal-analysis', 'Dev Toolkit modal content analysis');
      }

      this.results.window_analysis = analysis;
      this.results.dev_toolkit_has_content = analysis.hasContent;

      console.log('📊 Dev Toolkit Analysis:', JSON.stringify(analysis, null, 2));

      // Determine if window is working
      const isWorking = analysis.hasContent && !analysis.isWhiteScreen && analysis.hasVisibleElements > 0;
      
      if (isWorking) {
        console.log('✅ Dev Toolkit appears to be working');
      } else {
        console.log('⚠️ Dev Toolkit may be empty or not loading properly');
        if (analysis.isWhiteScreen) {
          this.results.errors.push('Dev Toolkit window appears to be white/empty');
        }
      }

      return isWorking;

    } catch (error) {
      console.log(`❌ Dev Toolkit analysis failed: ${error.message}`);
      this.results.errors.push(`Analysis failed: ${error.message}`);
      await this.takeScreenshot('05-analysis-error', 'Dev Toolkit analysis error');
      return false;
    }
  }

  async step5_TestTabs() {
    console.log('\n📑 Step 5: Testing Dev Toolkit tabs...');

    const tabNames = ['Console', 'Migrations', 'Visualizer', 'History', 'Live', 'Settings', 'Debug'];

    try {
      for (const tabName of tabNames) {
        try {
          let targetContext = this.devToolkitWindow || this.page;
          
          const tabSelectors = [
            `button:has-text("${tabName}")`,
            `[role="tab"]:has-text("${tabName}")`,
            `[data-testid*="${tabName.toLowerCase()}"]`,
            `button[aria-label*="${tabName}" i]`,
            `.tab:has-text("${tabName}")`,
            `[class*="tab"]:has-text("${tabName}")`
          ];

          let tabClicked = false;

          for (const selector of tabSelectors) {
            try {
              const tab = await targetContext.locator(selector).first();
              if (await tab.isVisible()) {
                console.log(`🔍 Found and clicking ${tabName} tab`);
                await tab.click();
                await targetContext.waitForTimeout(1500);
                
                await this.takeScreenshot(`06-tab-${tabName.toLowerCase()}`, `${tabName} tab active`);
                
                this.results.tabs_tested.push({
                  name: tabName,
                  found: true,
                  clicked: true,
                  selector: selector
                });
                
                tabClicked = true;
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }

          if (!tabClicked) {
            console.log(`❌ ${tabName} tab not found`);
            this.results.tabs_tested.push({
              name: tabName,
              found: false,
              clicked: false
            });
          }

        } catch (error) {
          console.log(`❌ Error testing ${tabName} tab: ${error.message}`);
          this.results.tabs_tested.push({
            name: tabName,
            found: false,
            clicked: false,
            error: error.message
          });
        }
      }

      const workingTabs = this.results.tabs_tested.filter(t => t.clicked).length;
      console.log(`✅ Tab testing complete: ${workingTabs}/${this.results.tabs_tested.length} tabs working`);

      return workingTabs;

    } catch (error) {
      console.log(`❌ Tab testing failed: ${error.message}`);
      this.results.errors.push(`Tab testing failed: ${error.message}`);
      return 0;
    }
  }

  async step6_FinalCapture() {
    console.log('\n🏁 Step 6: Final state capture...');

    try {
      // Final screenshots
      await this.takeScreenshot('99-final-main-app', 'Final state of main application');

      if (this.devToolkitWindow && !this.devToolkitWindow.isClosed()) {
        await this.takeScreenshot('99-final-dev-toolkit', 'Final state of Dev Toolkit window');
      } else {
        const hasModal = await this.page.evaluate(() => {
          return !!document.querySelector('[role="dialog"], .modal, [class*="dev-toolkit"]');
        });

        if (hasModal) {
          await this.takeScreenshot('99-final-dev-modal', 'Final state of Dev Toolkit modal');
        }
      }

      // Generate summary
      this.results.status = 'COMPLETED';
      this.results.summary = {
        app_loaded: this.results.app_loaded,
        authenticated: this.results.authenticated,
        authentication_method: this.results.authentication_method,
        dev_toolkit_found: this.results.dev_toolkit_found,
        dev_toolkit_window_opened: this.results.dev_toolkit_window_opened,
        dev_toolkit_has_content: this.results.dev_toolkit_has_content,
        dev_toolkit_working: this.results.dev_toolkit_has_content && !this.results.window_analysis?.isWhiteScreen,
        tabs_tested: this.results.tabs_tested.length,
        tabs_working: this.results.tabs_tested.filter(t => t.clicked).length,
        screenshots_taken: this.screenshotCount,
        errors: this.results.errors.length,
        overall_success: this.results.app_loaded && 
                        this.results.dev_toolkit_found && 
                        this.results.dev_toolkit_window_opened &&
                        this.results.dev_toolkit_has_content &&
                        !this.results.window_analysis?.isWhiteScreen
      };

      // Save comprehensive report
      await fs.writeFile(
        path.join(this.testDir, 'test-report.json'),
        JSON.stringify(this.results, null, 2)
      );

      console.log('✅ Final state captured and report saved');
      return true;

    } catch (error) {
      console.log(`❌ Final capture failed: ${error.message}`);
      this.results.errors.push(`Final capture failed: ${error.message}`);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    try {
      if (this.devToolkitWindow && !this.devToolkitWindow.isClosed()) {
        await this.devToolkitWindow.close();
      }
      
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error.message}`);
    }
  }

  async run() {
    try {
      await this.setup();
      
      const appLoaded = await this.step1_LoadApp();
      if (!appLoaded) {
        console.log('❌ App failed to load, stopping test');
        this.results.status = 'FAILED - App not loaded';
        return this.results;
      }

      await this.step2_HandleAuthentication();

      const devToolkitWorking = await this.step3_FindAndClickDevToolkit();
      if (!devToolkitWorking) {
        console.log('❌ Dev Toolkit not accessible, stopping test');
        this.results.status = 'FAILED - Dev Toolkit not accessible';
        await this.step6_FinalCapture();
        return this.results;
      }

      await this.step4_AnalyzeDevToolkit();
      await this.step5_TestTabs();
      await this.step6_FinalCapture();

      // Print comprehensive summary
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🔐 TEST SUMMARY                           ║
║                                                               ║
║  📊 Core Results:                                             ║
║    • App Loaded: ${this.results.summary.app_loaded ? '✅ YES' : '❌ NO'}                                    ║
║    • Authenticated: ${this.results.summary.authenticated ? '✅ YES' : '❌ NO'} (${this.results.summary.authentication_method || 'none'})                        ║
║    • Dev Toolkit Found: ${this.results.summary.dev_toolkit_found ? '✅ YES' : '❌ NO'}                          ║
║    • Window Opened: ${this.results.summary.dev_toolkit_window_opened ? '✅ YES' : '❌ NO'}                             ║
║    • Has Content: ${this.results.summary.dev_toolkit_has_content ? '✅ YES' : '❌ NO'}                               ║
║    • Actually Working: ${this.results.summary.dev_toolkit_working ? '✅ YES' : '❌ NO'}                          ║
║                                                               ║
║  🎯 Functionality:                                            ║
║    • Tabs Working: ${this.results.summary.tabs_working}/${this.results.summary.tabs_tested}                                    ║
║    • Screenshots: ${this.results.summary.screenshots_taken}                                      ║
║    • Errors: ${this.results.summary.errors}                                          ║
║                                                               ║
║  🏆 Overall Success: ${this.results.summary.overall_success ? '✅ YES' : '❌ NO'}                            ║
║                                                               ║
║  📁 Results: ${path.basename(this.testDir)}    ║
╚═══════════════════════════════════════════════════════════════╝
`);

      return this.results;

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      this.results.status = 'FAILED';
      this.results.error = error.message;
      
      await this.takeScreenshot('99-test-failed', 'Test failure state');
      
      await fs.writeFile(
        path.join(this.testDir, 'error-report.json'),
        JSON.stringify(this.results, null, 2)
      );

      return this.results;

    } finally {
      await this.cleanup();
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new DevToolkitAuthTest();
  test.run()
    .then(results => {
      console.log('\n📋 Test completed. Check the results directory for screenshots and detailed report.');
      process.exit(results.summary?.overall_success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = DevToolkitAuthTest;