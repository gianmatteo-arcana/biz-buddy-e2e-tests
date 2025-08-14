const { chromium } = require('playwright');

async function testAppState() {
  console.log('🔍 Testing App State');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    // Test 1: Try with saved auth state
    console.log('\n1️⃣ Testing with saved auth state...');
    let context = await browser.newContext({
      storageState: '.auth/user-state.json',
      viewport: { width: 1920, height: 1080 }
    });
    let page = await context.newPage();
    
    // Enable detailed console logging
    page.on('console', msg => {
      console.log(`  Console [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`  Page error: ${error.message}`);
    });
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    
    // Wait and check multiple times
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(3000);
      
      const state = await page.evaluate(() => {
        const root = document.getElementById('root');
        const body = document.body;
        
        return {
          attempt: i,
          rootExists: !!root,
          rootHasContent: root ? root.innerHTML.length : 0,
          rootVisible: root ? window.getComputedStyle(root).display !== 'none' : false,
          bodyHasContent: body ? body.innerHTML.length : 0,
          bodyText: (body?.textContent || '').substring(0, 200),
          hasReactRoot: !!document.querySelector('#root'),
          reactFiberExists: !!(root && root._reactRootContainer),
          url: window.location.href
        };
      });
      
      console.log(`\n  Attempt ${i + 1}:`, state);
      
      if (state.rootHasContent > 100) {
        console.log('  ✅ App loaded!');
        
        // Take screenshot
        await page.screenshot({
          path: `demo-screenshots/issue-19/app-loaded-${i}.png`,
          fullPage: true
        });
        
        // Check for Dev Toolkit
        const devToolkitCheck = await page.evaluate(() => {
          const text = document.body?.textContent || '';
          const elements = Array.from(document.querySelectorAll('*'));
          const devElements = elements.filter(el => {
            const className = (el.className || '').toString();
            const id = el.id || '';
            const testId = el.getAttribute('data-testid') || '';
            return className.includes('dev') || id.includes('dev') || testId.includes('dev');
          });
          
          return {
            hasDevText: text.toLowerCase().includes('dev'),
            hasMigrationText: text.includes('migration'),
            devElementCount: devElements.length,
            devElements: devElements.slice(0, 5).map(el => ({
              tag: el.tagName,
              class: (el.className || '').toString().substring(0, 50),
              id: el.id
            }))
          };
        });
        
        console.log('\n  Dev Toolkit check:', devToolkitCheck);
        break;
      }
    }
    
    await context.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testAppState().catch(console.error);