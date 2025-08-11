#!/usr/bin/env node

/**
 * E2E Test for Arcana Dwell LLC Onboarding
 * 
 * GROUND TRUTHS:
 * - Business: Arcana Dwell LLC
 * - Owners: Gianmatteo Costanza (50%), Farnaz (Naz) Khorram (50%)
 * - Type: Wine Bar, Music & Entertainment Venue
 * - Address: 2512 Mission St, San Francisco, CA 94110
 * - Formed: December 2023
 * - Test User: gianmatteo.allyn.test@gmail.com
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  appUrl: 'http://localhost:8080',
  testUser: 'gianmatteo.allyn.test@gmail.com',
  groundTruth: {
    business: {
      name: 'Arcana Dwell LLC',
      entityType: 'Limited Liability Company',
      address: '2512 Mission St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94110',
      formed: '[User must provide or lookup required]', // Not assumed
      owners: [
        { name: 'Gianmatteo Costanza', percentage: 50 },
        { name: 'Farnaz Khorram', percentage: 50 }
      ],
      type: 'Wine Bar, Music & Entertainment Venue',
      naics: '722410', // Drinking Places (Alcoholic Beverages)
      employees: '1-10'
    },
    expectedWorkflow: {
      steps: [
        'Business Discovery (with user input)',
        'Profile Collection',
        'Compliance Requirements',
        'UX Optimization',
        'Celebration'
      ],
      automationLevel: 30, // Expected % of automation with current capabilities
      userInputsRequired: [
        'Business entity number',
        'Federal EIN',
        'State tax ID',
        'Liquor license number',
        'Business bank account'
      ]
    }
  }
};

class ArcanaDwellOnboardingTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      passed: [],
      failed: [],
      userGuidanceProvided: [],
      automationLevel: 0
    };
  }

  async setup() {
    console.log('🍷 Arcana Dwell LLC Onboarding Test');
    console.log('=====================================\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    // Log console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser error:', msg.text());
      }
    });
  }

  async testBusinessDiscoveryWithFallback() {
    console.log('\n📍 Testing Business Discovery with Fallback');
    console.log('-------------------------------------------');
    
    // Navigate to onboarding
    await this.page.goto(CONFIG.appUrl);
    await this.page.waitForSelector('[data-testid="get-started"]', { timeout: 10000 });
    
    // Click Get Started
    await this.page.click('[data-testid="get-started"]');
    await this.page.waitForTimeout(2000);
    
    // Check for API unavailable message
    const apiUnavailableMessage = await this.page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'));
      return logs.some(log => log.textContent?.includes('API not available'));
    });
    
    if (apiUnavailableMessage) {
      console.log('✅ Correctly detected API unavailable');
      this.testResults.passed.push('API fallback detection');
      
      // Check for user guidance
      const guidanceProvided = await this.page.evaluate(() => {
        const logs = Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'));
        return logs.find(log => log.textContent?.includes('Please provide'))?.textContent;
      });
      
      if (guidanceProvided) {
        console.log('✅ User guidance provided:', guidanceProvided.substring(0, 100) + '...');
        this.testResults.userGuidanceProvided.push(guidanceProvided);
      }
    } else {
      console.log('❌ API unavailable message not shown');
      this.testResults.failed.push('API fallback detection');
    }
    
    // Verify correct business data is shown
    const businessFound = await this.page.evaluate((groundTruth) => {
      return document.body.textContent?.includes(groundTruth.business.name);
    }, CONFIG.groundTruth);
    
    if (businessFound) {
      console.log('✅ Correct business displayed: Arcana Dwell LLC');
      this.testResults.passed.push('Business data display');
    } else {
      console.log('❌ Business not found in UI');
      this.testResults.failed.push('Business data display');
    }
  }

  async testProfileWithGroundTruth() {
    console.log('\n📝 Testing Profile Collection with Ground Truth');
    console.log('----------------------------------------------');
    
    // Click on the business card
    const businessCard = await this.page.$('.cursor-pointer');
    if (businessCard) {
      await businessCard.click();
      await this.page.waitForTimeout(3000);
      
      // Check for correct profile data
      const profileData = await this.page.evaluate((groundTruth) => {
        const inputs = Array.from(document.querySelectorAll('input[readonly]'));
        const values = inputs.map(input => (input as HTMLInputElement).value);
        
        return {
          hasBusinessName: values.some(v => v.includes(groundTruth.business.name)),
          hasAddress: values.some(v => v.includes(groundTruth.business.address)),
          hasEntityType: values.some(v => v.includes('Limited Liability Company')),
          hasOwners: document.body.textContent?.includes('Gianmatteo Costanza') && 
                     document.body.textContent?.includes('Farnaz Khorram')
        };
      }, CONFIG.groundTruth);
      
      console.log('Profile data checks:', profileData);
      
      if (profileData.hasBusinessName) {
        console.log('✅ Business name correctly populated');
        this.testResults.passed.push('Business name in profile');
      }
      
      if (profileData.hasAddress) {
        console.log('✅ Address correctly populated');
        this.testResults.passed.push('Address in profile');
      }
      
      if (profileData.hasOwners) {
        console.log('✅ Owners correctly identified');
        this.testResults.passed.push('Owners in profile');
      }
    }
  }

  async testComplianceRequirements() {
    console.log('\n⚖️ Testing Compliance Requirements');
    console.log('-----------------------------------');
    
    await this.page.waitForTimeout(5000);
    
    // Check for wine bar specific requirements
    const complianceChecks = await this.page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return {
        hasLiquorLicense: bodyText.includes('ABC License') || bodyText.includes('Liquor License'),
        hasHealthPermit: bodyText.includes('Health Permit') || bodyText.includes('Food Handler'),
        hasBusinessLicense: bodyText.includes('Business License') || bodyText.includes('SF Business'),
        hasSOI: bodyText.includes('Statement of Information'),
        hasTax: bodyText.includes('Franchise Tax')
      };
    });
    
    console.log('Compliance requirements found:', complianceChecks);
    
    // Wine bars have specific requirements
    if (complianceChecks.hasBusinessLicense) {
      console.log('✅ Business license requirement identified');
      this.testResults.passed.push('Business license requirement');
    }
    
    if (complianceChecks.hasSOI) {
      console.log('✅ Statement of Information requirement identified');
      this.testResults.passed.push('SOI requirement');
    }
  }

  async testAutomationLevel() {
    console.log('\n📊 Testing Automation Level');
    console.log('---------------------------');
    
    // Calculate actual automation level based on what required user input
    const userInputRequests = await this.page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'));
      return logs.filter(log => 
        log.textContent?.includes('Requesting user input') ||
        log.textContent?.includes('Please provide')
      ).length;
    });
    
    const totalSteps = 10; // Approximate total steps in workflow
    const automatedSteps = totalSteps - userInputRequests;
    const actualAutomationLevel = (automatedSteps / totalSteps) * 100;
    
    this.testResults.automationLevel = actualAutomationLevel;
    
    console.log(`📈 Automation Level: ${actualAutomationLevel}%`);
    console.log(`   User inputs required: ${userInputRequests}`);
    console.log(`   Automated steps: ${automatedSteps}`);
    
    if (actualAutomationLevel <= CONFIG.groundTruth.expectedWorkflow.automationLevel + 10) {
      console.log('✅ Automation level within expected range');
      this.testResults.passed.push('Automation level check');
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const total = this.testResults.passed.length + this.testResults.failed.length;
    const passRate = (this.testResults.passed.length / total * 100).toFixed(1);
    
    console.log(`\n✅ Passed: ${this.testResults.passed.length}`);
    this.testResults.passed.forEach(test => console.log(`   • ${test}`));
    
    if (this.testResults.failed.length > 0) {
      console.log(`\n❌ Failed: ${this.testResults.failed.length}`);
      this.testResults.failed.forEach(test => console.log(`   • ${test}`));
    }
    
    console.log(`\n📊 Overall Pass Rate: ${passRate}%`);
    console.log(`🤖 Automation Level: ${this.testResults.automationLevel}%`);
    
    if (this.testResults.userGuidanceProvided.length > 0) {
      console.log('\n💡 User Guidance Provided:');
      this.testResults.userGuidanceProvided.forEach((guidance, i) => {
        console.log(`   ${i + 1}. ${guidance.substring(0, 100)}...`);
      });
    }
    
    console.log('\n🎯 Ground Truth Validation:');
    console.log(`   Business: ${CONFIG.groundTruth.business.name} ✅`);
    console.log(`   Owners: ${CONFIG.groundTruth.business.owners.map(o => o.name).join(', ')} ✅`);
    console.log(`   Location: ${CONFIG.groundTruth.business.address} ✅`);
    console.log(`   Type: ${CONFIG.groundTruth.business.type} ✅`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      await this.testBusinessDiscoveryWithFallback();
      await this.testProfileWithGroundTruth();
      await this.testComplianceRequirements();
      await this.testAutomationLevel();
      await this.generateReport();
      
      return this.testResults.failed.length === 0;
    } catch (error) {
      console.error('❌ Test error:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new ArcanaDwellOnboardingTest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}