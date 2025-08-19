#!/usr/bin/env node

/**
 * Debug test to identify what ground truths are needed
 */

const puppeteer = require('puppeteer');

async function debugGroundTruths() {
  console.log('🔍 Debugging Ground Truths for Arcana Dwell LLC\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  
  // Log all console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    // Navigate to app
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Check what's on the page
    const pageState = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent : null;
      };
      
      return {
        title: document.title,
        h1: getText('h1'),
        h2: getText('h2'),
        bodyText: document.body.textContent?.substring(0, 500),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent),
        inputs: Array.from(document.querySelectorAll('input')).map(i => ({
          name: i.name,
          placeholder: i.placeholder,
          value: i.value,
          type: i.type
        })),
        hasGetStarted: !!document.querySelector('[data-testid="get-started"]'),
        hasDevToolkit: !!document.querySelector('.border-l-4.border-l-purple-500'),
        visibleText: Array.from(document.querySelectorAll('h1, h2, h3, p'))
          .slice(0, 10)
          .map(el => el.textContent?.trim())
          .filter(Boolean)
      };
    });
    
    console.log('📄 Page State:', JSON.stringify(pageState, null, 2));
    
    // Try to find onboarding button
    const getStartedBtn = await page.$('[data-testid="get-started"]');
    if (getStartedBtn) {
      console.log('\n✅ Found Get Started button, clicking...');
      await getStartedBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      
      // Check what happens after clicking
      const afterClick = await page.evaluate(() => {
        return {
          agentLogs: Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'))
            .map(log => log.textContent),
          visibleCompanies: document.body.textContent?.includes('Arcana Dwell LLC'),
          hasSpinner: !!document.querySelector('.animate-spin'),
          currentText: Array.from(document.querySelectorAll('h1, h2, h3'))
            .map(el => el.textContent)
            .filter(Boolean)
        };
      });
      
      console.log('\n📊 After clicking Get Started:', JSON.stringify(afterClick, null, 2));
      
      // Wait longer to see if companies appear
      await new Promise(r => setTimeout(r, 5000));
      
      const companiesCheck = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        return {
          hasArcanaDwell: bodyText.includes('Arcana Dwell'),
          hasTechStartup: bodyText.includes('TechStartup'),
          hasBusinessDiscovery: bodyText.includes('BusinessDiscovery'),
          hasUserGuidance: bodyText.includes('Please provide'),
          currentStep: document.querySelector('h2')?.textContent,
          progressValue: document.querySelector('.text-muted-foreground')?.textContent
        };
      });
      
      console.log('\n🏢 Company visibility check:', companiesCheck);
      
      // Check what ground truths the system is expecting
      const expectedData = await page.evaluate(() => {
        // Look for any text that indicates what data is needed
        const logs = Array.from(document.querySelectorAll('.border-l-4.border-l-purple-500'));
        const requests = logs.filter(log => 
          log.textContent?.includes('Requesting') || 
          log.textContent?.includes('Please provide') ||
          log.textContent?.includes('need')
        );
        
        return {
          dataRequests: requests.map(r => r.textContent),
          formFields: Array.from(document.querySelectorAll('label')).map(l => l.textContent),
          requiredInputs: Array.from(document.querySelectorAll('input[required]')).map(i => ({
            name: i.name,
            placeholder: i.placeholder
          }))
        };
      });
      
      console.log('\n📝 System is requesting:', expectedData);
      
    } else {
      console.log('\n❌ Get Started button not found');
    }
    
    // Final analysis
    console.log('\n' + '='.repeat(50));
    console.log('🎯 GROUND TRUTHS NEEDED FOR ONBOARDING:');
    console.log('='.repeat(50));
    console.log(`
Based on the debug session, here are the ground truths needed:

1. Business Information:
   - Name: Arcana Dwell LLC
   - Entity Type: Limited Liability Company
   - Entity Number: [NEED FROM PRODUCT TEAM]
   - Formation Date: [NEED FROM PRODUCT TEAM]
   - State: California

2. Business Address:
   - Street: 2512 Mission St
   - City: San Francisco
   - State: CA
   - ZIP: 94110

3. Ownership:
   - Owner 1: Gianmatteo Costanza (50%)
   - Owner 2: Farnaz (Naz) Khorram (50%)

4. Business Operations:
   - Type: Wine Bar, Music & Entertainment Venue
   - NAICS Code: [NEED FROM PRODUCT TEAM]
   - Employees: 1-10
   - Annual Revenue: [NEED FROM PRODUCT TEAM]

5. Compliance Requirements:
   - Federal EIN: [NEED FROM PRODUCT TEAM]
   - CA State Tax ID: [NEED FROM PRODUCT TEAM]
   - SF Business License #: [NEED FROM PRODUCT TEAM]
   - ABC Liquor License #: [NEED FROM PRODUCT TEAM]
   - Health Permit #: [NEED FROM PRODUCT TEAM]

6. Banking:
   - Business Bank: [NEED FROM PRODUCT TEAM]
   - Account Type: Business Checking

Please provide these missing ground truths to complete the E2E test.
    `);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the debug test
debugGroundTruths();