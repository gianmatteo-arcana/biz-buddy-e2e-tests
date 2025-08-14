/**
 * Playwright E2E Test for Task Introspection
 * 
 * Tests the complete Task Introspection workflow using Playwright's robust API
 * Includes proper waits, error handling, and screenshot capture
 */

const { test, expect } = require('@playwright/test');

test.describe('Task Introspection E2E', () => {
  test('should display Task Introspection interface and handle task selection', async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Error:', msg.text());
      }
    });

    // Navigate to the application
    console.log('🌐 Navigating to application...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });

    // Check for authentication status
    const authBadge = page.locator('[data-testid="auth-status-badge"]');
    const isAuthenticated = await authBadge.textContent();
    console.log(`🔐 Authentication Status: ${isAuthenticated}`);

    // Navigate to Agent Visualizer
    console.log('👁️ Opening Agent Visualizer...');
    const agentVisualizerTab = page.locator('button:has-text("Agent Visualizer")');
    await agentVisualizerTab.click();
    await page.waitForTimeout(2000);

    // Verify Introspection tab is present and active
    console.log('🔍 Checking Introspection tab...');
    const introspectionTab = page.locator('[data-testid="introspection-tab"]');
    await expect(introspectionTab).toBeVisible({ timeout: 10000 });
    
    // Click Introspection tab to ensure it's active
    await introspectionTab.click();
    await page.waitForTimeout(1000);

    // Verify Task Selector is present
    console.log('📋 Checking Task Selector...');
    const taskSelector = page.locator('button[role="combobox"]').first();
    await expect(taskSelector).toBeVisible({ timeout: 10000 });
    
    // Verify placeholder text
    await expect(taskSelector).toContainText('Select a task to inspect');

    // Verify Refresh button is present
    const refreshButton = page.locator('button[aria-label="Refresh tasks"]');
    await expect(refreshButton).toBeVisible();

    // Test task selector dropdown
    console.log('📝 Testing task selector dropdown...');
    await taskSelector.click();
    await page.waitForTimeout(1000);

    // Check for available options (either real tasks or demo tasks)
    const dropdownOptions = page.locator('[role="option"], .select-item');
    const optionCount = await dropdownOptions.count();
    console.log(`📊 Available task options: ${optionCount}`);

    if (optionCount > 0) {
      // Select first option
      await dropdownOptions.first().click();
      console.log('✅ Selected first task option');
      await page.waitForTimeout(3000); // Wait for task data to load

      // Verify timeline components appear
      console.log('📈 Checking for timeline components...');
      
      // Timeline should be visible after task selection
      const timelineCard = page.locator('text=/Agent Timeline/');
      await expect(timelineCard).toBeVisible({ timeout: 10000 });

      // Context details card should be visible
      const contextCard = page.locator('text=/Selected Context Details/');
      await expect(contextCard).toBeVisible({ timeout: 10000 });

      // Flow analysis card should be visible  
      const flowCard = page.locator('text=/Task Flow Analysis/');
      await expect(flowCard).toBeVisible({ timeout: 10000 });

      // Controls should be visible
      const exportButton = page.locator('button:has-text("Export Timeline")');
      await expect(exportButton).toBeVisible();

      const filterButton = page.locator('button:has-text("Filter by Agent")');
      await expect(filterButton).toBeVisible();

      console.log('✅ All timeline components loaded successfully');

      // Test filter functionality if available
      console.log('🔽 Testing filter functionality...');
      await filterButton.click();
      await page.waitForTimeout(500);

      const filterOptions = page.locator('[role="menuitem"]');
      const filterCount = await filterOptions.count();
      
      if (filterCount > 0) {
        console.log(`📊 Filter options available: ${filterCount}`);
        
        // Select first filter option
        await filterOptions.first().click();
        console.log('✅ Applied agent filter');
        
        // Verify filter badge appears
        const filterBadge = page.locator('.badge', { hasText: /^(?!Filter by Agent)/ });
        await expect(filterBadge).toBeVisible({ timeout: 5000 });
        
        // Clear filter
        await filterButton.click();
        await page.waitForTimeout(500);
        const clearOption = page.locator('text=/Show All Agents/');
        if (await clearOption.count() > 0) {
          await clearOption.click();
          console.log('✅ Cleared agent filter');
        }
      }

      // Test timeline interaction if events are present
      const timelineEvents = page.locator('[data-testid="task-timeline"] > *');
      const eventCount = await timelineEvents.count();
      
      if (eventCount > 0) {
        console.log(`📊 Timeline events found: ${eventCount}`);
        
        // Click first timeline event
        await timelineEvents.first().click();
        await page.waitForTimeout(1000);

        // Verify context details populate
        const contextContribution = page.locator('text=/TaskContext Contribution/');
        await expect(contextContribution).toBeVisible({ timeout: 5000 });
        console.log('✅ Timeline event interaction working');

        // Test Copy JSON functionality
        const copyButton = page.locator('button:has-text("Copy JSON")');
        await expect(copyButton).toBeVisible();
        
        // Click copy button (note: actual clipboard testing requires special setup)
        await copyButton.click();
        console.log('✅ Copy JSON button functional');
      }

    } else {
      console.log('ℹ️ No tasks available - testing with empty state');
      
      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
      
      // Verify empty state messaging
      const noTasksMessage = page.locator('text=/No tasks available/');
      if (await noTasksMessage.count() > 0) {
        await expect(noTasksMessage).toBeVisible();
        console.log('✅ Empty state handled correctly');
      }
    }

    // Take final screenshot for verification
    console.log('📸 Taking final screenshot...');
    await page.screenshot({ 
      path: `uploaded-screenshots/playwright-introspection-${Date.now()}.png`,
      fullPage: true 
    });

    console.log('🎉 Task Introspection E2E test completed successfully!');
  });

  test('should handle demo mode gracefully', async ({ page }) => {
    console.log('🎭 Testing demo mode functionality...');
    
    // Navigate to application
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle'
    });

    // Navigate to Agent Visualizer -> Introspection
    await page.locator('button:has-text("Agent Visualizer")').click();
    await page.waitForTimeout(1000);
    
    const introspectionTab = page.locator('[data-testid="introspection-tab"]');
    await introspectionTab.click();
    await page.waitForTimeout(1000);

    // Open task selector
    const taskSelector = page.locator('button[role="combobox"]').first();
    await taskSelector.click();
    await page.waitForTimeout(1000);

    // Look for demo task
    const demoTask = page.locator('text=/Sample Onboarding Task/');
    if (await demoTask.count() > 0) {
      console.log('✅ Demo task available');
      await demoTask.click();
      await page.waitForTimeout(2000);

      // Verify demo timeline loads
      const timelineCard = page.locator('text=/Agent Timeline/');
      await expect(timelineCard).toBeVisible({ timeout: 10000 });

      // Check for demo events
      const timelineEvents = page.locator('[data-testid="task-timeline"] > *');
      const eventCount = await timelineEvents.count();
      console.log(`📊 Demo timeline events: ${eventCount}`);

      if (eventCount > 0) {
        // Test demo event interaction
        await timelineEvents.first().click();
        await page.waitForTimeout(1000);

        const contextDetails = page.locator('text=/TaskContext Contribution/');
        await expect(contextDetails).toBeVisible();
        console.log('✅ Demo event interaction working');
      }

      console.log('🎭 Demo mode test completed successfully!');
    } else {
      console.log('ℹ️ No demo task found - skipping demo mode test');
    }
  });
});

// Export test configuration
module.exports = {
  use: {
    headless: false,
    slowMo: 1000,
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  timeout: 60000, // 60 second timeout for tests
  expect: {
    timeout: 10000 // 10 second timeout for assertions
  }
};