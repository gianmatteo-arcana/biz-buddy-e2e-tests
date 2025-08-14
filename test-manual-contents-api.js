#!/usr/bin/env node

/**
 * Manual test of Contents API approach for uploading screenshots
 * This mimics what the GitHub Action should do
 */

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

async function testContentsAPI() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('❌ GITHUB_TOKEN environment variable required');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  
  const owner = 'gianmatteo-arcana';
  const repo = 'biz-buddy-e2e-tests';
  const issueRepo = 'biz-buddy-ally-now';
  const issueNumber = 19;
  
  const screenshotDir = 'uploaded-screenshots/issue-19/20250814-043646';
  const testFile = '01-initial-load.png';
  const localPath = path.join(screenshotDir, testFile);
  
  if (!fs.existsSync(localPath)) {
    console.error(`❌ Test file not found: ${localPath}`);
    process.exit(1);
  }
  
  try {
    console.log('📸 Testing Contents API approach...');
    
    // 1. Upload file via Contents API
    const fileContent = fs.readFileSync(localPath);
    const base64Content = fileContent.toString('base64');
    const apiPath = `manual-test/${testFile}`;
    
    console.log(`📤 Uploading: ${apiPath}`);
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: apiPath,
      message: `📸 Manual test upload: ${testFile}`,
      content: base64Content,
      branch: 'main'
    });
    
    console.log('✅ File uploaded via Contents API');
    
    // 2. Wait a moment for GitHub to propagate
    console.log('⏳ Waiting 10 seconds for GitHub to propagate...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 3. Test the raw URL
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${apiPath}`;
    console.log(`🔗 Testing raw URL: ${rawUrl}`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(rawUrl);
    
    if (response.ok) {
      console.log('✅ Raw URL is accessible!');
    } else {
      console.log(`❌ Raw URL returned ${response.status}: ${response.statusText}`);
    }
    
    // 4. Post issue comment
    const commentBody = `## 📸 Manual Contents API Test

Testing Contents API upload approach:

![${testFile}](${rawUrl})

**Status**: ${response.ok ? '✅ Working' : '❌ Failed'}  
**Raw URL**: ${rawUrl}`;
    
    await octokit.rest.issues.createComment({
      owner,
      repo: issueRepo,
      issue_number: issueNumber,
      body: commentBody
    });
    
    console.log('✅ Issue comment posted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testContentsAPI();