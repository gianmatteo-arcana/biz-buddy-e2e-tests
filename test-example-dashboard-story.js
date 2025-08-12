/**
 * EXAMPLE: Dashboard Analytics User Story Test
 * 
 * This is an example showing how to use the BaseUserStoryTest framework
 * for a new user story. This tests a hypothetical dashboard analytics feature.
 */

const BaseUserStoryTest = require('./framework/BaseUserStoryTest');

class DashboardAnalyticsStoryTest extends BaseUserStoryTest {
  constructor() {
    super({
      name: 'Dashboard Analytics Story',
      description: 'As a business owner, I want to view my business analytics dashboard so that I can track key metrics and make informed decisions',
      
      // Define what MUST appear (real data)
      groundTruths: {
        businessName: 'Arcana Dwell LLC',
        dashboardTitle: 'Business Analytics',
        revenueLabel: 'Annual Revenue',
        revenueValue: '$2M',
        customersLabel: 'Total Customers',
        complianceLabel: 'Compliance Status',
        ownerName: 'Gianmatteo Costanza'
      },
      
      // Define what must NOT appear (mock data)
      forbiddenData: [
        'mock',
        'demo',
        'test data',
        'Sarah Chen',
        'TechStartup',
        'Lorem ipsum',
        'placeholder'
      ]
    });
  }

  async runUserStory() {
    // Step 1: Navigate to dashboard
    await this.navigateToDashboard();
    
    // Step 2: Verify analytics section
    await this.verifyAnalyticsSection();
    
    // Step 3: Test interactive elements
    await this.testInteractiveElements();
    
    // Step 4: Validate all data
    await this.validateAllGroundTruths();
  }

  async navigateToDashboard() {
    console.log('\n📍 STEP 1: NAVIGATE TO DASHBOARD');
    console.log('-' .repeat(40));
    
    // Go to main page
    await this.navigate();
    await this.waitFor(2000);
    await this.captureScreenshot('01-home-page');
    
    // Look for dashboard link/button
    if (await this.elementExists('[data-testid="dashboard-link"]')) {
      await this.click('[data-testid="dashboard-link"]');
      await this.waitFor(2000);
      await this.captureScreenshot('02-dashboard-loading');
    } else if (await this.elementExists('a[href="/dashboard"]')) {
      await this.click('a[href="/dashboard"]');
      await this.waitFor(2000);
      await this.captureScreenshot('02-dashboard-loading');
    } else {
      // If no dashboard link, we might already be there
      console.log('  ℹ️ No dashboard link found, checking if already on dashboard');
    }
    
    // Verify we're on the dashboard
    const pageText = await this.getPageText();
    await this.validate(
      'Dashboard page loaded',
      pageText.includes('Dashboard') || pageText.includes('Analytics')
    );
  }

  async verifyAnalyticsSection() {
    console.log('\n📍 STEP 2: VERIFY ANALYTICS SECTION');
    console.log('-' .repeat(40));
    
    await this.captureScreenshot('03-dashboard-view');
    
    const pageText = await this.getPageText();
    
    // Check for business name
    await this.validate(
      'Business name displayed',
      pageText.includes(this.config.groundTruths.businessName)
    );
    
    // Check for analytics title
    await this.validate(
      'Analytics section visible',
      pageText.includes(this.config.groundTruths.dashboardTitle) ||
      pageText.includes('Analytics') ||
      pageText.includes('Metrics')
    );
    
    // Check for revenue display
    await this.validate(
      'Revenue metrics shown',
      pageText.includes(this.config.groundTruths.revenueLabel) ||
      pageText.includes('Revenue')
    );
    
    // Check for actual revenue value
    await this.validate(
      'Revenue value displayed',
      pageText.includes(this.config.groundTruths.revenueValue)
    );
  }

  async testInteractiveElements() {
    console.log('\n📍 STEP 3: TEST INTERACTIVE ELEMENTS');
    console.log('-' .repeat(40));
    
    // Test date range selector if present
    if (await this.elementExists('[data-testid="date-range"]')) {
      await this.click('[data-testid="date-range"]');
      await this.waitFor(1000);
      await this.captureScreenshot('04-date-range-open');
    }
    
    // Test metric cards if present
    const metricCards = await this.page.$$('.metric-card, [class*="metric"]');
    if (metricCards.length > 0) {
      console.log(`  Found ${metricCards.length} metric cards`);
      await this.captureScreenshot('05-metric-cards');
      
      // Click first metric card if clickable
      if (metricCards[0]) {
        await metricCards[0].hover();
        await this.captureScreenshot('06-metric-hover');
      }
    }
    
    // Test chart interactions if present
    if (await this.elementExists('canvas, svg.chart, [class*="chart"]')) {
      console.log('  📊 Charts detected');
      await this.captureScreenshot('07-charts-view');
    }
  }

  async validateAllGroundTruths() {
    console.log('\n📍 STEP 4: VALIDATE ALL GROUND TRUTHS');
    console.log('-' .repeat(40));
    
    const pageText = await this.getPageText();
    
    // Validate all ground truths are present
    for (const [key, value] of Object.entries(this.config.groundTruths)) {
      if (typeof value === 'string' && value.length > 2) {
        const isPresent = pageText.includes(value) || 
                          pageText.toLowerCase().includes(value.toLowerCase());
        
        await this.validate(
          `Ground truth present: ${key}`,
          isPresent,
          isPresent ? null : `Expected "${value}" not found`
        );
      }
    }
    
    // Validate no forbidden data appears
    for (const forbidden of this.config.forbiddenData) {
      await this.validateNotPresent(
        `No mock data: "${forbidden}"`,
        forbidden
      );
    }
    
    await this.captureScreenshot('08-validation-complete');
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new DashboardAnalyticsStoryTest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = DashboardAnalyticsStoryTest;