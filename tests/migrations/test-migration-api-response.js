const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Test to capture migration API response and check UI updates
 */
async function testMigrationAPIResponse() {
  console.log('🔧 Testing Migration API Response\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Track migration API responses
  const migrationResponses = [];
  let capturedMigrationState = null;
  
  // Intercept responses
  page.on('response', async response => {
    if (response.url().includes('check-pending-migrations')) {
      const status = response.status();
      let responseData = null;
      
      try {
        responseData = await response.json();
      } catch (_e) {
        responseData = await response.text();
      }
      
      migrationResponses.push({
        url: response.url(),
        status,
        ok: response.ok(),
        data: responseData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`\n📡 Migration API Response:`, {
        status,
        data: responseData
      });
    }
  });
  
  // Enhanced console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Migration') || text.includes('migration') || text.includes('pending')) {
      console.log(`[Console] ${text}`);
      
      // Capture migration state from console
      if (text.includes('Migration state changed:')) {
        try {
          const stateMatch = text.match(/Migration state changed: ({.*})/);
          if (stateMatch) {
            capturedMigrationState = JSON.parse(stateMatch[1]);
          }
        } catch (_e) {}
      }
      
      // Capture response data
      if (text.includes('Migration Response:')) {
        try {
          const responseMatch = text.match(/Migration Response: ({.*})/);
          if (responseMatch) {
            const response = JSON.parse(responseMatch[1]);
            console.log('\n✅ Captured Migration Response:', response);
          }
        } catch (_e) {}
      }
    }
  });
  
  try {
    console.log('📍 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for migration check to complete
    console.log('\n⏳ Waiting for migration check to complete...');
    await page.waitForTimeout(10000); // Give it more time
    
    // Check if we got any migration responses
    if (migrationResponses.length > 0) {
      console.log(`\n📊 Total Migration API Calls: ${migrationResponses.length}`);
      migrationResponses.forEach((resp, i) => {
        console.log(`\nCall ${i + 1}:`, {
          status: resp.status,
          ok: resp.ok,
          data: resp.data
        });
      });
    }
    
    // Check UI state after API responses
    const uiState = await page.evaluate(() => {
      // Look for migration-related UI elements
      const elements = {
        buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          visible: btn.offsetParent !== null,
          testId: btn.getAttribute('data-testid')
        })).filter(btn => btn.text),
        
        badges: Array.from(document.querySelectorAll('[data-testid*="badge"], .badge, [class*="badge"]')).map(el => ({
          text: el.textContent?.trim(),
          testId: el.getAttribute('data-testid')
        })),
        
        migrationIndicators: Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent?.toLowerCase().includes('pending migration') ||
          el.textContent?.toLowerCase().includes('migrations pending')
        ).map(el => ({
          text: el.textContent?.trim(),
          tagName: el.tagName
        })),
        
        // Check for any migration-related text
        migrationTextFound: document.body.textContent?.toLowerCase().includes('migration'),
        pendingTextFound: document.body.textContent?.match(/\d+\s*pending/i)
      };
      
      // Try to find the migration state in window or React props
      const migrationState = window.__migrationState || 
        window.migrationState || 
        document.querySelector('[data-migration-state]')?.dataset?.migrationState;
        
      return {
        elements,
        migrationState,
        url: window.location.href
      };
    });
    
    console.log('\n🎨 UI State After API Calls:', JSON.stringify(uiState, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'migration-api-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: migration-api-test.png');
    
    // If we captured migration state from console
    if (capturedMigrationState) {
      console.log('\n📋 Captured Migration State:', capturedMigrationState);
    }
    
    // Try clicking on dev console button to see more info
    try {
      const devButton = await page.locator('button:has-text("Show Console")').first();
      if (await devButton.isVisible()) {
        console.log('\n🔍 Opening dev console...');
        await devButton.click();
        await page.waitForTimeout(2000);
        
        // Check dev console content
        const devConsoleState = await page.evaluate(() => {
          const consoleContent = document.querySelector('[data-testid="dev-console"]') || 
                               document.querySelector('.dev-console');
          return {
            visible: !!consoleContent,
            content: consoleContent?.textContent
          };
        });
        
        console.log('\n📋 Dev Console State:', devConsoleState);
        
        await page.screenshot({ path: 'migration-dev-console.png', fullPage: true });
      }
    } catch (_e) {
      console.log('\n⚠️  Could not open dev console');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`  - API Calls Made: ${migrationResponses.length}`);
    console.log(`  - Migration Text in UI: ${uiState.elements.migrationTextFound}`);
    console.log(`  - Pending Text Found: ${uiState.elements.pendingTextFound}`);
    console.log(`  - Migration Buttons: ${uiState.elements.buttons.filter(b => 
      b.text?.toLowerCase().includes('migration')).length}`);
    
    // Save detailed response data
    fs.writeFileSync('migration-api-responses.json', 
      JSON.stringify({ migrationResponses, uiState, capturedMigrationState }, null, 2));
    console.log('\n💾 Detailed data saved to: migration-api-responses.json');
    
  } catch (_error) {
    console.error('\n❌ Test failed:', error);
    await page.screenshot({ path: 'migration-api-error.png' });
  } finally {
    await browser.close();
  }
}

testMigrationAPIResponse().catch(console.error);