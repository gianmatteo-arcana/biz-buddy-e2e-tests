/**
 * Playwright Test Helpers
 * 
 * Deterministic wait functions following our testing standards
 * NO arbitrary timeouts - only data-driven waits
 */

/**
 * Wait for the application to be fully ready
 * Checks for data-app-ready attribute on body
 */
async function waitForAppReady(page) {
  await page.waitForSelector('body[data-app-ready="true"]', {
    timeout: 30000,
    state: 'attached'
  });
}

/**
 * Wait for a specific component to finish loading data
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the component
 */
async function waitForDataLoad(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"][data-loaded="true"]`, {
    timeout: 30000,
    state: 'attached'
  });
}

/**
 * Wait for all network requests to complete
 * Checks for data-network-active attribute on body
 */
async function waitForNetworkIdle(page) {
  await page.waitForSelector('body[data-network-active="false"]', {
    timeout: 30000,
    state: 'attached'
  });
}

/**
 * Wait for React Suspense boundary to resolve
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the loading indicator
 */
async function waitForSuspenseResolved(page, testId = 'app-loading') {
  await page.waitForSelector(`[data-testid="${testId}"]`, {
    state: 'detached',
    timeout: 30000
  });
}

/**
 * Wait for a custom event to be dispatched
 * @param {Page} page - Playwright page object
 * @param {string} eventName - Name of the custom event (e.g., 'app:data-loaded')
 */
async function waitForCustomEvent(page, eventName) {
  await page.evaluate((event) => 
    new Promise(resolve => 
      window.addEventListener(event, resolve, { once: true })
    ),
    eventName
  );
}

/**
 * Wait for authentication to complete
 * Checks for data-auth-ready attribute
 */
async function waitForAuthReady(page) {
  await page.waitForSelector('[data-auth-ready="true"]', {
    timeout: 30000,
    state: 'attached'
  });
}

/**
 * Click an element using data-testid
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the element to click
 */
async function clickTestId(page, testId) {
  await page.click(`[data-testid="${testId}"]`);
}

/**
 * Type into an input using data-testid
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the input
 * @param {string} text - Text to type
 */
async function typeInTestId(page, testId, text) {
  await page.fill(`[data-testid="${testId}"]`, text);
}

/**
 * Check if element with testid exists
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid to check
 */
async function hasTestId(page, testId) {
  const element = await page.$(`[data-testid="${testId}"]`);
  return element !== null;
}

/**
 * Get text content of element with testid
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the element
 */
async function getTestIdText(page, testId) {
  return await page.textContent(`[data-testid="${testId}"]`);
}

/**
 * Wait for element to be visible using testid
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the element
 */
async function waitForTestIdVisible(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"]`, {
    state: 'visible',
    timeout: 30000
  });
}

/**
 * Wait for element to be hidden using testid
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the element
 */
async function waitForTestIdHidden(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"]`, {
    state: 'hidden',
    timeout: 30000
  });
}

/**
 * Get all data attributes from an element
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the element
 */
async function getDataAttributes(page, testId) {
  return await page.evaluate((id) => {
    const element = document.querySelector(`[data-testid="${id}"]`);
    if (!element) return null;
    
    const attrs = {};
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }, testId);
}

/**
 * Wait for specific data attribute value
 * @param {Page} page - Playwright page object
 * @param {string} testId - The data-testid of the element
 * @param {string} attribute - The data attribute name (without 'data-' prefix)
 * @param {string} value - Expected value
 */
async function waitForDataAttribute(page, testId, attribute, value) {
  await page.waitForSelector(
    `[data-testid="${testId}"][data-${attribute}="${value}"]`,
    { timeout: 30000 }
  );
}

module.exports = {
  waitForAppReady,
  waitForDataLoad,
  waitForNetworkIdle,
  waitForSuspenseResolved,
  waitForCustomEvent,
  waitForAuthReady,
  clickTestId,
  typeInTestId,
  hasTestId,
  getTestIdText,
  waitForTestIdVisible,
  waitForTestIdHidden,
  getDataAttributes,
  waitForDataAttribute
};