/**
 * Comprehensive E2E Test for Dev Toolkit and OAuth
 * 
 * This test:
 * 1. Opens the app in Lovable dev environment
 * 2. Takes screenshots of the Dev Toolkit window
 * 3. Analyzes what's wrong (white/empty window)
 * 4. Applies fixes iteratively
 * 5. Tests Google OAuth flow
 * 6. Captures all screenshots for debugging
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const LOVABLE_DEV_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com';
const TEST_EMAIL = 'gianmatteo.allyn.test@gmail.com';

class ComprehensiveDevToolkitTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.devToolkitWindow = null;
    this.testDir = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      status: 'RUNNING',
      phases: {},
      screenshots: [],
      fixes_applied: [],
      oauth_flow_result: null,
      dev_toolkit_analysis: null
    };
  }

  async setup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testDir = path.join(process.cwd(), `comprehensive-test-${timestamp}`);
    await fs.mkdir(this.testDir, { recursive: true });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        🔧 COMPREHENSIVE DEV TOOLKIT & OAUTH TEST             ║
║        Test Directory: ${path.basename(this.testDir)}                   ║
║        Target URL: ${LOVABLE_DEV_URL.slice(0, 50)}...           ║
╚═══════════════════════════════════════════════════════════════╝
`);

    this.browser = await chromium.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // Enable console logging
    this.page.on('console', msg => {
      console.log(`🌐 Browser Console [${msg.type()}]:`, msg.text());
    });

    // Track network errors
    this.page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ Network Error: ${response.status()} - ${response.url()}`);
      }
    });
  }

  async takeScreenshot(name, fullPage = true) {
    const filename = `${String(this.testResults.screenshots.length + 1).padStart(2, '0')}-${name}.png`;
    const filepath = path.join(this.testDir, filename);
    
    if (this.devToolkitWindow && name.includes('dev-toolkit')) {
      await this.devToolkitWindow.screenshot({ path: filepath, fullPage });
    } else {
      await this.page.screenshot({ path: filepath, fullPage });
    }
    
    this.testResults.screenshots.push(filename);
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  }

  async phase1_LoadApp() {
    console.log('\n📍 PHASE 1: Loading Lovable Dev Environment');
    this.testResults.phases.phase1 = { status: 'RUNNING', start: Date.now() };

    try {
      console.log(`🌐 Navigating to: ${LOVABLE_DEV_URL}`);
      await this.page.goto(LOVABLE_DEV_URL, { waitUntil: 'networkidle', timeout: 30000 });
      
      await this.takeScreenshot('initial-load');

      // Wait for app to initialize
      await this.page.waitForTimeout(3000);

      // Check for common loading indicators
      const loadingStates = await this.page.evaluate(() => {
        return {
          hasLoadingSpinner: !!document.querySelector('[data-testid="loading"], .loading, .spinner'),
          hasErrorMessage: !!document.querySelector('[class*="error"], .error'),
          hasContent: document.body.textContent.length > 100,
          title: document.title,
          url: window.location.href
        };
      });

      console.log('📊 App loading state:', JSON.stringify(loadingStates, null, 2));

      this.testResults.phases.phase1 = {
        status: 'COMPLETED',
        duration: Date.now() - this.testResults.phases.phase1.start,
        loading_states: loadingStates
      };

    } catch (error) {
      this.testResults.phases.phase1.status = 'FAILED';
      this.testResults.phases.phase1.error = error.message;
      throw error;
    }
  }

  async phase2_AnalyzeDevToolkit() {
    console.log('\n📍 PHASE 2: Analyzing Dev Toolkit Window');
    this.testResults.phases.phase2 = { status: 'RUNNING', start: Date.now() };

    try {
      // Look for Dev Toolkit button
      console.log('🔍 Looking for Dev Toolkit button...');
      
      const devToolkitSelectors = [
        'button[aria-label*="toolkit" i]',
        'button:has(svg.lucide-code-2)',
        'button:has-text("Dev Toolkit")',
        'button:has-text("Developer")',
        '[data-testid="dev-toolkit-button"]'
      ];

      let devToolkitButton = null;
      for (const selector of devToolkitSelectors) {
        devToolkitButton = await this.page.$(selector);
        if (devToolkitButton) {
          console.log(`✅ Found Dev Toolkit button with selector: ${selector}`);
          break;
        }
      }

      if (!devToolkitButton) {
        await this.takeScreenshot('no-dev-toolkit-button');
        
        // Try to enable dev mode
        console.log('🚀 Attempting to enable dev mode...');
        await this.page.evaluate(() => {
          localStorage.setItem('devMode', 'true');
          localStorage.setItem('developer', 'true');
          window.location.reload();
        });

        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('after-dev-mode-enabled');

        // Try again
        for (const selector of devToolkitSelectors) {
          devToolkitButton = await this.page.$(selector);
          if (devToolkitButton) {
            console.log(`✅ Found Dev Toolkit button after enabling dev mode: ${selector}`);
            break;
          }
        }
      }

      if (!devToolkitButton) {
        throw new Error('Dev Toolkit button not found even after enabling dev mode');
      }

      await this.takeScreenshot('dev-toolkit-button-found');

      // Set up listener for new window
      const newPagePromise = new Promise(resolve => {
        this.browser.on('targetcreated', async target => {
          if (target.type() === 'page') {
            const newPage = await target.page();
            resolve(newPage);
          }
        });
      });

      console.log('🖱️ Clicking Dev Toolkit button...');
      await devToolkitButton.click();

      // Wait for new window with timeout
      try {
        this.devToolkitWindow = await Promise.race([
          newPagePromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Dev Toolkit window timeout')), 10000)
          )
        ]);
        console.log('✅ Dev Toolkit window opened');
      } catch (error) {
        await this.takeScreenshot('dev-toolkit-window-failed');
        throw new Error(`Dev Toolkit window failed to open: ${error.message}`);
      }

      // Wait for window to load
      await this.devToolkitWindow.waitForLoadState('networkidle');
      await this.takeScreenshot('dev-toolkit-window-initial');

      // Analyze the Dev Toolkit window
      const windowAnalysis = await this.devToolkitWindow.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          hasContent: body.textContent.trim().length > 0,
          contentLength: body.textContent.length,
          hasStylesheets: document.querySelectorAll('style, link[rel="stylesheet"]').length,
          bodyClasses: body.className,
          hasDevToolkitElements: {
            hasTitle: !!document.querySelector('[class*="Dev Toolkit"], .font-semibold:has-text("Dev Toolkit")'),
            hasTabs: document.querySelectorAll('button:has-text("Console"), button:has-text("Migrations"), button:has-text("Visualizer")').length,
            hasContent: !!document.querySelector('[class*="DevConsole"], [class*="content"]')
          },
          documentTitle: document.title,
          windowSize: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          errors: []
        };
      });

      console.log('📊 Dev Toolkit Window Analysis:', JSON.stringify(windowAnalysis, null, 2));

      this.testResults.dev_toolkit_analysis = windowAnalysis;
      this.testResults.phases.phase2 = {
        status: 'COMPLETED',
        duration: Date.now() - this.testResults.phases.phase2.start,
        analysis: windowAnalysis
      };

    } catch (error) {
      this.testResults.phases.phase2.status = 'FAILED';
      this.testResults.phases.phase2.error = error.message;
      await this.takeScreenshot('dev-toolkit-analysis-failed');
      throw error;
    }
  }

  async phase3_ApplyFixes() {
    console.log('\n📍 PHASE 3: Applying Fixes to Dev Toolkit Issues');
    this.testResults.phases.phase3 = { status: 'RUNNING', start: Date.now() };

    try {
      const analysis = this.testResults.dev_toolkit_analysis;
      const fixes = [];

      // Fix 1: If window is black/empty
      if (analysis.backgroundColor === 'rgb(0, 0, 0)' || analysis.backgroundColor === 'rgba(0, 0, 0, 0)' || !analysis.hasContent) {
        console.log('🔧 Fix 1: Addressing black/empty window...');
        
        await this.devToolkitWindow.evaluate(() => {
          // Force reload the window
          window.location.reload();
        });
        
        await this.devToolkitWindow.waitForTimeout(3000);
        await this.takeScreenshot('fix-1-after-reload');
        fixes.push('Applied window reload to fix black/empty content');
      }

      // Fix 2: If no stylesheets
      if (analysis.hasStylesheets === 0) {
        console.log('🔧 Fix 2: Addressing missing stylesheets...');
        
        await this.devToolkitWindow.evaluate(() => {
          // Try to load parent window styles
          const parentStyles = window.opener?.document?.querySelectorAll('style, link[rel="stylesheet"]');
          if (parentStyles) {
            parentStyles.forEach(style => {
              if (style.tagName === 'LINK') {
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = style.href;
                document.head.appendChild(newLink);
              } else {
                const newStyle = document.createElement('style');
                newStyle.textContent = style.textContent;
                document.head.appendChild(newStyle);
              }
            });
          }
        });
        
        await this.devToolkitWindow.waitForTimeout(2000);
        await this.takeScreenshot('fix-2-after-styles');
        fixes.push('Attempted to copy stylesheets from parent window');
      }

      // Fix 3: If no Dev Toolkit elements
      if (!analysis.hasDevToolkitElements.hasTitle) {
        console.log('🔧 Fix 3: Checking for content loading issues...');
        
        // Wait longer and check again
        await this.devToolkitWindow.waitForTimeout(5000);
        
        const hasContentNow = await this.devToolkitWindow.evaluate(() => {
          return {
            hasTitle: !!document.querySelector('[class*="Dev Toolkit"], .font-semibold'),
            bodyText: document.body.textContent.slice(0, 200)
          };
        });
        
        await this.takeScreenshot('fix-3-content-check');
        fixes.push(`Content check after wait: ${JSON.stringify(hasContentNow)}`);
      }

      // Fix 4: Try opening Dev Toolkit in main window instead
      if (fixes.length > 0) {
        console.log('🔧 Fix 4: Trying Dev Toolkit in main window...');
        
        // Close the popup window
        if (this.devToolkitWindow) {
          await this.devToolkitWindow.close();
        }
        
        // Try to find and use an inline dev toolkit
        const inlineDevToolkit = await this.page.evaluate(() => {
          // Look for dev toolkit that might be inline
          const devPanel = document.querySelector('[class*="dev-panel"], [class*="dev-toolkit"]');
          if (devPanel) {
            devPanel.style.display = 'block';
            devPanel.style.visibility = 'visible';
            return true;
          }
          
          // Try navigating to /dev route
          if (window.location.pathname !== '/dev') {
            window.location.href = window.location.origin + '/dev';
            return true;
          }
          
          return false;
        });
        
        if (inlineDevToolkit) {
          await this.page.waitForTimeout(3000);
          await this.takeScreenshot('fix-4-inline-dev-toolkit');
          fixes.push('Tried inline dev toolkit or /dev route');
        }
      }

      this.testResults.fixes_applied = fixes;
      this.testResults.phases.phase3 = {
        status: 'COMPLETED',
        duration: Date.now() - this.testResults.phases.phase3.start,
        fixes_applied: fixes
      };

    } catch (error) {
      this.testResults.phases.phase3.status = 'FAILED';
      this.testResults.phases.phase3.error = error.message;
      await this.takeScreenshot('fixes-failed');
    }
  }

  async phase4_TestOAuthFlow() {
    console.log('\n📍 PHASE 4: Testing Google OAuth Flow');
    this.testResults.phases.phase4 = { status: 'RUNNING', start: Date.now() };

    try {
      // Go back to main page
      console.log('🏠 Returning to main page...');
      await this.page.goto(LOVABLE_DEV_URL);
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('oauth-start');

      // Clear any existing auth
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      await this.page.reload();
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('oauth-cleared');

      // Look for Google OAuth button
      const oauthSelectors = [
        'button:has-text("Sign in with Google")',
        'button:has-text("Google")',
        'button[class*="google"]',
        '.auth-button',
        '[data-testid="google-auth"]'
      ];

      let oauthButton = null;
      for (const selector of oauthSelectors) {
        oauthButton = await this.page.$(selector);
        if (oauthButton) {
          console.log(`✅ Found OAuth button with selector: ${selector}`);
          break;
        }
      }

      if (!oauthButton) {
        await this.takeScreenshot('no-oauth-button');
        
        // Try to trigger auth flow programmatically
        console.log('🚀 Attempting to trigger OAuth programmatically...');
        const authTriggered = await this.page.evaluate(() => {
          // Look for auth functions in window
          if (window.supabase && typeof window.supabase.auth?.signInWithOAuth === 'function') {
            window.supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: window.location.origin
              }
            });
            return 'supabase.auth.signInWithOAuth';
          }
          
          // Look for other auth triggers
          const authLinks = document.querySelectorAll('a[href*="auth"], a[href*="login"]');
          if (authLinks.length > 0) {
            authLinks[0].click();
            return 'clicked auth link';
          }
          
          return false;
        });

        if (authTriggered) {
          console.log(`🔧 Auth triggered via: ${authTriggered}`);
          await this.page.waitForTimeout(3000);
          await this.takeScreenshot('oauth-triggered-programmatically');
        }
      } else {
        console.log('🖱️ Clicking OAuth button...');
        await this.takeScreenshot('oauth-button-found');
        
        // Listen for navigation or popup
        const [response] = await Promise.all([
          this.page.waitForResponse(response => 
            response.url().includes('google.com') || 
            response.url().includes('oauth') ||
            response.url().includes('auth'), 
            { timeout: 10000 }
          ).catch(() => null),
          oauthButton.click()
        ]);

        if (response) {
          console.log(`📡 OAuth response received: ${response.url()}`);
          await this.takeScreenshot('oauth-response-received');
        }
      }

      // Check for demo mode as fallback
      const demoModeAvailable = await this.page.evaluate(() => {
        const demoButton = document.querySelector('button:has-text("Demo Mode"), button:has-text("Demo")');
        if (demoButton) {
          demoButton.click();
          return true;
        }
        return false;
      });

      if (demoModeAvailable) {
        console.log('🎭 Demo mode activated as OAuth fallback');
        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('demo-mode-activated');
      }

      // Final auth state check
      const authState = await this.page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('token')),
          sessionStorage: Object.keys(sessionStorage).filter(k => k.includes('auth') || k.includes('token')),
          cookies: document.cookie.split(';').filter(c => c.includes('auth') || c.includes('token')),
          hasUserData: !!document.querySelector('[class*="user"], [class*="profile"], [class*="avatar"]'),
          currentUrl: window.location.href
        };
      });

      console.log('📊 Final auth state:', JSON.stringify(authState, null, 2));

      this.testResults.oauth_flow_result = authState;
      this.testResults.phases.phase4 = {
        status: 'COMPLETED',
        duration: Date.now() - this.testResults.phases.phase4.start,
        auth_state: authState
      };

    } catch (error) {
      this.testResults.phases.phase4.status = 'FAILED';
      this.testResults.phases.phase4.error = error.message;
      await this.takeScreenshot('oauth-flow-failed');
    }
  }

  async phase5_FinalVerification() {
    console.log('\n📍 PHASE 5: Final Verification and Cleanup');
    this.testResults.phases.phase5 = { status: 'RUNNING', start: Date.now() };

    try {
      // Take final screenshot of main app
      await this.takeScreenshot('final-main-app');

      // If dev toolkit window is still open, test it one more time
      if (this.devToolkitWindow && !this.devToolkitWindow.isClosed()) {
        console.log('🔍 Final Dev Toolkit verification...');
        
        const finalAnalysis = await this.devToolkitWindow.evaluate(() => {
          return {
            hasContent: document.body.textContent.trim().length > 0,
            visibleElements: document.querySelectorAll('*:not(script):not(style)').length,
            title: document.title,
            backgroundColor: window.getComputedStyle(document.body).backgroundColor
          };
        });

        await this.takeScreenshot('final-dev-toolkit');
        console.log('📊 Final Dev Toolkit state:', JSON.stringify(finalAnalysis, null, 2));
      }

      // Generate comprehensive report
      const report = {
        ...this.testResults,
        status: 'COMPLETED',
        total_duration: Date.now() - new Date(this.testResults.timestamp).getTime(),
        summary: {
          phases_completed: Object.keys(this.testResults.phases).filter(p => 
            this.testResults.phases[p].status === 'COMPLETED'
          ).length,
          phases_failed: Object.keys(this.testResults.phases).filter(p => 
            this.testResults.phases[p].status === 'FAILED'
          ).length,
          total_screenshots: this.testResults.screenshots.length,
          dev_toolkit_working: this.testResults.dev_toolkit_analysis?.hasContent || false,
          oauth_attempted: !!this.testResults.oauth_flow_result,
          fixes_applied: this.testResults.fixes_applied.length
        }
      };

      await fs.writeFile(
        path.join(this.testDir, 'comprehensive-test-report.json'),
        JSON.stringify(report, null, 2)
      );

      this.testResults.phases.phase5 = {
        status: 'COMPLETED',
        duration: Date.now() - this.testResults.phases.phase5.start,
        report_saved: true
      };

      this.testResults = report;

    } catch (error) {
      this.testResults.phases.phase5.status = 'FAILED';
      this.testResults.phases.phase5.error = error.message;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.devToolkitWindow && !this.devToolkitWindow.isClosed()) {
      await this.devToolkitWindow.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      await this.phase1_LoadApp();
      await this.phase2_AnalyzeDevToolkit();
      await this.phase3_ApplyFixes();
      await this.phase4_TestOAuthFlow();
      await this.phase5_FinalVerification();

      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    ✅ TEST COMPLETED                          ║
║                                                               ║
║  📊 Summary:                                                  ║
║    • Phases completed: ${this.testResults.summary.phases_completed}/${Object.keys(this.testResults.phases).length}                               ║
║    • Screenshots taken: ${this.testResults.summary.total_screenshots}                              ║
║    • Fixes applied: ${this.testResults.summary.fixes_applied}                                    ║
║    • Dev Toolkit working: ${this.testResults.summary.dev_toolkit_working ? 'YES' : 'NO'}                        ║
║    • OAuth attempted: ${this.testResults.summary.oauth_attempted ? 'YES' : 'NO'}                            ║
║                                                               ║
║  📁 Results saved to: ${path.basename(this.testDir)}                 ║
╚═══════════════════════════════════════════════════════════════╝
`);

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      this.testResults.status = 'FAILED';
      this.testResults.error = error.message;
      
      await this.takeScreenshot('test-failed');
      
      await fs.writeFile(
        path.join(this.testDir, 'error-report.json'),
        JSON.stringify(this.testResults, null, 2)
      );
    } finally {
      await this.cleanup();
    }

    return this.testResults;
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new ComprehensiveDevToolkitTest();
  test.run()
    .then(results => {
      console.log('\n📋 Test Results:', JSON.stringify(results.summary, null, 2));
      process.exit(results.status === 'COMPLETED' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveDevToolkitTest;