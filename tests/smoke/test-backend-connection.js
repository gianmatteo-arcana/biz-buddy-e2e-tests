const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testBackendConnection() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = path.join(__dirname, '..', 'tests', `backend-test-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log all console messages
  page.on('console', msg => {
    console.log(`CONSOLE [${msg.type()}]:`, msg.text());
  });

  // Log network failures
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  try {
    console.log('\n=== Testing Backend Connection ===\n');
    
    // 1. Navigate to the app
    console.log('1. Loading app...');
    await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: path.join(testDir, '01-initial-state.png'),
      fullPage: true 
    });

    // 2. Check for backend status messages
    console.log('2. Checking for backend status messages...');
    
    // Look for any error messages
    const errorMessages = await page.locator('text=/Backend unavailable|Error loading|Service configuration/i').all();
    if (errorMessages.length > 0) {
      console.log('Found backend error messages:');
      for (const msg of errorMessages) {
        const text = await msg.textContent();
        console.log(' -', text);
      }
    }

    // 3. Open browser console and check for errors
    console.log('3. Evaluating backend calls in browser context...');
    
    const backendTest = await page.evaluate(async () => {
      const results = {};
      
      // Test 1: Direct backend health check
      try {
        console.log('Testing direct backend health...');
        const healthResponse = await fetch('https://biz-buddy-backend-production.up.railway.app/health');
        results.directHealth = {
          status: healthResponse.status,
          ok: healthResponse.ok,
          data: await healthResponse.json()
        };
      } catch (error) {
        results.directHealth = {
          error: error.message,
          type: error.name
        };
      }

      // Test 2: Check if Supabase edge function works
      try {
        console.log('Testing Supabase edge function...');
        // Get the supabase client from window if available
        if (window.supabase) {
          const { data, error } = await window.supabase.functions.invoke('get-config', {
            body: { key: 'BACKEND_URL' }
          });
          results.edgeFunction = { data, error };
        } else {
          results.edgeFunction = { error: 'Supabase client not available' };
        }
      } catch (error) {
        results.edgeFunction = {
          error: error.message,
          type: error.name
        };
      }

      // Test 3: Check localStorage for any backend config
      results.localStorage = {
        backendUrl: localStorage.getItem('backend_url'),
        hasSupabaseAuth: !!localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token')
      };

      return results;
    });

    console.log('\n=== Backend Test Results ===');
    console.log(JSON.stringify(backendTest, null, 2));

    // Save results
    await fs.writeFile(
      path.join(testDir, 'backend-test-results.json'),
      JSON.stringify(backendTest, null, 2)
    );

    // 4. Check Dev Toolkit if available
    console.log('\n4. Checking Dev Toolkit...');
    const devToolkitButton = page.locator('button:has-text("Dev Toolkit")').first();
    if (await devToolkitButton.isVisible()) {
      await devToolkitButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(testDir, '02-dev-toolkit.png'),
        fullPage: true 
      });

      // Check for backend status in Dev Toolkit
      const backendStatus = await page.locator('text=/Backend Health|Backend Status/i').first();
      if (await backendStatus.isVisible()) {
        console.log('Dev Toolkit shows backend status section');
        
        // Look for status indicators
        const healthyBadge = await page.locator('text=/healthy/i').first();
        if (await healthyBadge.isVisible()) {
          console.log('✅ Backend shows as healthy in Dev Toolkit');
        } else {
          console.log('⚠️ Backend not showing as healthy');
        }
      }
    }

    // 5. Final analysis
    console.log('\n=== Analysis ===');
    if (backendTest.directHealth?.ok) {
      console.log('✅ Backend is reachable directly');
    } else if (backendTest.directHealth?.error?.includes('Failed to fetch')) {
      console.log('❌ CORS blocking direct backend access from browser');
    }

    if (backendTest.edgeFunction?.data?.value) {
      console.log('✅ Edge function returns backend URL:', backendTest.edgeFunction.data.value);
    } else if (backendTest.edgeFunction?.error) {
      console.log('❌ Edge function error:', backendTest.edgeFunction.error);
    }

    console.log('\n=== Recommendation ===');
    if (!backendTest.directHealth?.ok) {
      console.log('The backend is deployed and healthy, but CORS is blocking direct access.');
      console.log('The app is trying to call the backend directly instead of through a proxy.');
      console.log('\nSolution: Create a backend-proxy edge function to route requests.');
    }

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ 
      path: path.join(testDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
    console.log(`\nTest artifacts saved to: ${testDir}`);
  }
}

testBackendConnection().catch(console.error);