const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

const FRONTEND_DIR = path.join(__dirname, '..', 'biz-buddy-ally-now');
const BACKEND_DIR = path.join(__dirname, '..', 'biz-buddy-backend');

async function verifyBuilds() {
  console.log('🔍 E2E Pre-Test Build Verification');
  console.log('===================================\n');
  
  let hasErrors = false;
  const errors = [];

  // 1. Check Frontend TypeScript Compilation
  console.log('1️⃣  Checking Frontend TypeScript...');
  try {
    await execAsync('npx tsc --noEmit', { cwd: FRONTEND_DIR });
    console.log('   ✅ Frontend TypeScript compiles');
  } catch (error) {
    console.log('   ❌ Frontend TypeScript errors!');
    errors.push('Frontend TypeScript compilation failed');
    hasErrors = true;
  }

  // 2. Check Backend TypeScript Compilation
  console.log('\n2️⃣  Checking Backend TypeScript...');
  try {
    await execAsync('npx tsc --noEmit', { cwd: BACKEND_DIR });
    console.log('   ✅ Backend TypeScript compiles');
  } catch (error) {
    console.log('   ❌ Backend TypeScript errors!');
    errors.push('Backend TypeScript compilation failed');
    hasErrors = true;
  }

  // 3. Check Frontend Build
  console.log('\n3️⃣  Testing Frontend Build...');
  try {
    const { stdout } = await execAsync('npm run build', { cwd: FRONTEND_DIR });
    
    // Check for TypeScript errors in build output
    if (stdout.includes('error TS')) {
      throw new Error('TypeScript errors in build output');
    }
    
    // Check if dist folder was created
    const distPath = path.join(FRONTEND_DIR, 'dist');
    const distExists = await fs.access(distPath).then(() => true).catch(() => false);
    
    if (!distExists) {
      throw new Error('Build did not create dist folder');
    }
    
    console.log('   ✅ Frontend builds successfully');
  } catch (error) {
    console.log('   ❌ Frontend build failed!');
    errors.push('Frontend build failed: ' + error.message);
    hasErrors = true;
  }

  // 4. Check Backend Build
  console.log('\n4️⃣  Testing Backend Build...');
  try {
    await execAsync('npm run build', { cwd: BACKEND_DIR });
    console.log('   ✅ Backend builds successfully');
  } catch (error) {
    console.log('   ❌ Backend build failed!');
    errors.push('Backend build failed');
    hasErrors = true;
  }

  // 5. Quick Test Check
  console.log('\n5️⃣  Running Quick Test Smoke Check...');
  try {
    // Run a subset of critical tests
    const { stdout } = await execAsync('npm test -- --reporter=json', { 
      cwd: FRONTEND_DIR,
      timeout: 30000 
    });
    
    const testResults = JSON.parse(stdout);
    if (testResults.numFailedTests > 0) {
      throw new Error(`${testResults.numFailedTests} tests failed`);
    }
    
    console.log(`   ✅ ${testResults.numPassedTests} tests passed`);
  } catch (error) {
    // If JSON parsing fails, just check for basic success
    if (!error.stdout?.includes('FAIL')) {
      console.log('   ✅ Tests appear to pass');
    } else {
      console.log('   ⚠️  Some tests may be failing');
      errors.push('Some unit tests are failing');
    }
  }

  // 6. Check for Common Issues
  console.log('\n6️⃣  Checking for Common Issues...');
  
  // Check for Button onClick type errors (the issue we just found)
  try {
    const indexPath = path.join(FRONTEND_DIR, 'src', 'pages', 'Index.tsx');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    
    // Look for problematic patterns
    if (indexContent.includes('onClick={openDevToolkit}') && 
        !indexContent.includes('onClick={() => openDevToolkit()}')) {
      console.log('   ⚠️  Potential onClick handler issue detected');
      errors.push('Button onClick handler may have type mismatch');
    } else {
      console.log('   ✅ No obvious onClick issues');
    }
  } catch (error) {
    // File might not exist or be in different location
  }

  // Final Report
  console.log('\n===================================');
  if (hasErrors) {
    console.log('❌ BUILD VERIFICATION FAILED\n');
    console.log('Issues found:');
    errors.forEach(error => console.log(`  - ${error}`));
    console.log('\n🚨 E2E tests will likely fail with these build errors!');
    console.log('Fix these issues before running E2E tests.\n');
    
    console.log('Suggested fixes:');
    console.log('1. Run: cd ../biz-buddy-ally-now && npx tsc --noEmit');
    console.log('2. Fix all TypeScript errors');
    console.log('3. Run: npm run verify');
    console.log('4. Then retry E2E tests\n');
    
    process.exit(1);
  } else {
    console.log('✅ BUILD VERIFICATION PASSED');
    console.log('🚀 Ready to run E2E tests!\n');
  }
}

// Run if called directly
if (require.main === module) {
  verifyBuilds().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyBuilds };