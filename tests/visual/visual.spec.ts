import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard layout consistency', async ({ page }) => {
    // Wait for dashboard to fully load
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Hide dynamic content that changes between test runs
    await page.addStyleTag({
      content: `
        /* Hide timestamps and dynamic dates */
        [data-testid*="timestamp"], 
        [data-testid*="date"],
        .timestamp, 
        .date,
        time { 
          visibility: hidden !important; 
        }
        
        /* Disable animations */
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('[data-testid="user-avatar"]')] // Mask user-specific content
    });
  });

  test('onboarding card responsive design', async ({ page, browserName }) => {
    // Skip on Firefox due to rendering differences
    test.skip(browserName === 'firefox', 'Skipping visual tests on Firefox');
    
    // Wait for onboarding card
    const hasOnboarding = await page.locator('text=Welcome to BizBuddy!').isVisible();
    
    if (!hasOnboarding) {
      console.log('No onboarding visible, skipping responsive test');
      test.skip();
    }
    
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-1080p' },
      { width: 1366, height: 768, name: 'laptop' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 375, height: 667, name: 'iphone-se' },
      { width: 390, height: 844, name: 'iphone-12' },
      { width: 360, height: 640, name: 'android-small' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Let responsive styles apply
      
      await expect(page).toHaveScreenshot(`onboarding-${viewport.name}.png`, {
        fullPage: false, // Just viewport for responsive tests
        animations: 'disabled'
      });
    }
  });

  test('component visual consistency', async ({ page }) => {
    // Test individual components
    
    // Google Sign-in Button (if visible)
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    if (await googleButton.isVisible()) {
      await expect(googleButton).toHaveScreenshot('google-signin-button.png');
    }
    
    // Navigation/Header
    const header = page.locator('header, nav, [data-testid="navigation"]').first();
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('header-navigation.png');
    }
    
    // Sidebar (if exists)
    const sidebar = page.locator('aside, [data-testid="sidebar"], .sidebar').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('sidebar.png');
    }
  });

  test('dark mode visual consistency', async ({ page }) => {
    // Check if dark mode toggle exists
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"], button[aria-label*="theme"], button:has-text("Dark")').first();
    
    if (await darkModeToggle.isVisible()) {
      // Take light mode screenshot first
      await expect(page).toHaveScreenshot('dashboard-light-mode.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      // Toggle dark mode
      await darkModeToggle.click();
      await page.waitForTimeout(500); // Wait for theme transition
      
      // Take dark mode screenshot
      await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
        fullPage: true,
        animations: 'disabled'
      });
    } else {
      console.log('No dark mode toggle found, skipping dark mode test');
    }
  });

  test('form field interactions visual test', async ({ page }) => {
    // If onboarding is visible, test form field states
    const hasOnboarding = await page.locator('text=Welcome to BizBuddy!').isVisible();
    
    if (hasOnboarding) {
      // Find first input field
      const firstInput = page.locator('input[type="text"], input[type="email"]').first();
      
      if (await firstInput.isVisible()) {
        // Normal state
        await expect(firstInput).toHaveScreenshot('input-normal.png');
        
        // Focused state
        await firstInput.focus();
        await expect(firstInput).toHaveScreenshot('input-focused.png');
        
        // With value
        await firstInput.fill('Test Value');
        await expect(firstInput).toHaveScreenshot('input-filled.png');
        
        // Error state (if we can trigger it)
        await firstInput.fill('');
        await firstInput.blur();
        await page.waitForTimeout(500); // Wait for validation
        
        const errorMessage = page.locator('.error, [role="alert"], .text-red-500').first();
        if (await errorMessage.isVisible()) {
          await expect(firstInput).toHaveScreenshot('input-error.png');
        }
      }
    }
  });
});

test.describe('Visual Regression - Error States', () => {
  test('404 page visual', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('404-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('offline state visual', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    try {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // Screenshot whatever error state is shown
      await expect(page).toHaveScreenshot('offline-state.png', {
        fullPage: true
      });
    } catch (error) {
      // Expected to fail, capture the error state
      await expect(page).toHaveScreenshot('offline-error.png', {
        fullPage: true
      });
    }
    
    // Go back online
    await context.setOffline(false);
  });
});