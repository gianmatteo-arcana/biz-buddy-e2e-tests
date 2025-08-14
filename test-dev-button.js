const { chromium } = require('playwright');

async function testDevButton() {
  console.log('🔍 Testing Purple Dev Button');
  console.log('=' .repeat(40));

  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(`  Browser: ${msg.text()}`);
      }
    });
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({
      path: 'demo-screenshots/issue-19/01-before-dev-button.png',
      fullPage: true
    });
    console.log('📸 Initial screenshot taken');
    
    // Look for the purple button (it's in bottom right corner)
    const purpleButtonFound = await page.evaluate(() => {
      // Look for elements in bottom right that might be the dev button
      const elements = Array.from(document.querySelectorAll('*'));
      const candidates = elements.filter(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        return (
          // Check if it's positioned in bottom right
          (rect.right > window.innerWidth - 100 && rect.bottom > window.innerHeight - 100) ||
          // Check if it has purple/violet color
          style.backgroundColor.includes('rgb(139, 92, 246)') || // violet-500
          style.backgroundColor.includes('rgb(124, 58, 237)') || // violet-600  
          style.backgroundColor.includes('purple') ||
          // Check for common dev toolkit classes/ids
          el.className.includes('dev') ||
          el.className.includes('toolkit') ||
          el.id.includes('dev')
        );
      });
      
      return candidates.map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        rect: el.getBoundingClientRect(),
        backgroundColor: window.getComputedStyle(el).backgroundColor,
        text: el.textContent?.substring(0, 50)
      }));
    });
    
    console.log('🎯 Purple button candidates found:', purpleButtonFound.length);
    purpleButtonFound.forEach((btn, i) => {
      console.log(`  ${i + 1}. ${btn.tagName} (${btn.className}) - ${btn.text}`);
      console.log(`     Position: ${Math.round(btn.rect.right)}x${Math.round(btn.rect.bottom)}`);
      console.log(`     Color: ${btn.backgroundColor}`);
    });
    
    // Try to click the purple button (likely in bottom right)
    const purpleButtonClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const bottomRightElements = elements.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.right > window.innerWidth - 100 && 
               rect.bottom > window.innerHeight - 100 &&
               rect.width > 10 && rect.height > 10; // Not tiny elements
      });
      
      // Click the most likely candidate
      if (bottomRightElements.length > 0) {
        const target = bottomRightElements[0];
        target.click();
        return {
          clicked: true,
          element: {
            tag: target.tagName,
            class: target.className,
            id: target.id
          }
        };
      }
      return { clicked: false };
    });
    
    console.log('🖱️ Purple button click result:', purpleButtonClicked);
    
    // Wait for any response to the click
    await page.waitForTimeout(2000);
    
    // Take screenshot after click
    await page.screenshot({
      path: 'demo-screenshots/issue-19/02-after-dev-button-click.png',
      fullPage: true
    });
    console.log('📸 After-click screenshot taken');
    
    // Check if anything changed (dev toolkit appeared, etc.)
    const afterClickState = await page.evaluate(() => {
      const text = document.body.textContent;
      return {
        hasDevToolkit: !!document.querySelector('[data-testid="dev-toolkit"]'),
        hasMigrationStuff: text.includes('migration') || text.includes('Migration'),
        hasPendingBadge: text.includes('pending') || text.includes('Pending'),
        hasNewElements: text.length // Basic change detection
      };
    });
    
    console.log('📊 After click state:', afterClickState);
    
    // If no dev toolkit appeared, try looking for any modals or popups
    const modalsOrPopups = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return (
            style.position === 'fixed' ||
            style.position === 'absolute' ||
            style.zIndex > 1000 ||
            el.role === 'dialog' ||
            el.className.includes('modal') ||
            el.className.includes('popup') ||
            el.className.includes('dropdown')
          );
        })
        .slice(0, 5) // Limit results
        .map(el => ({
          tag: el.tagName,
          class: el.className,
          text: el.textContent?.substring(0, 100),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }));
    });
    
    if (modalsOrPopups.length > 0) {
      console.log('🎭 Modals/popups found:');
      modalsOrPopups.forEach((modal, i) => {
        if (modal.visible) {
          console.log(`  ${i + 1}. ${modal.tag} (${modal.class}) - ${modal.text}`);
        }
      });
    }
    
    await context.close();
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testDevButton();