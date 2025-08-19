/**
 * Test Dev Toolkit via keyboard shortcut
 * This tests the Dev Toolkit by using the Ctrl+Shift+D keyboard shortcut
 * which should work in Lovable environments
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const APP_URL = 'https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/?__lovable_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOVdvb0s1Q2UyUGFjN2tIM3RTSzBNdTFYT1ZJMiIsInByb2plY3RfaWQiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJyb2xlIjoib3duZXIiLCJub25jZSI6ImJjY2ZiN2U2YTVkMzZiZTExYWQwNzgxMmU4NmZkYTBlIiwiaXNzIjoibG92YWJsZS1hcGkiLCJzdWIiOiJjOGViMmQ4Ni1kNzlkLTQ3MGQtYjI5Yy03YTgyZDIyMDM0NmIiLCJhdWQiOlsibG92YWJsZS1hcHAiXSwiZXhwIjoxNzU1MjE4MjUyLCJuYmYiOjE3NTQ2MTM0NTIsImlhdCI6MTc1NDYxMzQ1Mn0.D6dTZcv5SpAWyscO3U9SXVDN5r6lBcv1F0_FNBZ-Exw'; // Lovable dev environment with token

async function testDevToolkitKeyboard() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(process.cwd(), `test-dev-toolkit-keyboard-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  console.log(`\n🎯 Testing Dev Toolkit via Keyboard Shortcut`);
  console.log(`📁 Results: ${path.basename(testDir)}\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // Load saved auth state if available
  try {
    const authPath = path.join(process.cwd(), '.auth', 'user-state.json');
    const authState = JSON.parse(await fs.readFile(authPath, 'utf-8'));
    
    // Set cookies and localStorage
    if (authState.cookies) {
      await context.addCookies(authState.cookies);
    }
    
    const page = await context.newPage();
    
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    
    // Set localStorage after navigation
    if (authState.localStorage) {
      await page.evaluate((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          localStorage.setItem(key, value);
        }
      }, authState.localStorage);
      
      // Reload to apply localStorage
      await page.reload({ waitUntil: 'networkidle' });
    }
    
    console.log('✅ Authentication restored');
  } catch (error) {
    console.log('⚠️ No saved auth found, continuing without authentication');
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
  }

  const page = context.pages()[0];

  // Set up console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Dev Toolkit') || text.includes('DevToolkit')) {
      console.log(`🔧 Dev Toolkit Log: ${text}`);
    }
  });

  // Listen for new windows/popups
  page.on('popup', async (popup) => {
    console.log('🪟 New window opened!');
    await popup.waitForLoadState('networkidle');
    
    // Take screenshot of the popup
    const popupScreenshot = path.join(testDir, 'dev-toolkit-window.png');
    await popup.screenshot({ path: popupScreenshot, fullPage: true });
    console.log(`📸 Dev Toolkit window screenshot saved`);
    
    // Analyze popup content
    const popupContent = await popup.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent.trim().length > 0,
        bodyText: document.body.textContent.slice(0, 500),
        backgroundColor: window.getComputedStyle(document.body).backgroundColor,
        elementsCount: document.body.querySelectorAll('*').length
      };
    });
    
    console.log('📊 Popup analysis:', JSON.stringify(popupContent, null, 2));
    
    // Save analysis
    await fs.writeFile(
      path.join(testDir, 'popup-analysis.json'),
      JSON.stringify(popupContent, null, 2)
    );
  });

  await page.waitForTimeout(3000); // Let page fully load

  // Take initial screenshot
  await page.screenshot({ path: path.join(testDir, '01-before-shortcut.png'), fullPage: true });
  console.log('📸 Initial screenshot taken');

  // Check current state
  const initialState = await page.evaluate(() => {
    // Check if Dev Toolkit button is visible
    const buttons = Array.from(document.querySelectorAll('button'));
    const devButton = buttons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg && (btn.title?.includes('Dev Toolkit') || btn.getAttribute('aria-label')?.includes('Dev Toolkit'));
    });
    
    return {
      url: window.location.href,
      hostname: window.location.hostname,
      isLovableEnv: window.location.hostname.includes('lovableproject.com') ||
                    window.location.hostname.includes('lovable.app') ||
                    window.location.hostname.includes('lovable.dev'),
      devButtonVisible: !!devButton,
      devButtonDetails: devButton ? {
        title: devButton.title,
        className: devButton.className,
        isVisible: devButton.offsetParent !== null
      } : null,
      isDemoMode: window.isDemoMode || false,
      hasAuth: !!localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token')
    };
  });

  console.log('\n📊 Initial state:', JSON.stringify(initialState, null, 2));

  // Try keyboard shortcut (Ctrl+Shift+D on Windows/Linux, Cmd+Shift+D on Mac)
  console.log('\n⌨️ Pressing Ctrl+Shift+D (or Cmd+Shift+D)...');
  
  // Try both combinations
  try {
    // First try Cmd+Shift+D (Mac)
    await page.keyboard.press('Meta+Shift+D');
    console.log('✅ Pressed Cmd+Shift+D');
  } catch (e1) {
    try {
      // Then try Ctrl+Shift+D (Windows/Linux)
      await page.keyboard.press('Control+Shift+D');
      console.log('✅ Pressed Ctrl+Shift+D');
    } catch (e2) {
      console.log('⚠️ Keyboard shortcut may not have worked:', e2.message);
    }
  }

  // Wait for potential window to open
  await page.waitForTimeout(3000);

  // Check if Dev Toolkit opened as modal/inline
  const modalCheck = await page.evaluate(() => {
    const devElements = document.querySelectorAll('[class*="dev-toolkit"], [class*="DevToolkit"], [role="dialog"]');
    return {
      hasDevToolkit: devElements.length > 0,
      elements: Array.from(devElements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        textPreview: el.textContent?.slice(0, 100)
      }))
    };
  });

  console.log('\n📊 Modal/inline check:', JSON.stringify(modalCheck, null, 2));

  // Take screenshot after shortcut
  await page.screenshot({ path: path.join(testDir, '02-after-shortcut.png'), fullPage: true });
  console.log('📸 After shortcut screenshot taken');

  // If Dev Toolkit button is visible, try clicking it directly
  if (initialState.devButtonVisible) {
    console.log('\n🖱️ Dev Toolkit button is visible, clicking it...');
    
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const devButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && (btn.title?.includes('Dev Toolkit') || btn.getAttribute('aria-label')?.includes('Dev Toolkit'));
      });
      
      if (devButton) {
        devButton.click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      console.log('✅ Clicked Dev Toolkit button');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(testDir, '03-after-click.png'), fullPage: true });
    }
  }

  // Final state check
  const finalState = await page.evaluate(() => {
    const windows = Array.from(window.frames || []);
    return {
      hasPopup: windows.length > 0,
      hasModal: document.querySelectorAll('[role="dialog"], [class*="modal"]').length > 0,
      hasDevToolkit: document.querySelectorAll('[class*="dev-toolkit"], [class*="DevToolkit"]').length > 0
    };
  });

  console.log('\n📊 Final state:', JSON.stringify(finalState, null, 2));

  // Save test summary
  const summary = {
    timestamp: new Date().toISOString(),
    url: APP_URL,
    initialState,
    modalCheck,
    finalState,
    devToolkitOpened: modalCheck.hasDevToolkit || finalState.hasDevToolkit || finalState.hasModal
  };

  await fs.writeFile(
    path.join(testDir, 'test-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n✨ Test complete!');
  console.log(`📁 Results saved in: ${path.basename(testDir)}`);
  console.log(`🎯 Dev Toolkit opened: ${summary.devToolkitOpened ? '✅ YES' : '❌ NO'}`);

  await browser.close();
}

// Run the test
testDevToolkitKeyboard().catch(console.error);