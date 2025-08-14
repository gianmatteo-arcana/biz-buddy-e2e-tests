#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Auto-cleanup script for test screenshots
 * Removes screenshots older than 10 days from test-screenshots directory
 * Should be run daily via cron job or GitHub Actions
 */

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-screenshots');
const MAX_AGE_DAYS = 10;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function getDirectoryAge(dirPath) {
  try {
    const stats = fs.statSync(dirPath);
    return Date.now() - stats.mtimeMs;
  } catch (error) {
    console.error(`Error getting stats for ${dirPath}:`, error.message);
    return 0;
  }
}

function deleteDirectoryRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteDirectoryRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

function cleanupOldScreenshots() {
  console.log('🧹 Starting screenshot cleanup...');
  console.log(`📁 Screenshots directory: ${SCREENSHOTS_DIR}`);
  console.log(`⏰ Max age: ${MAX_AGE_DAYS} days`);
  console.log('=' .repeat(60));

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.log('⚠️ Screenshots directory does not exist. Nothing to clean.');
    return;
  }

  let totalDeleted = 0;
  let totalKept = 0;
  let spaceSaved = 0;

  // Read all subdirectories in test-screenshots
  const categories = fs.readdirSync(SCREENSHOTS_DIR).filter(item => {
    const itemPath = path.join(SCREENSHOTS_DIR, item);
    return fs.statSync(itemPath).isDirectory();
  });

  categories.forEach(category => {
    const categoryPath = path.join(SCREENSHOTS_DIR, category);
    console.log(`\n📂 Checking category: ${category}`);
    
    // Read all timestamp directories within each category
    const timestampDirs = fs.readdirSync(categoryPath).filter(item => {
      const itemPath = path.join(categoryPath, item);
      return fs.statSync(itemPath).isDirectory();
    });

    timestampDirs.forEach(timestampDir => {
      const dirPath = path.join(categoryPath, timestampDir);
      const ageMs = getDirectoryAge(dirPath);
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      
      if (ageMs > MAX_AGE_MS) {
        // Calculate space being freed
        const dirSize = calculateDirectorySize(dirPath);
        spaceSaved += dirSize;
        
        console.log(`  ❌ Deleting: ${timestampDir} (${ageDays} days old, ${formatBytes(dirSize)})`);
        deleteDirectoryRecursive(dirPath);
        totalDeleted++;
      } else {
        console.log(`  ✅ Keeping: ${timestampDir} (${ageDays} days old)`);
        totalKept++;
      }
    });

    // Clean up empty category directories
    const remainingItems = fs.readdirSync(categoryPath);
    if (remainingItems.length === 0) {
      console.log(`  🗑️ Removing empty category: ${category}`);
      fs.rmdirSync(categoryPath);
    }
  });

  console.log('\n' + '=' .repeat(60));
  console.log('📊 Cleanup Summary:');
  console.log(`  • Deleted: ${totalDeleted} directories`);
  console.log(`  • Kept: ${totalKept} directories`);
  console.log(`  • Space saved: ${formatBytes(spaceSaved)}`);
  console.log('✅ Cleanup complete!');
}

function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      const stats = fs.lstatSync(curPath);
      
      if (stats.isDirectory()) {
        totalSize += calculateDirectorySize(curPath);
      } else {
        totalSize += stats.size;
      }
    });
  }
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Run cleanup if executed directly
if (require.main === module) {
  cleanupOldScreenshots();
}

module.exports = { cleanupOldScreenshots };