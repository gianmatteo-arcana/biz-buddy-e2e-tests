const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Test to check and apply pending migrations
 */
async function testMigrationRunner() {
  console.log('🔧 Testing Migration Runner\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('migration') || msg.text().includes('Migration')) {
      console.log(`[Migration Log] ${msg.text()}`);
    }
  });
  
  try {
    console.log('📍 Navigating to app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com');
    
    // Wait for app to load
    await page.waitForTimeout(5000);
    
    // Check for migration badge/button
    const migrationElements = await page.evaluate(() => {
      const elements = {
        hasMigrationBadge: !!document.querySelector('[data-testid="migration-badge"]'),
        migrationBadgeText: document.querySelector('[data-testid="migration-badge"]')?.textContent,
        hasMigrationButton: Array.from(document.querySelectorAll('button')).some(btn => 
          btn.textContent?.toLowerCase().includes('migration')
        ),
        devModeVisible: document.body.textContent?.includes('OpenAI'),
        pendingCount: null
      };
      
      // Look for any element that contains migration count
      const countElement = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent?.match(/\d+\s*pending\s*migration/i)
      );
      
      if (countElement) {
        const match = countElement.textContent.match(/(\d+)\s*pending/i);
        elements.pendingCount = match ? parseInt(match[1]) : null;
      }
      
      return elements;
    });
    
    console.log('\n📊 Migration UI State:', JSON.stringify(migrationElements, null, 2));
    
    // Try to find and click migration button
    try {
      // Look for various possible migration button selectors
      const migrationButton = await page.locator('button:has-text("Migration"), button:has-text("migration"), [data-testid="migration-button"], button:has-text("Pending")').first();
      
      if (await migrationButton.isVisible()) {
        console.log('\n✅ Found migration button, clicking...');
        await migrationButton.click();
        await page.waitForTimeout(2000);
        
        // Check if migration runner opened
        const migrationRunnerVisible = await page.evaluate(() => {
          return {
            hasModal: !!document.querySelector('[role="dialog"]'),
            hasTitle: document.querySelector('h2')?.textContent?.includes('Migration'),
            pendingMigrations: Array.from(document.querySelectorAll('[data-testid="pending-migration"]')).map(el => el.textContent),
            visibleText: Array.from(document.querySelectorAll('h2, h3')).map(el => el.textContent).filter(Boolean)
          };
        });
        
        console.log('\n📋 Migration Runner State:', JSON.stringify(migrationRunnerVisible, null, 2));
        
        // Take screenshot of migration runner
        await page.screenshot({ path: 'migration-runner-open.png', fullPage: true });
        console.log('📸 Screenshot saved: migration-runner-open.png');
      } else {
        console.log('\n❌ No migration button found');
      }
    } catch (_e) {
      console.log('\n⚠️  Could not interact with migration button:', e.message);
    }
    
    // Check network requests for migration status
    const migrationRequests = [];
    page.on('response', response => {
      if (response.url().includes('check-pending-migrations')) {
        migrationRequests.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok()
        });
      }
    });
    
    // Reload to trigger fresh migration check
    console.log('\n🔄 Reloading to check migration status...');
    await page.reload();
    await page.waitForTimeout(5000);
    
    // Check console for migration response
    const migrationResponse = await page.evaluate(() => {
      // Look for any migration-related data in page
      const migrationData = window.__migrationData || {};
      return {
        hasPendingMigrations: migrationData.hasPendingMigrations,
        pendingCount: migrationData.pendingCount,
        totalCount: migrationData.totalCount,
        // Check localStorage too
        localStorage: {
          migrationState: localStorage.getItem('migration-state')
        }
      };
    });
    
    console.log('\n📊 Migration Data:', JSON.stringify(migrationResponse, null, 2));
    console.log('\n🌐 Migration API Calls:', migrationRequests);
    
    // Final screenshot
    await page.screenshot({ path: 'migration-runner-final.png', fullPage: true });
    console.log('\n📸 Final screenshot saved: migration-runner-final.png');
    
  } catch (_error) {
    console.error('\n❌ Test failed:', error);
    await page.screenshot({ path: 'migration-error.png' });
  } finally {
    await browser.close();
  }
}

testMigrationRunner().catch(console.error);