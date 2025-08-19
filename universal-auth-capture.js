/**
 * Universal Authentication & Screenshot Capture
 * Works for both Lovable production and localhost development
 * Auto-detects environment and adapts accordingly
 */

import { chromium } from 'playwright';
import fs from 'fs';

// Environment configurations
const ENVIRONMENTS = {
  localhost: {
    baseUrl: process.env.APP_URL || 'http://localhost:8082',
    name: 'localhost',
    authRedirectExpected: true, // Should redirect back to localhost after OAuth
    devToolkitPath: '/dev-toolkit-standalone'
  },
  lovable: {
    baseUrl: 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com',
    name: 'lovable', 
    authRedirectExpected: true, // Should redirect back to Lovable after OAuth
    devToolkitPath: '/dev-toolkit-standalone'
  }
};

/**
 * Auto-detect environment or use specified one
 */
function getEnvironment(specifiedEnv = null) {
  if (specifiedEnv && ENVIRONMENTS[specifiedEnv]) {
    return ENVIRONMENTS[specifiedEnv];
  }
  
  // Auto-detect based on dev server running
  const isDevServerRunning = process.env.NODE_ENV === 'development' || 
                            process.argv.includes('--localhost') ||
                            !process.argv.includes('--lovable');
  
  return isDevServerRunning ? ENVIRONMENTS.localhost : ENVIRONMENTS.lovable;
}

/**
 * Universal authentication capture
 */
