#!/usr/bin/env node

/**
 * Orchestration Test Suite Runner
 * 
 * Runs all orchestration-related tests in sequence:
 * 1. Ground truth test (database-level verification)
 * 2. E2E test (UI to orchestration flow)
 * 3. User registration test (new user onboarding)
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

console.log('🎯 ORCHESTRATION TEST SUITE');
console.log('═'.repeat(60));
console.log('Running comprehensive orchestration tests\n');

const TESTS = [
  {
    name: 'Ground Truth Orchestration Test',
    file: 'test-orchestration-ground-truth.js',
    description: 'Validates orchestration at database level'
  },
  {
    name: 'E2E Orchestration Test',
    file: 'test-orchestration-e2e.js',
    description: 'Tests complete flow from UI to agents'
  },
  {
    name: 'Direct Orchestration Test',
    file: 'test-orchestration-direct.js',
    description: 'Tests direct task creation triggering orchestration'
  }
];

const results = [];

async function runTest(test) {
  console.log(`\n🧪 Running: ${test.name}`);
  console.log(`   ${test.description}`);
  console.log('   ' + '-'.repeat(50));
  
  const startTime = Date.now();
  let success = false;
  let output = '';
  
  try {
    // Check if test file exists
    await fs.access(test.file);
    
    // Run the test
    output = execSync(`node ${test.file}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    success = true;
    console.log('   ✅ Test passed');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`   ⚠️ Test file not found: ${test.file}`);
      output = 'Test file not found';
    } else if (error.stdout) {
      output = error.stdout.toString();
      console.log('   ❌ Test failed');
      
      // Extract key failure info
      const lines = output.split('\n');
      const failureLine = lines.find(l => l.includes('FAILURE') || l.includes('failed'));
      if (failureLine) {
        console.log(`   Reason: ${failureLine.trim()}`);
      }
    } else {
      output = error.message;
      console.log('   ❌ Test error:', error.message);
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
  
  results.push({
    name: test.name,
    file: test.file,
    success,
    duration,
    output: output.substring(0, 1000) // Truncate long output
  });
  
  return success;
}

async function saveResults() {
  const timestamp = new Date().toISOString();
  const resultsDir = 'test-results';
  await fs.mkdir(resultsDir, { recursive: true });
  
  const summary = {
    suite: 'Orchestration Test Suite',
    timestamp,
    totalTests: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    tests: results
  };
  
  const filename = `orchestration-suite-${Date.now()}.json`;
  const filepath = path.join(resultsDir, filename);
  
  await fs.writeFile(filepath, JSON.stringify(summary, null, 2));
  
  return { summary, filepath };
}

async function runSuite() {
  const startTime = Date.now();
  let allPassed = true;
  
  // Check prerequisites
  console.log('📋 Checking prerequisites...');
  
  try {
    // Check backend health
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      console.log('   ✅ Backend is running');
    } else {
      throw new Error('Backend not healthy');
    }
  } catch (error) {
    console.log('   ❌ Backend is not running');
    console.log('   Start with: cd ../biz-buddy-backend && npm run dev');
    return false;
  }
  
  // Run each test
  for (const test of TESTS) {
    const passed = await runTest(test);
    if (!passed) {
      allPassed = false;
    }
  }
  
  // Save results
  const { summary, filepath } = await saveResults();
  
  // Print summary
  const totalDuration = Date.now() - startTime;
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUITE SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed} ✅`);
  console.log(`Failed: ${summary.failed} ❌`);
  console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Results saved: ${filepath}`);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('The orchestration system is working correctly.');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED');
    console.log('Review the failures above for details.');
  }
  console.log('═'.repeat(60));
  
  return allPassed;
}

// Run the suite
if (require.main === module) {
  runSuite().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Suite error:', error);
    process.exit(1);
  });
}

module.exports = { runSuite };