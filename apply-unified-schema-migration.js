/**
 * Apply Unified Schema Migration for Issue #59
 * 
 * The migration 20250101000000_clean_slate_initial_schema.sql was merged
 * in the frontend PR but never applied to the database.
 * 
 * This script will apply it through the Migration Runner UI.
 */

import { chromium } from 'playwright';
import fs from 'fs';

const CONFIG = {
  FRONTEND_URL: 'http://localhost:8081',
  HEADLESS: false, // Keep visible for debugging
  TIMEOUT: 120000
};

async function applyUnifiedSchemaMigration() {
  console.log('🚀 Applying Unified Schema Migration for Issue #59');
  console.log(`   Frontend URL: ${CONFIG.FRONTEND_URL}`);
  
  const browser = await chromium.launch({ 
    headless: CONFIG.HEADLESS,
    slowMo: 1000 
  });
  
  const context = await browser.newContext({
    storageState: '.auth/user-state.json', // Use existing auth
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate directly to Dev Toolkit standalone
    console.log('📍 Step 1: Loading Dev Toolkit standalone...');
    await page.goto(`${CONFIG.FRONTEND_URL}/dev-toolkit-standalone`);
    await page.waitForTimeout(3000);
    
    // Step 2: Navigate to Migrations tab
    console.log('📋 Step 2: Opening Migrations tab...');
    
    // Wait for Dev Toolkit to load
    await page.waitForTimeout(2000);
    
    // Look for Migrations tab - try multiple selectors
    let migrationsTab = page.locator('button:has-text("Migrations")').first();
    if (!(await migrationsTab.isVisible())) {
      migrationsTab = page.locator('[data-testid="migrations-tab"]');
    }
    if (!(await migrationsTab.isVisible())) {
      migrationsTab = page.locator('text=Migrations').first();
    }
    
    await migrationsTab.click();
    await page.waitForTimeout(2000);
    
    // Step 4: Look for the unified schema migration
    console.log('🔍 Step 4: Looking for unified schema migration...');
    
    // Look for the specific migration
    const migrationName = '20250101000000_clean_slate_initial_schema.sql';
    const migrationItem = page.locator(`text=${migrationName}`).first();
    
    if (await migrationItem.isVisible()) {
      console.log(`✅ Found migration: ${migrationName}`);
      
      // Take screenshot before applying
      await page.screenshot({ 
        path: 'migration-before-apply.png',
        fullPage: true 
      });
      
      // Step 5: Apply the migration
      console.log('⚡ Step 5: Applying migration...');
      
      // Find and click the apply button for this migration
      const applyButton = page.locator('button', { hasText: 'Apply' }).first();
      await applyButton.click();
      
      // Wait for confirmation dialog or result
      await page.waitForTimeout(5000);
      
      // Check for success/error messages
      const successMessage = page.locator('text=Migration applied successfully');
      const errorMessage = page.locator('text=Migration failed');
      
      if (await successMessage.isVisible()) {
        console.log('✅ Migration applied successfully!');
      } else if (await errorMessage.isVisible()) {
        console.log('❌ Migration failed!');
        const errorText = await errorMessage.textContent();
        console.log(`   Error: ${errorText}`);
      } else {
        console.log('⚠️ Migration status unclear');
      }
      
      // Take screenshot after applying
      await page.screenshot({ 
        path: 'migration-after-apply.png',
        fullPage: true 
      });
      
    } else {
      console.log(`❌ Migration ${migrationName} not found in UI`);
      
      // Take screenshot of what's available
      await page.screenshot({ 
        path: 'migration-not-found.png',
        fullPage: true 
      });
      
      // List available migrations
      const allMigrations = await page.locator('[data-testid="migration-item"]').allTextContents();
      console.log('📋 Available migrations:');
      allMigrations.forEach(migration => console.log(`   - ${migration}`));
    }
    
    // Step 6: Wait and take final screenshot
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'migration-final-state.png',
      fullPage: true 
    });
    
    console.log('🎉 Migration application process completed');
    
  } catch (error) {
    console.error('💥 Migration application failed:', error.message);
    
    await page.screenshot({ 
      path: 'migration-error.png',
      fullPage: true 
    });
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the migration application
applyUnifiedSchemaMigration()
  .then(() => {
    console.log('\n✅ Unified schema migration application completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration application failed:', error.message);
    process.exit(1);
  });