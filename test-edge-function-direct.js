const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing edge function directly...\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('[Page Error]', error.message);
  });

  // Navigate to the app
  await page.goto('https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com/', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for auth to load
  await page.waitForTimeout(2000);

  // Execute edge function call directly
  const result = await page.evaluate(async () => {
    try {
      const response = await fetch('https://raenkewzlvrdqufwxjpl.supabase.co/functions/v1/check-pending-migrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-raenkewzlvrdqufwxjpl-auth-token.0')}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        },
        body: JSON.stringify({ requestId: 'direct-test-' + Date.now() })
      });

      const data = await response.text();
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
        parsedBody: (() => {
          try {
            return JSON.parse(data);
          } catch (e) {
            return null;
          }
        })()
      };
    } catch (error) {
      return {
        error: error.message,
        stack: error.stack
      };
    }
  });

  console.log('\n📊 Edge Function Response:');
  console.log(JSON.stringify(result, null, 2));

  await page.waitForTimeout(2000);
  await browser.close();
  
  console.log('\n✅ Test complete!');
})();