async function universalAuthCapture(options = {}) {
  const {
    environment = null,
    screenshotPrefix = 'universal',
    headless = false,
    timeout = 120000, // 2 minutes
    email = 'gianmatteo.allyn.test@gmail.com'
  } = options;
  
  const env = getEnvironment(environment);
  const screenshotDir = `${screenshotPrefix}-${env.name}-screenshots`;
  
  console.log('🚀 Universal Authentication & Screenshot Capture');
  console.log('================================================');
  console.log(`🌍 Environment: ${env.name.toUpperCase()}`);
  console.log(`🔗 Base URL: ${env.baseUrl}`);
  console.log(`📧 Test Email: ${email}`);
  console.log(`📁 Screenshots: ${screenshotDir}/`);
  console.log('');
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }
  
  const browser = await chromium.launch({ 
    headless,
    args: ['--window-size=1920,1080']
  });
  
  try {
    // Step 1: Create context and check existing auth
    console.log('🔍 Step 1: Checking existing authentication...');
    
    let context;
    let hasExistingAuth = false;
    
    try {
      context = await browser.newContext({
        storageState: '.auth/user-state.json',
        viewport: { width: 1920, height: 1080 }
      });
      
      const testPage = await context.newPage();
      await testPage.goto(`${env.baseUrl}${env.devToolkitPath}`);
      await testPage.waitForTimeout(3000);
      
      const authCheck = await testPage.evaluate(() => {
        const bodyText = document.body.textContent;
        return {
          hasAuth: bodyText.includes('✅ Authenticated'),
          hasDemo: bodyText.includes('Demo Mode'),
          hasWelcome: bodyText.includes('Welcome'),
          hasGianmatteo: bodyText.includes('Gianmatteo')
        };
      });
      
      hasExistingAuth = authCheck.hasAuth || (authCheck.hasWelcome && !authCheck.hasDemo);
      
      if (hasExistingAuth) {
        console.log('✅ Existing authentication valid!');
      } else {
        console.log('❌ Existing authentication invalid or expired');
        await testPage.close();
        await context.close();
      }
      
    } catch (e) {
      console.log('❌ No existing authentication state');
    }
    
    // Step 2: Fresh authentication if needed
    if (!hasExistingAuth) {
      console.log('');
      console.log('🔑 Step 2: Starting fresh authentication flow...');
      
      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      const page = await context.newPage();
      
      // Navigate to main app for auth
      console.log(`🌐 Navigating to ${env.name} main app...`);
      await page.goto(env.baseUrl);
      await page.waitForTimeout(3000);
      
      // Check if authentication is needed
      const needsAuth = await page.evaluate(() => {
        const bodyText = document.body.textContent;
        return {
          hasSignIn: bodyText.includes('Sign in') || bodyText.includes('Login'),
          hasAuth: bodyText.includes('Auth'),
          hasWelcome: bodyText.includes('Welcome'),
          hasGianmatteo: bodyText.includes('Gianmatteo'),
          buttons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim()).filter(Boolean)
        };
      });
      
      console.log('📱 Current app state:');
      console.log('  Sign in available:', needsAuth.hasSignIn ? '✅' : '❌');
      console.log('  Already authenticated:', (needsAuth.hasWelcome || needsAuth.hasGianmatteo) ? '✅' : '❌');
      console.log('  Available buttons:', needsAuth.buttons.slice(0, 3));
      
      if (needsAuth.hasSignIn && !needsAuth.hasWelcome) {
        console.log('');
        console.log('🔐 MANUAL AUTHENTICATION REQUIRED');
        console.log('=====================================');
        console.log('');
        console.log('📋 INSTRUCTIONS:');
        console.log('1. 👀 Look at the browser window');
        console.log('2. 🖱️  Click "Sign in with Google"');
        console.log(`3. 📧 Use email: ${email}`);
        console.log('4. ⏳ Complete OAuth flow');
        console.log(`5. 🏠 Verify redirect to: ${env.baseUrl}`);
        console.log('6. ✅ Look for Welcome message');
        console.log('');
        console.log(`⏰ Waiting up to ${timeout/1000} seconds for completion...`);
        console.log('');
        
        // Click auth button
        try {
          const authButton = page.locator('button:has-text("Sign in with Google"), button:has-text("Google"), button:has-text("Sign in")');
          const buttonCount = await authButton.count();
          
          if (buttonCount > 0) {
            console.log('🎯 Clicking authentication button...');
            await authButton.first().click();
            console.log('✅ Auth flow initiated!');
          } else {
            console.log('⚠️ Please manually click the auth button');
          }
        } catch (e) {
          console.log('⚠️ Please manually click the auth button');
        }
        
        // Wait for authentication completion
        let authCompleted = false;
        let attempts = 0;
        const maxAttempts = Math.floor(timeout / 5000);
        
        while (!authCompleted && attempts < maxAttempts) {
          await page.waitForTimeout(5000);
          attempts++;
          
          try {
            const authStatus = await page.evaluate((baseUrl) => {
              const bodyText = document.body.textContent;
              const currentUrl = window.location.href;
              return {
                url: currentUrl,
                isCorrectDomain: currentUrl.includes(baseUrl.replace('https://', '').replace('http://', '')),
                hasWelcome: bodyText.includes('Welcome'),
                hasGianmatteo: bodyText.includes('Gianmatteo'),
                hasAuth: bodyText.includes('authenticated') || bodyText.includes('Authenticated')
              };
            }, env.baseUrl);
            
            console.log(`🔍 Check ${attempts}/${maxAttempts}:`, {
              domain: authStatus.isCorrectDomain ? '✅' : '❌',
              welcome: authStatus.hasWelcome ? '✅' : '❌',
              user: authStatus.hasGianmatteo ? '✅' : '❌'
            });
            
            if (authStatus.isCorrectDomain && (authStatus.hasWelcome || authStatus.hasGianmatteo || authStatus.hasAuth)) {
              console.log('🎉 AUTHENTICATION SUCCESSFUL!');
              authCompleted = true;
              
              // Save authentication state
              const storageState = await context.storageState();
              if (!fs.existsSync('.auth')) {
                fs.mkdirSync('.auth');
              }
              fs.writeFileSync('.auth/user-state.json', JSON.stringify(storageState, null, 2));
              console.log('💾 Authentication state saved');
            }
          } catch (e) {
            console.log(`⚠️ Check ${attempts}: Error checking state`);
          }
        }
        
        if (!authCompleted) {
          console.log('⏰ Authentication timeout - proceeding with current state...');
        }
      } else if (needsAuth.hasWelcome || needsAuth.hasGianmatteo) {
        console.log('✅ Already authenticated!');
        
        // Save current auth state
        const storageState = await context.storageState();
        if (!fs.existsSync('.auth')) {
          fs.mkdirSync('.auth');
        }
        fs.writeFileSync('.auth/user-state.json', JSON.stringify(storageState, null, 2));
        console.log('💾 Existing authentication state saved');
      }
    }
    
    // Step 3: Test Dev Toolkit with authentication
    console.log('');
    console.log('🔧 Step 3: Testing Dev Toolkit authentication...');
    
    const page = context.pages()[0] || await context.newPage();
    await page.goto(`${env.baseUrl}${env.devToolkitPath}`);
    await page.waitForTimeout(3000);
    
    const devToolkitStatus = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      return {
        hasDemo: bodyText.includes('Demo Mode'),
        hasAuth: bodyText.includes('✅ Authenticated'),
        hasCreateTask: bodyText.includes('Create Task:'),
        hasTaskSelector: bodyText.includes('Select template') || bodyText.includes('Complete Business Onboarding'),
        hasLayoutOptimization: !bodyText.includes('Real-Time Agent Visualizer') // Should be removed
      };
    });
    
    console.log('📊 Dev Toolkit Status:');
    console.log('  Demo Mode:', devToolkitStatus.hasDemo ? '❌ (not authenticated)' : '✅ (authenticated)');
    console.log('  Authenticated Badge:', devToolkitStatus.hasAuth ? '✅ (perfect!)' : '❌ (auth failed)');
    console.log('  Layout Optimized:', devToolkitStatus.hasCreateTask && devToolkitStatus.hasLayoutOptimization ? '✅ (working)' : '❌ (broken)');
    console.log('  Task Controls:', devToolkitStatus.hasTaskSelector ? '✅ (present)' : '❌ (missing)');
    
    // Step 4: Capture screenshots
    console.log('');
    console.log('📸 Step 4: Capturing screenshots...');
    
    const authStatus = devToolkitStatus.hasAuth ? 'authenticated' : 'demo';
    const layoutStatus = devToolkitStatus.hasLayoutOptimization ? 'optimized' : 'standard';
    
    // Screenshot 1: Current state
    await page.screenshot({ 
      path: `${screenshotDir}/01-current-state-${authStatus}-${layoutStatus}.png`,
      fullPage: false
    });
    console.log(`📸 Captured: 01-current-state-${authStatus}-${layoutStatus}.png`);
    
    // Screenshot 2: Highlighted features
    await page.evaluate(() => {
      // Highlight Create Task if present
      const createTaskSpan = Array.from(document.querySelectorAll('span')).find(
        el => el.textContent?.includes('Create Task:')
      );
      if (createTaskSpan) {
        createTaskSpan.style.backgroundColor = '#fef3c7';
        createTaskSpan.style.padding = '6px 10px';
        createTaskSpan.style.borderRadius = '4px';
        createTaskSpan.style.border = '2px solid #f59e0b';
        createTaskSpan.style.fontWeight = 'bold';
      }
      
      // Highlight auth badge if present
      const authBadge = Array.from(document.querySelectorAll('*')).find(
        el => el.textContent?.includes('✅ Authenticated')
      );
      if (authBadge) {
        authBadge.style.backgroundColor = '#dcfce7';
        authBadge.style.border = '2px solid #16a34a';
        authBadge.style.borderRadius = '4px';
        authBadge.style.padding = '4px 8px';
      }
      
      // Highlight brain icon
      const brainIcon = document.querySelector('.lucide-brain, [class*="brain"]');
      if (brainIcon) {
        brainIcon.style.color = '#10b981';
        brainIcon.style.filter = 'drop-shadow(0 0 6px #10b981)';
      }
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `${screenshotDir}/02-highlighted-features-${authStatus}-${layoutStatus}.png`,
      fullPage: false
    });
    console.log(`📸 Captured: 02-highlighted-features-${authStatus}-${layoutStatus}.png`);
    
    // Screenshot 3: Clean final shot
    await page.evaluate(() => {
      document.querySelectorAll('*').forEach(el => {
        el.style.backgroundColor = '';
        el.style.border = '';
        el.style.filter = '';
      });
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `${screenshotDir}/03-final-${authStatus}-${layoutStatus}.png`,
      fullPage: false
    });
    console.log(`📸 Captured: 03-final-${authStatus}-${layoutStatus}.png`);
    
    console.log('');
    console.log('🎉 UNIVERSAL CAPTURE COMPLETE!');
    console.log('===============================');
    console.log(`🌍 Environment: ${env.name.toUpperCase()}`);
    console.log(`🔐 Authentication: ${authStatus.toUpperCase()}`);
    console.log(`🎨 Layout: ${layoutStatus.toUpperCase()}`);
    console.log(`📁 Screenshots: ${screenshotDir}/`);
    
    const screenshots = fs.readdirSync(screenshotDir);
    console.log('');
    console.log('📸 Captured files:');
    screenshots.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    return {
      environment: env.name,
      screenshotDir,
      authWorking: devToolkitStatus.hasAuth,
      layoutOptimized: devToolkitStatus.hasLayoutOptimization,
      screenshots: screenshots.length
    };
    
  } finally {
    console.log('');
    console.log('⏰ Keeping browser open for 30 seconds...');
    
    setTimeout(async () => {
      await browser.close();
      console.log('🚪 Browser closed');
    }, 30000);
  }
}

/**
 * CLI Usage
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  if (args.includes('--localhost')) {
    options.environment = 'localhost';
  } else if (args.includes('--lovable')) {
    options.environment = 'lovable';
  }
  
  if (args.includes('--headless')) {
    options.headless = true;
  }
  
  const prefixIndex = args.findIndex(arg => arg === '--prefix');
  if (prefixIndex !== -1 && args[prefixIndex + 1]) {
    options.screenshotPrefix = args[prefixIndex + 1];
  }
  
  try {
    const result = await universalAuthCapture(options);
    
    console.log('');
    console.log('🏆 MISSION ACCOMPLISHED!');
    console.log(`🌍 Environment: ${result.environment}`);
    console.log(`🔐 Auth: ${result.authWorking ? 'SUCCESS' : 'NEEDS WORK'}`);
    console.log(`🎨 Layout: ${result.layoutOptimized ? 'OPTIMIZED' : 'STANDARD'}`);
    console.log(`📸 Screenshots: ${result.screenshots} files`);
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

// Export for use as module or run as CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { universalAuthCapture, getEnvironment, ENVIRONMENTS };