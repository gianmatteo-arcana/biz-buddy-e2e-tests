#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Upload screenshots to GitHub issue using the repository-based approach
 * As documented in CLAUDE.md - the proven working solution
 */

function uploadScreenshotsToIssue(issueNumber, screenshotDir, testName = 'UI Improvements') {
  console.log('📸 Uploading screenshots to GitHub issue...');
  console.log(`📋 Issue: #${issueNumber}`);
  console.log(`📁 Screenshot directory: ${screenshotDir}`);
  console.log('=' .repeat(60));

  // Verify directory exists
  if (!fs.existsSync(screenshotDir)) {
    console.error(`❌ Directory not found: ${screenshotDir}`);
    process.exit(1);
  }

  // Find all PNG files
  const screenshots = fs.readdirSync(screenshotDir)
    .filter(file => file.endsWith('.png'))
    .map(file => path.join(screenshotDir, file));

  if (screenshots.length === 0) {
    console.error('❌ No screenshots found in directory');
    process.exit(1);
  }

  console.log(`Found ${screenshots.length} screenshots to upload`);

  // Get timestamp from directory name or create new one
  const timestamp = path.basename(screenshotDir);
  const uploadPath = `uploaded-screenshots/issue-${issueNumber}/${timestamp}`;

  // Create the directory structure in the repository
  const uploadDir = path.join(__dirname, '..', uploadPath);
  fs.mkdirSync(uploadDir, { recursive: true });

  // Copy screenshots to upload directory
  const uploadedFiles = [];
  screenshots.forEach(screenshot => {
    const filename = path.basename(screenshot);
    const destination = path.join(uploadDir, filename);
    fs.copyFileSync(screenshot, destination);
    uploadedFiles.push({
      filename,
      path: `${uploadPath}/${filename}`,
      url: `https://raw.githubusercontent.com/gianmatteo-arcana/biz-buddy-e2e-tests/main/${uploadPath}/${filename}`
    });
    console.log(`  ✓ Copied: ${filename}`);
  });

  // Commit and push the screenshots
  console.log('\n📤 Pushing screenshots to repository...');
  try {
    execSync('git add -A', { cwd: path.join(__dirname, '..') });
    execSync(
      `git commit -m "test: add screenshots for issue #${issueNumber} - ${testName}"`,
      { cwd: path.join(__dirname, '..') }
    );
    execSync('git push origin main', { cwd: path.join(__dirname, '..') });
    console.log('✅ Screenshots pushed to repository');
  } catch (error) {
    console.error('❌ Failed to push screenshots:', error.message);
    process.exit(1);
  }

  // Generate markdown for the issue comment
  const markdown = generateIssueComment(issueNumber, testName, uploadedFiles);
  
  // Save markdown to file for manual posting or automation
  const markdownFile = path.join(uploadDir, 'issue-comment.md');
  fs.writeFileSync(markdownFile, markdown);
  console.log(`\n📝 Issue comment saved to: ${markdownFile}`);

  // Post to GitHub issue using gh CLI if available
  try {
    const tempFile = path.join(__dirname, '..', 'temp-comment.md');
    fs.writeFileSync(tempFile, markdown);
    
    execSync(
      `gh issue comment ${issueNumber} --repo gianmatteo-arcana/biz-buddy-ally-now --body-file ${tempFile}`,
      { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
    );
    
    fs.unlinkSync(tempFile);
    console.log('✅ Comment posted to issue');
  } catch (error) {
    console.log('⚠️ Could not post comment automatically. Manual posting required.');
    console.log('\n📋 Copy this markdown to post manually:');
    console.log('=' .repeat(60));
    console.log(markdown);
    console.log('=' .repeat(60));
  }

  console.log('\n✅ Upload complete!');
  return uploadedFiles;
}

function generateIssueComment(issueNumber, testName, files) {
  const timestamp = new Date().toISOString();
  
  let markdown = `## 📸 ${testName} - Screenshots\n\n`;
  markdown += `**Timestamp**: ${timestamp}\n\n`;
  markdown += `### UI Improvements Demonstrated:\n\n`;
  
  // Add each screenshot with description based on filename
  files.forEach(file => {
    const description = getDescriptionForFile(file.filename);
    markdown += `#### ${description}\n`;
    markdown += `![${file.filename}](${file.url})\n\n`;
  });
  
  markdown += `---\n`;
  markdown += `*Screenshots uploaded via automated E2E test system*\n`;
  markdown += `*Repository: [biz-buddy-e2e-tests](https://github.com/gianmatteo-arcana/biz-buddy-e2e-tests)*\n`;
  markdown += `*Auto-cleanup: Screenshots older than 10 days are automatically removed*`;
  
  return markdown;
}

function getDescriptionForFile(filename) {
  const descriptions = {
    '01-migration-runner-improved.png': '✅ Migration Runner with Improved Viewport',
    '02-migration-list-expanded.png': '📋 Expanded Migration List (min-h-[400px] max-h-[70vh])',
    '03-dev-toolkit-full-page.png': '📄 Full Dev Toolkit Page View',
    '04-dev-toolkit-modal-migrations.png': '🔲 Dev Toolkit Modal (1600px × 90vh) with Migrations',
    'dev-toolkit-improved-standalone.png': '🛠️ Dev Toolkit Standalone Page',
    'migration-runner-improved-viewport.png': '📐 Migration Runner Enhanced Viewport',
    'dev-toolkit-full-page.png': '📄 Complete Dev Toolkit View'
  };
  
  return descriptions[filename] || filename.replace(/\.png$/, '').replace(/-/g, ' ');
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node upload-screenshots-to-issue.js <issue-number> <screenshot-dir> [test-name]');
    console.log('Example: node upload-screenshots-to-issue.js 19 test-screenshots/ui-improvements/2025-08-14T07-47-57 "Migration UI"');
    process.exit(1);
  }
  
  const issueNumber = args[0];
  const screenshotDir = args[1];
  const testName = args[2] || 'Test Results';
  
  uploadScreenshotsToIssue(issueNumber, screenshotDir, testName);
}

module.exports = { uploadScreenshotsToIssue };