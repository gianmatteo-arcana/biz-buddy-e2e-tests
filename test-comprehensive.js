const { chromium } = require('playwright');
const fs = require('fs');

async function runComprehensiveTests() {
  console.log('🚀 Comprehensive E2E Test Suite\n');
  console.log('=' .repeat(50));
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const page = await browser.newPage();
  
  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('X-Frame-Options') && !msg.text().includes('WebSocket')) {
      errors.push(msg.text());
    }
  });

  // Test 1: App Loads
  console.log('\n📍 Test 1: App Loads');
  try {
    await page.goto('http://localhost:8080', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    await page.waitForTimeout(3000);
    
    const loaded = await page.evaluate(() => {
      return {
        hasRoot: !!document.getElementById('root'),
        hasContent: document.body.innerText.length > 100,
        title: document.title
      };
    });
    
    if (loaded.hasRoot && loaded.hasContent) {
      console.log('✅ App loads successfully');
      results.tests.push({ name: 'App Loads', status: 'passed' });
      results.summary.passed++;
    } else {
      console.log('❌ App failed to load');
      results.tests.push({ name: 'App Loads', status: 'failed', error: 'No content' });
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ App failed to load:', error.message);
    results.tests.push({ name: 'App Loads', status: 'failed', error: error.message });
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 2: Authentication UI Present
  console.log('\n📍 Test 2: Authentication UI');
  try {
    const authUI = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasSignIn: bodyText.includes('Sign in'),
        hasDemo: bodyText.includes('Demo Mode'),
        hasGoogle: bodyText.includes('Google')
      };
    });
    
    if (authUI.hasSignIn || authUI.hasDemo) {
      console.log('✅ Authentication UI present');
      results.tests.push({ name: 'Auth UI Present', status: 'passed' });
      results.summary.passed++;
    } else {
      console.log('❌ Authentication UI missing');
      results.tests.push({ name: 'Auth UI Present', status: 'failed' });
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ Auth UI test failed:', error.message);
    results.tests.push({ name: 'Auth UI Present', status: 'failed', error: error.message });
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 3: Demo Mode Works
  console.log('\n📍 Test 3: Demo Mode');
  try {
    // Check if demo button exists
    const hasDemoButton = await page.evaluate(() => {
      return document.body.innerText.includes('Demo Mode');
    });
    
    if (hasDemoButton) {
      await page.getByRole('button', { name: 'Demo Mode' }).click();
      await page.waitForTimeout(3000);
      
      const dashboardLoaded = await page.evaluate(() => {
        return document.body.innerText.includes('Welcome back');
      });
      
      if (dashboardLoaded) {
        console.log('✅ Demo mode works');
        results.tests.push({ name: 'Demo Mode', status: 'passed' });
        results.summary.passed++;
      } else {
        console.log('❌ Demo mode failed to load dashboard');
        results.tests.push({ name: 'Demo Mode', status: 'failed', error: 'Dashboard not loaded' });
        results.summary.failed++;
      }
    } else {
      console.log('⏭️  Demo mode not available (user might be logged in)');
      results.tests.push({ name: 'Demo Mode', status: 'skipped' });
    }
  } catch (error) {
    console.log('❌ Demo mode test failed:', error.message);
    results.tests.push({ name: 'Demo Mode', status: 'failed', error: error.message });
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 4: TypeScript Compilation
  console.log('\n📍 Test 4: TypeScript Compilation');
  const { execSync } = require('child_process');
  try {
    execSync('cd ../biz-buddy-ally-now && npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation succeeds');
    results.tests.push({ name: 'TypeScript Compilation', status: 'passed' });
    results.summary.passed++;
  } catch (error) {
    console.log('❌ TypeScript compilation failed');
    results.tests.push({ name: 'TypeScript Compilation', status: 'failed', error: 'TS errors' });
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 5: Build Process
  console.log('\n📍 Test 5: Build Process');
  try {
    execSync('cd ../biz-buddy-ally-now && npm run build', { stdio: 'pipe' });
    console.log('✅ Build succeeds');
    results.tests.push({ name: 'Build Process', status: 'passed' });
    results.summary.passed++;
  } catch (error) {
    console.log('❌ Build failed');
    results.tests.push({ name: 'Build Process', status: 'failed' });
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 6: Unit Tests
  console.log('\n📍 Test 6: Unit Tests');
  try {
    const testOutput = execSync('cd ../biz-buddy-ally-now && npm test 2>&1', { encoding: 'utf-8' });
    const match = testOutput.match(/Tests\s+(\d+)\s+passed/);
    if (match) {
      console.log(`✅ Unit tests pass (${match[1]} tests)`);
      results.tests.push({ name: 'Unit Tests', status: 'passed', details: `${match[1]} tests` });
      results.summary.passed++;
    } else {
      console.log('❌ Unit tests failed');
      results.tests.push({ name: 'Unit Tests', status: 'failed' });
      results.summary.failed++;
    }
  } catch (error) {
    console.log('❌ Unit tests failed');
    results.tests.push({ name: 'Unit Tests', status: 'failed' });
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 7: No Critical Errors
  console.log('\n📍 Test 7: No Critical Errors');
  const criticalErrors = errors.filter(e => 
    !e.includes('WebSocket') && 
    !e.includes('X-Frame-Options') &&
    !e.includes('406') &&
    !e.includes('Content Security Policy') &&
    !e.includes('CSP')
  );
  
  if (criticalErrors.length === 0) {
    console.log('✅ No critical errors');
    results.tests.push({ name: 'No Critical Errors', status: 'passed' });
    results.summary.passed++;
  } else {
    console.log(`❌ Found ${criticalErrors.length} critical errors`);
    results.tests.push({ name: 'No Critical Errors', status: 'failed', errors: criticalErrors });
    results.summary.failed++;
  }
  results.summary.total++;

  // Take final screenshot
  await page.screenshot({ path: 'comprehensive-test-final.png', fullPage: true });

  // Close browser
  await browser.close();

  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);
  
  // Save results
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📁 Results saved to test-results.json');
  
  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

runComprehensiveTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});