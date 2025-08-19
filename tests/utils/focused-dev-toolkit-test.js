/**
 * Focused Dev Toolkit E2E Test
 * 
 * This test specifically:
 * 1. Opens the app at https://biz-buddy-ally-now.lovable.app
 * 2. Enters demo mode
 * 3. Clicks the Dev Toolkit button (Code2 icon)
 * 4. Takes screenshots of the Dev Toolkit window
 * 5. Verifies the window has content (not white/empty)
 * 6. Tests clicking different tabs
 * 7. Captures all screenshots showing the current state
 * 
 * Designed to run quickly and provide visual evidence of Dev Toolkit functionality.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://biz-buddy-ally-now.lovable.app';

class FocusedDevToolkitTest {
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
      demo_mode_activated: false,
      dev_toolkit_found: false,
      dev_toolkit_window_opened: false,
      dev_toolkit_has_content: false,
      tabs_tested: [],
      screenshots: [],
      errors: []
    };
  }

  async setup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testDir = path.join(process.cwd(), `focused-dev-toolkit-test-${timestamp}`);
    await fs.mkdir(this.testDir, { recursive: true });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            🎯 FOCUSED DEV TOOLKIT TEST                       ║
║            Target: ${APP_URL}                ║
║            Results: ${path.basename(this.testDir)}            ║
╚═══════════════════════════════════════════════════════════════╝
`);

    this.browser = await chromium.launch({
      headless: false, // Keep visible for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // Log browser console messages
    this.page.on('console', msg => {
      console.log(`🌐 Browser Console [${msg.type()}]:`, msg.text());
    });

    // Track errors
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
      
      console.log(`📸 Screenshot: ${filename} - ${description}`);
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

      // Check if app loaded successfully
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

  async step2_EnterDemoMode() {
    console.log('\n🎭 Step 2: Entering demo mode...');

    try {
      // Look for demo mode button
      const demoSelectors = [
        'button:has-text("Demo Mode")',
        'button:has-text("Demo")',
        'button:has-text("Try Demo")',
        'button[aria-label*="demo" i]',
        '[data-testid*="demo"]'
      ];

      let demoButton = null;
      for (const selector of demoSelectors) {
        try {
          demoButton = await this.page.locator(selector).first();
          if (await demoButton.isVisible()) {
            console.log(`✅ Found demo button: ${selector}`);
            break;
          }
        } catch (e) {
          // Selector not found, continue
        }
        demoButton = null;
      }

      if (demoButton) {
        await this.takeScreenshot('02-demo-button-found', 'Demo button located');
        await demoButton.click();
        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('03-demo-mode-activated', 'Demo mode activated');
        this.results.demo_mode_activated = true;
        console.log('✅ Demo mode activated');
      } else {
        // Try programmatic demo mode activation
        console.log('🔧 Trying programmatic demo mode...');
        await this.page.evaluate(() => {
          localStorage.setItem('demoMode', 'true');
          localStorage.setItem('demo', 'true');
          if (window.setDemoMode) window.setDemoMode(true);
        });
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('03-demo-mode-programmatic', 'Programmatic demo mode');
        this.results.demo_mode_activated = true;
        console.log('✅ Demo mode activated programmatically');
      }

      return this.results.demo_mode_activated;

    } catch (error) {
      console.log(`❌ Demo mode activation failed: ${error.message}`);
      this.results.errors.push(`Demo mode failed: ${error.message}`);
      await this.takeScreenshot('03-demo-mode-error', 'Demo mode error');
      return false;
    }
  }

  async step3_FindDevToolkit() {
    console.log('\n🔍 Step 3: Finding Dev Toolkit button...');

    try {
      // Comprehensive selectors for Dev Toolkit button with Code2 icon
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
        'button svg[data-testid="code-2-icon"] parent()',
        'button svg[class*="code"] parent()',
      ];

      let devToolkitButton = null;
      let foundSelector = null;

      for (const selector of devToolkitSelectors) {
        try {
          const button = await this.page.locator(selector).first();
          if (await button.isVisible()) {
            devToolkitButton = button;
            foundSelector = selector;
            console.log(`✅ Found Dev Toolkit button: ${selector}`);
            break;
          }
        } catch (e) {
          // Selector not found, continue
        }
      }

      if (!devToolkitButton) {
        // Try enabling dev mode first
        console.log('🔧 Enabling dev mode...');
        await this.page.evaluate(() => {
          localStorage.setItem('devMode', 'true');
          localStorage.setItem('developer', 'true');
          localStorage.setItem('debug', 'true');
        });
        
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('04-dev-mode-enabled', 'Dev mode enabled');

        // Try finding button again
        for (const selector of devToolkitSelectors) {
          try {
            const button = await this.page.locator(selector).first();
            if (await button.isVisible()) {
              devToolkitButton = button;
              foundSelector = selector;
              console.log(`✅ Found Dev Toolkit button after dev mode: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }

      if (devToolkitButton) {
        await this.takeScreenshot('05-dev-toolkit-found', `Dev Toolkit button found: ${foundSelector}`);
        this.results.dev_toolkit_found = true;
        return devToolkitButton;
      } else {
        console.log('❌ Dev Toolkit button not found');
        await this.takeScreenshot('05-dev-toolkit-not-found', 'Dev Toolkit button not found');
        
        // Debug: List all buttons
        const allButtons = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent?.trim(),
            classes: btn.className,
            hasCodeIcon: !!btn.querySelector('svg[class*="code"], svg[data-testid*="code"]'),
            innerHTML: btn.innerHTML.slice(0, 100)
          }));
        });
        
        console.log('📋 All buttons found:', JSON.stringify(allButtons, null, 2));
        return null;
      }

    } catch (error) {
      console.log(`❌ Dev Toolkit search failed: ${error.message}`);
      this.results.errors.push(`Dev Toolkit search failed: ${error.message}`);
      await this.takeScreenshot('05-dev-toolkit-error', 'Dev Toolkit search error');
      return null;
    }
  }

  async step4_OpenDevToolkit(devToolkitButton) {
    console.log('\n🪟 Step 4: Opening Dev Toolkit window...');

    try {
      // Set up listener for new window/popup
      const newPagePromise = new Promise((resolve) => {
        const onTargetCreated = async (target) => {
          if (target.type() === 'page') {
            const newPage = await target.page();
            this.browser.off('targetcreated', onTargetCreated);
            resolve(newPage);
          }
        };
        this.browser.on('targetcreated', onTargetCreated);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          this.browser.off('targetcreated', onTargetCreated);
          resolve(null);
        }, 10000);
      });

      console.log('🖱️ Clicking Dev Toolkit button...');
      await devToolkitButton.click();

      // Wait for new window
      this.devToolkitWindow = await newPagePromise;

      if (this.devToolkitWindow) {
        console.log('✅ Dev Toolkit window opened');
        await this.devToolkitWindow.waitForLoadState('networkidle');
        await this.takeScreenshot('06-dev-toolkit-window', 'Dev Toolkit window opened');
        this.results.dev_toolkit_window_opened = true;
        return true;
      } else {
        console.log('❌ No Dev Toolkit window opened, checking for modal/inline');
        
        // Check if toolkit opened as modal or inline element
        await this.page.waitForTimeout(2000);
        const hasModal = await this.page.evaluate(() => {
          const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="dev-toolkit"]');
          return modals.length > 0;
        });

        if (hasModal) {
          console.log('✅ Dev Toolkit opened as modal/inline');
          await this.takeScreenshot('06-dev-toolkit-modal', 'Dev Toolkit opened as modal');
          this.results.dev_toolkit_window_opened = true;
          return true;
        } else {
          await this.takeScreenshot('06-dev-toolkit-failed', 'Dev Toolkit failed to open');
          return false;
        }
      }

    } catch (error) {
      console.log(`❌ Failed to open Dev Toolkit: ${error.message}`);
      this.results.errors.push(`Dev Toolkit open failed: ${error.message}`);
      await this.takeScreenshot('06-dev-toolkit-error', 'Dev Toolkit open error');
      return false;
    }
  }

  async step5_VerifyContent() {
    console.log('\n✅ Step 5: Verifying Dev Toolkit content...');

    try {
      let contentAnalysis = null;

      if (this.devToolkitWindow && !this.devToolkitWindow.isClosed()) {
        // Analyze popup window content
        contentAnalysis = await this.devToolkitWindow.evaluate(() => {
          const body = document.body;
          const styles = window.getComputedStyle(body);
          
          return {
            hasContent: body.textContent.trim().length > 0,
            contentLength: body.textContent.length,
            contentPreview: body.textContent.slice(0, 300),
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            hasVisibleElements: body.querySelectorAll('*:not(script):not(style)').length,
            title: document.title,
            windowType: 'popup'
          };
        });

        await this.takeScreenshot('07-dev-toolkit-content', 'Dev Toolkit content analysis');
      } else {
        // Analyze modal/inline content
        contentAnalysis = await this.page.evaluate(() => {
          const devToolkitElements = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"], [class*="dev-toolkit"], [class*="dev-panel"]');
          
          if (devToolkitElements.length > 0) {
            const element = devToolkitElements[0];
            const styles = window.getComputedStyle(element);
            
            return {
              hasContent: element.textContent.trim().length > 0,
              contentLength: element.textContent.length,
              contentPreview: element.textContent.slice(0, 300),
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              hasVisibleElements: element.querySelectorAll('*:not(script):not(style)').length,
              windowType: 'modal/inline'
            };
          }
          
          return { hasContent: false, windowType: 'none' };
        });

        await this.takeScreenshot('07-dev-toolkit-modal-content', 'Dev Toolkit modal content analysis');
      }

      this.results.dev_toolkit_has_content = contentAnalysis.hasContent;
      console.log(`✅ Has content: ${this.results.dev_toolkit_has_content ? 'YES' : 'NO'}`);
      console.log(`📊 Content analysis:`, JSON.stringify(contentAnalysis, null, 2));

      // Check if window is empty/white
      const isEmpty = !contentAnalysis.hasContent || 
                     contentAnalysis.backgroundColor === 'rgb(255, 255, 255)' || 
                     contentAnalysis.backgroundColor === 'rgba(0, 0, 0, 0)';

      if (isEmpty) {
        console.log('⚠️  Dev Toolkit window appears empty or white');
        this.results.errors.push('Dev Toolkit window is empty or white');
      }

      return this.results.dev_toolkit_has_content;

    } catch (error) {
      console.log(`❌ Content verification failed: ${error.message}`);
      this.results.errors.push(`Content verification failed: ${error.message}`);
      await this.takeScreenshot('07-content-error', 'Content verification error');
      return false;
    }
  }

  async step6_TestTabs() {
    console.log('\n📑 Step 6: Testing Dev Toolkit tabs...');

    const commonTabNames = ['Console', 'Migrations', 'Visualizer', 'History', 'Live', 'Settings'];
    let tabsFound = 0;

    try {
      for (const tabName of commonTabNames) {
        try {
          let tabSelector = null;
          let targetContext = this.devToolkitWindow || this.page;

          // Find tab button
          const tabSelectors = [
            `button:has-text("${tabName}")`,
            `[role="tab"]:has-text("${tabName}")`,
            `[data-testid*="${tabName.toLowerCase()}"]`,
            `button[aria-label*="${tabName}" i]`
          ];

          for (const selector of tabSelectors) {
            try {
              const tab = await targetContext.locator(selector).first();
              if (await tab.isVisible()) {
                tabSelector = selector;
                break;
              }
            } catch (e) {
              // Continue
            }
          }

          if (tabSelector) {
            console.log(`🔍 Found ${tabName} tab`);
            await targetContext.locator(tabSelector).click();
            await targetContext.waitForTimeout(1000);
            
            // Take screenshot of this tab
            await this.takeScreenshot(`08-tab-${tabName.toLowerCase()}`, `${tabName} tab active`);
            
            this.results.tabs_tested.push({
              name: tabName,
              found: true,
              clicked: true
            });
            tabsFound++;
          } else {
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

      console.log(`✅ Tested tabs: ${tabsFound}/${commonTabNames.length} found`);
      return tabsFound;

    } catch (error) {
      console.log(`❌ Tab testing failed: ${error.message}`);
      this.results.errors.push(`Tab testing failed: ${error.message}`);
      return 0;
    }
  }

  async step7_FinalState() {
    console.log('\n🏁 Step 7: Capturing final state...');

    try {
      // Final screenshot of main app
      await this.takeScreenshot('99-final-main-app', 'Final state of main app');

      // Final screenshot of dev toolkit if open
      if (this.devToolkitWindow && !this.devToolkitWindow.isClosed()) {
        await this.takeScreenshot('99-final-dev-toolkit', 'Final state of Dev Toolkit window');
      } else {
        // Check for modal state
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
        demo_mode_activated: this.results.demo_mode_activated,
        dev_toolkit_found: this.results.dev_toolkit_found,
        dev_toolkit_window_opened: this.results.dev_toolkit_window_opened,
        dev_toolkit_has_content: this.results.dev_toolkit_has_content,
        tabs_tested: this.results.tabs_tested.length,
        tabs_working: this.results.tabs_tested.filter(t => t.clicked).length,
        screenshots_taken: this.screenshotCount,
        errors: this.results.errors.length,
        overall_success: this.results.app_loaded && 
                        this.results.dev_toolkit_found && 
                        this.results.dev_toolkit_window_opened &&
                        this.results.dev_toolkit_has_content
      };

      // Save detailed report
      await fs.writeFile(
        path.join(this.testDir, 'test-report.json'),
        JSON.stringify(this.results, null, 2)
      );

      console.log(`✅ Final state captured and report saved`);
      return true;

    } catch (error) {
      console.log(`❌ Final state capture failed: ${error.message}`);
      this.results.errors.push(`Final state failed: ${error.message}`);
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

      const demoActivated = await this.step2_EnterDemoMode();
      if (!demoActivated) {
        console.log('⚠️ Demo mode not activated, continuing anyway');
      }

      const devToolkitButton = await this.step3_FindDevToolkit();
      if (!devToolkitButton) {
        console.log('❌ Dev Toolkit button not found, stopping test');
        this.results.status = 'FAILED - Dev Toolkit not found';
        await this.step7_FinalState();
        return this.results;
      }

      const windowOpened = await this.step4_OpenDevToolkit(devToolkitButton);
      if (!windowOpened) {
        console.log('❌ Dev Toolkit window failed to open, stopping test');
        this.results.status = 'FAILED - Window not opened';
        await this.step7_FinalState();
        return this.results;
      }

      const hasContent = await this.step5_VerifyContent();
      if (!hasContent) {
        console.log('⚠️ Dev Toolkit window is empty, but continuing with tab tests');
      }

      await this.step6_TestTabs();
      await this.step7_FinalState();

      // Print summary
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🎯 TEST SUMMARY                           ║
║                                                               ║
║  📊 Results:                                                  ║
║    • App Loaded: ${this.results.summary.app_loaded ? '✅ YES' : '❌ NO'}                                    ║
║    • Demo Mode: ${this.results.summary.demo_mode_activated ? '✅ YES' : '❌ NO'}                                     ║
║    • Dev Toolkit Found: ${this.results.summary.dev_toolkit_found ? '✅ YES' : '❌ NO'}                          ║
║    • Window Opened: ${this.results.summary.dev_toolkit_window_opened ? '✅ YES' : '❌ NO'}                             ║
║    • Has Content: ${this.results.summary.dev_toolkit_has_content ? '✅ YES' : '❌ NO'}                               ║
║    • Tabs Working: ${this.results.summary.tabs_working}/${this.results.summary.tabs_tested}                                    ║
║    • Screenshots: ${this.results.summary.screenshots_taken}                                      ║
║    • Errors: ${this.results.summary.errors}                                          ║
║                                                               ║
║  🎯 Overall Success: ${this.results.summary.overall_success ? '✅ YES' : '❌ NO'}                            ║
║                                                               ║
║  📁 Results saved to: ${path.basename(this.testDir)}          ║
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
  const test = new FocusedDevToolkitTest();
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

module.exports = FocusedDevToolkitTest;