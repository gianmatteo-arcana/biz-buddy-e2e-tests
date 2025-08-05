import { Page, expect } from '@playwright/test';

/**
 * Wait for the dashboard to be fully loaded
 */
export async function waitForDashboard(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/dashboard|^\/$/, { timeout: 30000 });
}

/**
 * Check if user is authenticated by looking for common auth indicators
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for common authenticated elements
    const authIndicators = [
      page.locator('text=Dashboard'),
      page.locator('text=Welcome'),
      page.locator('[data-testid="user-menu"]'),
      page.locator('button:has-text("Sign out")')
    ];
    
    for (const indicator of authIndicators) {
      if (await indicator.isVisible({ timeout: 5000 })) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Take a screenshot with consistent settings
 */
export async function takeScreenshot(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: `test-results/${name}`,
    fullPage,
    animations: 'disabled'
  });
}

/**
 * Fill form field with retry logic
 */
export async function fillField(page: Page, selector: string, value: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const field = page.locator(selector).first();
      await field.waitFor({ state: 'visible', timeout: 5000 });
      await field.clear();
      await field.fill(value);
      
      // Verify the value was set
      const actualValue = await field.inputValue();
      if (actualValue === value) {
        return;
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Handle cookie consent banners if they appear
 */
export async function dismissCookieBanner(page: Page) {
  try {
    const cookieBanners = [
      page.locator('text=Accept cookies'),
      page.locator('text=Accept all'),
      page.locator('button:has-text("Got it")'),
      page.locator('[data-testid="cookie-accept"]')
    ];
    
    for (const banner of cookieBanners) {
      if (await banner.isVisible({ timeout: 3000 })) {
        await banner.click();
        await page.waitForTimeout(500);
        break;
      }
    }
  } catch {
    // Ignore if no cookie banner
  }
}

/**
 * Wait for network to be idle with custom timeout
 */
export async function waitForNetworkIdle(page: Page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Get inner text with fallback
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  try {
    const element = page.locator(selector).first();
    return await element.textContent() || '';
  } catch {
    return '';
  }
}

/**
 * Check if onboarding is visible
 */
export async function isOnboardingVisible(page: Page): Promise<boolean> {
  const onboardingSelectors = [
    'text=Welcome to BizBuddy!',
    '[data-testid="onboarding-card"]',
    '.onboarding-overlay'
  ];
  
  for (const selector of onboardingSelectors) {
    if (await page.locator(selector).isVisible({ timeout: 5000 })) {
      return true;
    }
  }
  
  return false;
}

/**
 * Complete onboarding flow
 */
export async function completeOnboarding(page: Page) {
  // This is a simplified version - expand based on actual flow
  const steps = ['Continue', 'Next', 'Complete', 'Finish'];
  
  for (const step of steps) {
    const button = page.locator(`button:has-text("${step}")`).first();
    if (await button.isVisible({ timeout: 3000 })) {
      await button.click();
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Format test data for consistent testing
 */
export function generateTestData(prefix = 'test') {
  const timestamp = Date.now();
  return {
    businessName: `${prefix} Business ${timestamp}`,
    email: `${prefix}.${timestamp}@example.com`,
    ein: `${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000000 + 1000000)}`,
    phone: `555-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`
  };
}