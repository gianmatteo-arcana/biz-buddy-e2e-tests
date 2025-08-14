const { chromium } = require('playwright');

async function testAuthAndDevToolkit() {
  console.log('🔍 Testing Authentication and Dev Toolkit Visibility');

  const browser = await chromium.launch({ headless: false });
  
  try {
    // First try without auth state
    console.log('\n1. Testing without auth state...');
    let context = await browser.newContext();
    let page = await context.newPage();
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForTimeout(2000);
    
    const loginVisible = await page.$('text=Sign in with Google') !== null;
    console.log('   Login page visible:', loginVisible);
    
    await context.close();

    // Now try with auth state
    console.log('\n2. Testing with stored auth state...');
    context = await browser.newContext({
      storageState: '.auth/user-state.json'
    });
    page = await context.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Authenticated')) {
        console.log('   🎯 Auth status:', msg.text());
      }
    });
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForTimeout(3000);
    
    // Check for auth indicators
    const userVisible = await page.evaluate(() => {
      const text = document.body.textContent;
      return {
        hasUserGreeting: text.includes('Welcome') || text.includes('Hello'),
        hasDashboard: text.includes('Dashboard') || text.includes('Tasks'),
        hasDevToolkit: !!document.querySelector('[data-testid="dev-toolkit"]'),
        hasMigrationBadge: !!document.querySelector('[data-testid="migration-badge"]'),
        hasError: text.includes('Error') || text.includes('Failed')
      };
    });
    
    console.log('   Auth indicators:', userVisible);
    
    // Look for dev mode elements more broadly
    const devElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => el.textContent?.includes('migration') || el.textContent?.includes('dev'))
        .slice(0, 5)
        .map(el => ({
          tag: el.tagName,
          text: el.textContent?.substring(0, 50),
          testId: el.getAttribute('data-testid')
        }));
    });
    
    if (devElements.length > 0) {
      console.log('   Dev-related elements found:');
      devElements.forEach(el => console.log(`     ${el.tag}: ${el.text} (${el.testId || 'no testid'})`));
    } else {
      console.log('   No dev-related elements found');
    }
    
    // Take a screenshot
    await page.screenshot({
      path: 'demo-screenshots/issue-19/auth-and-dev-toolkit-test.png',
      fullPage: true
    });
    console.log('   Screenshot saved');
    
    await context.close();
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testAuthAndDevToolkit();