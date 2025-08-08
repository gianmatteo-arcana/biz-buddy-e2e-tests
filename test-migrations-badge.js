/**
 * Test Migrations Badge
 * Verifies the pending migrations count badge appears on the Migrations tab
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testMigrationsBadge() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `migrations-badge-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Migrations Badge Test Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('DevToolkit') || text.includes('migrations') || text.includes('pending')) {
      console.log('  Browser console:', text);
    }
  });

  try {
    // Navigate to Dev Toolkit
    console.log('\n📍 Step 1: Opening Dev Toolkit...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for React to render
    await new Promise(r => setTimeout(r, 5000));

    // Take screenshot of initial state
    await page.screenshot({ 
      path: path.join(outputDir, '01-dev-toolkit-initial.png'),
      fullPage: true 
    });
    console.log('✅ Initial state captured');

    // Analyze the Migrations tab button
    const migrationsBadgeInfo = await page.evaluate(() => {
      // Find the Migrations button
      const buttons = Array.from(document.querySelectorAll('button'));
      const migrationsButton = buttons.find(btn => btn.textContent?.includes('Migrations'));
      
      if (!migrationsButton) {
        return { found: false, error: 'Migrations button not found' };
      }
      
      // Look for badge within the button
      const badge = migrationsButton.querySelector('[class*="badge"]');
      const badgeText = badge?.textContent?.trim();
      
      // Check if there's any element with pending count
      const pendingElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.match(/\d+\s*pending/i) || text.includes('Pending Migrations');
      });
      
      // Get button HTML to inspect structure
      const buttonHTML = migrationsButton.outerHTML;
      const buttonClasses = migrationsButton.className;
      const buttonText = migrationsButton.textContent;
      
      return {
        found: true,
        buttonText,
        buttonClasses,
        hasBadge: !!badge,
        badgeText,
        badgeClasses: badge?.className,
        pendingElementsFound: pendingElements.length,
        buttonHTML: buttonHTML.substring(0, 500),
        children: Array.from(migrationsButton.children).map(child => ({
          tag: child.tagName,
          classes: child.className,
          text: child.textContent?.trim()
        }))
      };
    });
    
    console.log('\n📊 Migrations Badge Analysis:');
    console.log(JSON.stringify(migrationsBadgeInfo, null, 2));

    // Click on Migrations tab
    console.log('\n📍 Step 2: Clicking Migrations tab...');
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('Migrations'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await new Promise(r => setTimeout(r, 3000));
      
      await page.screenshot({ 
        path: path.join(outputDir, '02-migrations-tab-open.png'),
        fullPage: true 
      });
      console.log('✅ Migrations tab captured');
      
      // Check for pending migrations in the content
      const migrationsContent = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const pendingMatch = bodyText.match(/Pending Migrations \((\d+)\)/);
        const pendingCount = pendingMatch ? pendingMatch[1] : '0';
        
        // Look for any pending indicators
        const hasPendingSection = bodyText.includes('Pending Migrations');
        const hasApplyButton = !!document.querySelector('button[class*="primary"]');
        
        return {
          pendingCount,
          hasPendingSection,
          hasApplyButton,
          pendingMigrations: Array.from(document.querySelectorAll('div')).filter(div => 
            div.textContent?.includes('.sql') && 
            div.textContent?.includes('Pending')
          ).map(div => div.textContent?.match(/(\d{14}.*?\.sql)/)?.[1]).filter(Boolean)
        };
      });
      
      console.log('\n📊 Migrations Content:');
      console.log(JSON.stringify(migrationsContent, null, 2));
    }

    // Check console logs for any errors or pending count logs
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('Pending migrations') || 
      log.includes('DevToolkit') ||
      log.includes('migrations') ||
      log.includes('error')
    );
    
    console.log('\n📋 Relevant Console Logs:');
    relevantLogs.forEach(log => console.log(`  - ${log}`));

    // Save analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      migrationsBadgeInfo,
      consoleLogs: relevantLogs,
      screenshots: await fs.readdir(outputDir)
    };
    
    await fs.writeFile(
      path.join(outputDir, 'badge-analysis.json'),
      JSON.stringify(analysis, null, 2)
    );

    // Summary
    console.log('\n✨ Test Complete!');
    console.log('📊 Results:');
    console.log(`  ${migrationsBadgeInfo.found ? '✅' : '❌'} Migrations button found`);
    console.log(`  ${migrationsBadgeInfo.hasBadge ? '✅' : '❌'} Badge element present`);
    console.log(`  Badge text: ${migrationsBadgeInfo.badgeText || 'None'}`);
    console.log(`\n📸 Screenshots saved to: ${outputDir}/`);
    
    if (!migrationsBadgeInfo.hasBadge) {
      console.log('\n⚠️  ISSUE: Badge is not showing on Migrations tab');
      console.log('  Possible reasons:');
      console.log('  1. pendingCount state is 0');
      console.log('  2. Edge function not returning data');
      console.log('  3. Badge rendering condition not met');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    await page.screenshot({ 
      path: path.join(outputDir, 'error-state.png'),
      fullPage: true 
    });

    await fs.writeFile(
      path.join(outputDir, 'error.json'),
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  } finally {
    console.log('\n⏳ Keeping browser open for 5 seconds for inspection...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

// Run the test
testMigrationsBadge().catch(console.error);