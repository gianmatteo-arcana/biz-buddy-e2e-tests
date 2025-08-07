/**
 * Helper to wait for app initialization using frontend instrumentation
 */

async function waitForAppReady(page, options = {}) {
  const { timeout = 30000 } = options;
  
  console.log('⏳ Waiting for app to initialize...');
  
  try {
    // Wait for the app state to be available
    await page.waitForFunction(
      () => window.__appState && window.__appState.initialized,
      { timeout }
    );
    
    // Get the final state
    const appState = await page.evaluate(() => window.__appState);
    
    console.log('✅ App initialized!');
    console.log('  State:', {
      authChecked: appState.authChecked,
      userLoaded: appState.userLoaded,
      onboardingChecked: appState.onboardingChecked,
      error: appState.error
    });
    
    return appState;
  } catch (_error) {
    console.error('❌ Timeout waiting for app initialization');
    
    // Try to get partial state
    const partialState = await page.evaluate(() => window.__appState || {});
    console.log('  Partial state:', partialState);
    
    throw error;
  }
}

/**
 * Wait for specific app states
 */
async function waitForAuthCheck(page, timeout = 10000) {
  return page.waitForFunction(
    () => window.__appState && window.__appState.authChecked,
    { timeout }
  );
}

async function waitForUserLoad(page, timeout = 10000) {
  return page.waitForFunction(
    () => window.__appState && window.__appState.userLoaded,
    { timeout }
  );
}

async function waitForOnboardingCheck(page, timeout = 10000) {
  return page.waitForFunction(
    () => window.__appState && window.__appState.onboardingChecked,
    { timeout }
  );
}

module.exports = {
  waitForAppReady,
  waitForAuthCheck,
  waitForUserLoad,
  waitForOnboardingCheck
};