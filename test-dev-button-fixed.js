const { chromium } = require('playwright');

async function testDevButton() {
  console.log('🔍 Testing Purple Dev Button');
  console.log('=' .repeat(40));

  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({
      path: 'demo-screenshots/issue-19/01-before-dev-button.png',
      fullPage: true
    });
    console.log('📸 Initial screenshot taken');
    
    // Look for the purple button more carefully
    const purpleButtonFound = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const candidates = elements.filter(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const className = el.className || '';
        const id = el.id || '';
        
        return (
          // Check if it's positioned in bottom right
          (rect.right > window.innerWidth - 100 && rect.bottom > window.innerHeight - 100) ||
          // Check if it has purple/violet color
          style.backgroundColor.includes('139, 92, 246') || // violet-500
          style.backgroundColor.includes('124, 58, 237') || // violet-600  
          style.backgroundColor.includes('purple') ||
          // Check for common dev toolkit classes/ids
          (typeof className === 'string' && className.includes('dev')) ||
          (typeof className === 'string' && className.includes('toolkit')) ||
          (typeof id === 'string' && id.includes('dev'))
        );
      });
      
      return candidates.map(el => ({
        tagName: el.tagName,
        className: el.className || '',
        id: el.id || '',
        rect: {
          x: el.getBoundingClientRect().x,
          y: el.getBoundingClientRect().y,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
          right: el.getBoundingClientRect().right,
          bottom: el.getBoundingClientRect().bottom
        },
        backgroundColor: window.getComputedStyle(el).backgroundColor,
        text: (el.textContent || '').substring(0, 50)
      }));
    });
    
    console.log('🎯 Purple button candidates found:', purpleButtonFound.length);
    purpleButtonFound.forEach((btn, i) => {
      console.log(`  ${i + 1}. ${btn.tagName} (${btn.className}) - "${btn.text}"`);
      console.log(`     Position: ${Math.round(btn.rect.right)}x${Math.round(btn.rect.bottom)}`);
      console.log(`     Color: ${btn.backgroundColor}`);
    });
    
    // Try to click elements in bottom right corner
    console.log('🖱️ Looking for clickable elements in bottom right...');
    const bottomRightElements = await page.$$('*');
    let foundBottomRightElement = false;
    
    for (const element of bottomRightElements) {
      try {
        const rect = await element.boundingBox();
        if (rect && rect.x + rect.width > 1800 && rect.y + rect.height > 700) {
          const tagName = await element.evaluate(el => el.tagName);
          const className = await element.evaluate(el => el.className || '');
          const text = await element.evaluate(el => (el.textContent || '').substring(0, 30));
          
          console.log(`  Found bottom-right element: ${tagName} (${className}) - "${text}"`);
          
          if (rect.width > 5 && rect.height > 5) { // Not tiny
            console.log(`  🎯 Clicking element at ${Math.round(rect.x)}, ${Math.round(rect.y)}`);
            await element.click();
            foundBottomRightElement = true;
            break;
          }
        }
      } catch (error) {
        // Element might not be clickable, continue
      }
    }
    
    if (!foundBottomRightElement) {
      console.log('  No suitable bottom-right elements found, trying generic purple button');
      
      // Try to find any button that might be the dev toolkit
      const devButtons = await page.$$('button, div[role="button"], [data-testid*="dev"]');
      for (const button of devButtons) {
        try {
          const text = await button.evaluate(el => (el.textContent || '').toLowerCase());
          const className = await button.evaluate(el => el.className || '');
          
          if (text.includes('dev') || className.includes('dev') || className.includes('purple') || className.includes('violet')) {
            console.log(`  🎯 Clicking potential dev button: ${text} (${className})`);
            await button.click();
            foundBottomRightElement = true;
            break;
          }
        } catch (error) {
          // Continue to next button
        }
      }
    }
    
    // Wait for any response to the click
    await page.waitForTimeout(2000);
    
    // Take screenshot after click
    await page.screenshot({
      path: 'demo-screenshots/issue-19/02-after-dev-button-click.png',
      fullPage: true
    });
    console.log('📸 After-click screenshot taken');
    
    // Check if anything changed
    const afterClickState = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return {
        hasDevToolkit: !!document.querySelector('[data-testid="dev-toolkit"]'),
        hasMigrationStuff: text.includes('migration') || text.includes('Migration'),
        hasPendingBadge: text.includes('pending') || text.includes('Pending'),
        hasDevText: text.toLowerCase().includes('dev'),
        textLength: text.length
      };
    });
    
    console.log('📊 After click state:', afterClickState);
    
    if (afterClickState.hasDevToolkit || afterClickState.hasMigrationStuff) {
      console.log('✅ Dev toolkit or migration UI appeared!');
    } else if (!foundBottomRightElement) {
      console.log('⚠️ No dev button found to click');
    } else {
      console.log('❌ Dev button clicked but no dev UI appeared');
    }
    
    await context.close();
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testDevButton();