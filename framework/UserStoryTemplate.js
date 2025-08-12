/**
 * USER STORY TEST TEMPLATE
 * 
 * Copy this template to create new user story tests.
 * Replace all TODO comments with your specific test logic.
 * 
 * Example Usage:
 * 1. Copy this file to a new name (e.g., test-new-feature-story.js)
 * 2. Update the config section with your user story details
 * 3. Implement the test steps in runUserStory()
 * 4. Add validations for your expected outcomes
 * 5. Run with: node test-new-feature-story.js
 */

const BaseUserStoryTest = require('./framework/BaseUserStoryTest');

class MyUserStoryTest extends BaseUserStoryTest {
  constructor() {
    super({
      // TODO: Update with your user story details
      name: 'My User Story Name',
      description: 'As a [user type], I want to [action] so that [benefit]',
      
      // Optional: Override default configuration
      testUrl: 'http://localhost:8080',
      usePlaywright: true, // or false for Puppeteer
      
      // TODO: Define your ground truths / expected data
      groundTruths: {
        // Add your expected data here
        expectedText: 'Expected value',
        expectedElement: '#expected-selector',
        // ... more ground truths
      },
      
      // TODO: Define forbidden/mock data that should NOT appear
      forbiddenData: [
        'mock',
        'demo',
        'test data',
        // ... more forbidden terms
      ]
    });
  }

  /**
   * Main test implementation
   * This method is required and contains your user story test logic
   */
  async runUserStory() {
    // ============ STEP 1: SETUP ============
    await this.step1_Setup();
    
    // ============ STEP 2: MAIN FLOW ============
    await this.step2_MainFlow();
    
    // ============ STEP 3: VALIDATIONS ============
    await this.step3_Validations();
    
    // ============ STEP 4: EDGE CASES ============
    await this.step4_EdgeCases();
  }

  async step1_Setup() {
    console.log('\n📍 STEP 1: SETUP AND NAVIGATION');
    console.log('-' .repeat(40));
    
    // Navigate to the starting point
    await this.navigate();
    await this.waitFor(2000);
    
    // Capture initial state
    await this.captureScreenshot('01-initial-state');
    
    // TODO: Add your setup validations
    await this.validate(
      'Application loaded',
      await this.elementExists('body')
    );
  }

  async step2_MainFlow() {
    console.log('\n📍 STEP 2: MAIN USER FLOW');
    console.log('-' .repeat(40));
    
    // TODO: Implement your main user flow
    // Example:
    /*
    // Click a button
    if (await this.elementExists('#my-button')) {
      await this.click('#my-button');
      await this.waitFor(1000);
      await this.captureScreenshot('02-after-button-click');
    }
    
    // Fill a form
    if (await this.elementExists('#my-input')) {
      await this.type('#my-input', 'Test input');
      await this.captureScreenshot('03-form-filled');
    }
    
    // Validate expected behavior
    const pageText = await this.getPageText();
    await this.validate(
      'Expected text appears',
      pageText.includes(this.config.groundTruths.expectedText)
    );
    */
    
    // TODO: Replace with your actual test flow
    await this.validate('Main flow placeholder', true);
  }

  async step3_Validations() {
    console.log('\n📍 STEP 3: DATA VALIDATIONS');
    console.log('-' .repeat(40));
    
    const pageText = await this.getPageText();
    
    // TODO: Validate all ground truths
    for (const [key, value] of Object.entries(this.config.groundTruths || {})) {
      if (typeof value === 'string') {
        await this.validate(
          `Ground truth: ${key}`,
          pageText.includes(value)
        );
      }
    }
    
    // TODO: Validate no forbidden data appears
    for (const forbidden of this.config.forbiddenData || []) {
      await this.validateNotPresent(
        `No forbidden data: ${forbidden}`,
        forbidden
      );
    }
    
    await this.captureScreenshot('04-validations-complete');
  }

  async step4_EdgeCases() {
    console.log('\n📍 STEP 4: EDGE CASES (OPTIONAL)');
    console.log('-' .repeat(40));
    
    // TODO: Add edge case testing if needed
    // Examples:
    /*
    // Test error handling
    await this.navigate('/invalid-route');
    await this.captureScreenshot('05-404-page');
    
    // Test responsive design
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.captureScreenshot('06-mobile-view');
    
    // Test network errors
    await this.page.route('**/api/**', route => route.abort());
    await this.navigate();
    await this.captureScreenshot('07-network-error');
    */
    
    console.log('  ℹ️ No edge cases defined for this test');
  }

  // ============ OPTIONAL: CUSTOM HELPER METHODS ============
  
  /**
   * Add any custom helper methods specific to your user story
   */
  async customHelper() {
    // TODO: Implement custom logic if needed
  }
}

// ============ RUN THE TEST ============
if (require.main === module) {
  const test = new MyUserStoryTest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = MyUserStoryTest;