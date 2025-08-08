/**
 * Test Migration Status
 * Checks the migration status through the Dev Toolkit UI
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testMigrationStatus() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = `migration-status-${timestamp}`;
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Migration Status Test Starting...');
  console.log(`📁 Screenshots will be saved to: ${outputDir}/`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Navigate to Dev Toolkit
    console.log('\n📍 Step 1: Opening Dev Toolkit...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/dev-toolkit-standalone', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));

    // Click Migrations tab
    console.log('\n📍 Step 2: Opening Migrations tab...');
    const migrationsClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('Migrations'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (migrationsClicked) {
      // Wait for migrations to load
      await new Promise(r => setTimeout(r, 5000));
      
      // Check for the specific migration
      const migrationInfo = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const hasPendingSection = bodyText.includes('Pending Migrations');
        const hasAppliedSection = bodyText.includes('Applied Migrations');
        const hasTargetMigration = bodyText.includes('fix_all_security_definer_views');
        
        // Look for pending migrations count
        const pendingBadge = Array.from(document.querySelectorAll('*'))
          .find(el => el.textContent?.includes('Pending Migrations'));
        const pendingCount = pendingBadge?.textContent?.match(/\((\d+)\)/)?.[1];
        
        // Look for applied migrations count
        const appliedBadge = Array.from(document.querySelectorAll('*'))
          .find(el => el.textContent?.includes('Applied Migrations'));
        const appliedCount = appliedBadge?.textContent?.match(/\((\d+)\)/)?.[1];
        
        // Check if migration appears in pending section
        const pendingSection = Array.from(document.querySelectorAll('div'))
          .find(div => div.textContent?.includes('Pending Migrations') && 
                       div.textContent?.includes('fix_all_security_definer_views'));
        
        // Check the migration status badge
        const migrationCard = Array.from(document.querySelectorAll('div'))
          .find(div => div.textContent?.includes('20250807120000_fix_all_security_definer_views'));
        
        let migrationStatus = 'not found';
        if (migrationCard) {
          if (migrationCard.textContent?.includes('Pending')) {
            migrationStatus = 'pending';
          } else if (migrationCard.textContent?.includes('Applied') || 
                     migrationCard.textContent?.includes('Success')) {
            migrationStatus = 'applied';
          }
        }
        
        return {
          hasPendingSection,
          hasAppliedSection,
          hasTargetMigration,
          pendingCount: pendingCount || '0',
          appliedCount: appliedCount || '0',
          migrationStatus,
          isPendingVisible: !!pendingSection,
          fullText: bodyText.substring(0, 500)
        };
      });
      
      console.log('\n📊 Migration Analysis:');
      console.log(JSON.stringify(migrationInfo, null, 2));
      
      await page.screenshot({ 
        path: path.join(outputDir, '01-migrations-tab.png'),
        fullPage: true 
      });
      console.log('✅ Migrations tab captured');
      
      // Try to expand Applied Migrations to check if it's there
      console.log('\n📍 Step 3: Checking Applied Migrations...');
      const expandClicked = await page.evaluate(() => {
        const triggers = Array.from(document.querySelectorAll('button'))
          .filter(b => b.textContent?.includes('Applied Migrations'));
        
        if (triggers.length > 0) {
          triggers[0].click();
          return true;
        }
        return false;
      });
      
      if (expandClicked) {
        await new Promise(r => setTimeout(r, 2000));
        
        const appliedMigrationInfo = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          const hasTargetInApplied = bodyText.includes('20250807120000_fix_all_security_definer_views');
          
          // Count total applied migrations visible
          const migrationCards = Array.from(document.querySelectorAll('div'))
            .filter(div => div.textContent?.includes('.sql') && 
                          div.textContent?.includes('Applied:'));
          
          return {
            hasTargetInApplied,
            visibleAppliedCount: migrationCards.length,
            sampleMigrations: migrationCards.slice(0, 3).map(card => 
              card.textContent?.match(/(\d{14}_.*?\.sql)/)?.[1] || 'unknown'
            )
          };
        });
        
        console.log('\n📊 Applied Migrations Analysis:');
        console.log(JSON.stringify(appliedMigrationInfo, null, 2));
        
        await page.screenshot({ 
          path: path.join(outputDir, '02-applied-expanded.png'),
          fullPage: true 
        });
        console.log('✅ Applied Migrations expanded');
      }
    }

    // Summary
    const summary = {
      timestamp: new Date().toISOString(),
      migrationName: '20250807120000_fix_all_security_definer_views.sql',
      status: migrationInfo?.migrationStatus || 'unknown',
      inPendingList: migrationInfo?.isPendingVisible || false,
      pendingCount: migrationInfo?.pendingCount || '0',
      appliedCount: migrationInfo?.appliedCount || '0',
      recommendation: ''
    };
    
    if (summary.status === 'pending') {
      summary.recommendation = 'Migration is genuinely pending and needs to be applied';
    } else if (summary.status === 'applied') {
      summary.recommendation = 'Migration was already applied but registry may be out of sync';
    } else {
      summary.recommendation = 'Unable to determine migration status - manual check required';
    }
    
    await fs.writeFile(
      path.join(outputDir, 'migration-status.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✨ Test Complete!');
    console.log('📊 Migration Status Summary:');
    console.log(`  Migration: ${summary.migrationName}`);
    console.log(`  Status: ${summary.status}`);
    console.log(`  Pending migrations: ${summary.pendingCount}`);
    console.log(`  Applied migrations: ${summary.appliedCount}`);
    console.log(`  \n💡 Recommendation: ${summary.recommendation}`);
    console.log(`\n📸 Screenshots saved to: ${outputDir}/`);

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
testMigrationStatus().catch(console.error);